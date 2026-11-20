package pe.edu.upeu.orden.service;

import pe.edu.upeu.orden.client.dto.CatalogoProductoDto;
import pe.edu.upeu.orden.dto.OrdenDetalleRequest;
import pe.edu.upeu.orden.dto.OrdenRequest;
import pe.edu.upeu.orden.dto.OrdenResponse;
import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.entity.OrdenDetalle;
import pe.edu.upeu.orden.event.OrdenEventoPublisher;
import pe.edu.upeu.orden.event.PagoValidadoEvento;
import pe.edu.upeu.orden.exception.AccesoDenegadoException;
import pe.edu.upeu.orden.exception.NegocioException;
import pe.edu.upeu.orden.exception.ResourceNotFoundException;
import pe.edu.upeu.orden.mapper.OrdenMapper;
import pe.edu.upeu.orden.repository.OrdenRepository;
import pe.edu.upeu.orden.resilience.CatalogoResiliente;
import pe.edu.upeu.orden.resilience.ClienteResiliente;
import pe.edu.upeu.orden.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrdenService {

    public static final String ESTADO_PENDIENTE_PAGO = "PENDIENTE_PAGO";
    public static final String ESTADO_PAGADA = "PAGADA";
    public static final String ESTADO_ENTREGADA = "ENTREGADA";
    public static final String ESTADO_CANCELADA = "CANCELADA";

    private static final String ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final OrdenRepository ordenRepository;
    private final OrdenMapper ordenMapper;
    private final CatalogoResiliente catalogoResiliente;
    private final ClienteResiliente clienteResiliente;
    private final CurrentUserProvider currentUserProvider;
    private final OrdenEventoPublisher ordenEventoPublisher;

    @Transactional(readOnly = true)
    public List<OrdenResponse> listar() {
        return ordenRepository.findAllConDetalles().stream()
                .map(ordenMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrdenResponse> listarPorCliente(String idCliente) {
        if (idCliente == null || idCliente.isBlank()) {
            throw new NegocioException("El token no contiene el subject del usuario");
        }
        return ordenRepository.findByIdClienteConDetalles(idCliente).stream()
                .map(ordenMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrdenResponse> listarPendientesRecojo() {
        return ordenRepository.findByEstadoConDetalles(ESTADO_PAGADA).stream()
                .map(ordenMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrdenResponse obtener(Long id) {
        Orden orden = buscarOFallar(id);
        validarPropiedadOrden(orden);
        return ordenMapper.toResponse(orden);
    }

    @Transactional(readOnly = true)
    public OrdenResponse obtenerPorCodigo(String codigo) {
        return ordenMapper.toResponse(buscarPorCodigoOFallar(codigo));
    }

    @Transactional
    public OrdenResponse crear(OrdenRequest request, String idCliente) {
        if (idCliente == null || idCliente.isBlank()) {
            throw new NegocioException("El token no contiene el subject del usuario");
        }
        try {
            Long clienteId = Long.parseLong(idCliente);
            clienteResiliente.validarCliente(clienteId);
        } catch (NumberFormatException ignored) {
            // Using Keycloak sub (UUID) - skip numeric validation
        }

        String nombreCliente = request.getNombreCliente() == null || request.getNombreCliente().isBlank()
                ? currentUserProvider.getNombre()
                : request.getNombreCliente().trim();

        Orden orden = Orden.builder()
                .idCliente(idCliente)
                .fechaCreacion(LocalDateTime.now())
                .estado(ESTADO_PENDIENTE_PAGO)
                .tipoComprobante(request.getTipoComprobante())
                .metodoPago(request.getMetodoPago())
                .momentoPago(request.getMomentoPago())
                .nombreCliente(nombreCliente)
                .total(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        List<OrdenDetalle> reservados = new ArrayList<>();
        try {
            for (OrdenDetalleRequest detalleRequest : request.getDetalles()) {
                CatalogoProductoDto producto = catalogoResiliente.obtenerProducto(detalleRequest.getIdProducto());
                if (!catalogoResiliente.descontarStock(detalleRequest.getIdProducto(), detalleRequest.getCantidad())) {
                    throw new NegocioException("Stock insuficiente para el producto: " + detalleRequest.getIdProducto());
                }
                OrdenDetalle detalle = OrdenDetalle.builder()
                        .orden(orden)
                        .idProducto(producto.id())
                        .nombreProducto(producto.nombre())
                        .cantidad(detalleRequest.getCantidad())
                        .precioUnitario(producto.precio())
                        .build();
                orden.getDetalles().add(detalle);
                reservados.add(detalle);
                total = total.add(producto.precio()
                        .multiply(BigDecimal.valueOf(detalleRequest.getCantidad())));
            }
        } catch (RuntimeException ex) {
            restaurarStock(reservados);
            throw ex;
        }
        orden.setTotal(total);
        Orden guardada = ordenRepository.save(orden);
        ordenEventoPublisher.publicarOrdenCreada(guardada);
        return ordenMapper.toResponse(guardada);
    }

    @Transactional
    public void aplicarResultadoPago(PagoValidadoEvento evento) {
        ordenRepository.findByIdConDetalles(evento.ordenId()).ifPresentOrElse(orden -> {
            String nuevoEstado = switch (evento.tipo()) {
                case PagoValidadoEvento.TIPO_VALIDADO -> ESTADO_PAGADA;
                case PagoValidadoEvento.TIPO_FALLIDO -> ESTADO_CANCELADA;
                default -> null;
            };
            if (nuevoEstado == null) {
                log.warn("Evento de pago con tipo desconocido '{}' para orden {}; se ignora",
                        evento.tipo(), evento.ordenId());
                return;
            }
            if (!ESTADO_PENDIENTE_PAGO.equals(orden.getEstado())) {
                log.info("Orden {} ya está en estado {}; evento '{}' ignorado (idempotente)",
                        orden.getId(), orden.getEstado(), evento.tipo());
                return;
            }
            if (ESTADO_CANCELADA.equals(nuevoEstado)) {
                restaurarStock(orden.getDetalles());
            }
            if (ESTADO_PAGADA.equals(nuevoEstado)) {
                orden.setFechaPago(LocalDateTime.now());
                if (orden.getCodigoRecojo() == null || orden.getCodigoRecojo().isBlank()) {
                    orden.setCodigoRecojo(generarCodigoRecojo());
                }
            }
            orden.setEstado(nuevoEstado);
            ordenRepository.save(orden);
            log.info("Orden {} actualizada a estado {} por evento '{}'",
                    orden.getId(), nuevoEstado, evento.tipo());
        }, () -> log.warn("No existe la orden {} referenciada por el evento '{}'",
                evento.ordenId(), evento.tipo()));
    }

    @Transactional
    public OrdenResponse entregarPorCodigo(String codigo) {
        Orden orden = buscarPorCodigoOFallar(codigo);
        if (ESTADO_ENTREGADA.equals(orden.getEstado())) {
            return ordenMapper.toResponse(orden);
        }
        if (!ESTADO_PAGADA.equals(orden.getEstado())) {
            throw new NegocioException("La orden " + orden.getId() + " no está lista para entregar (estado "
                    + orden.getEstado() + ")");
        }
        orden.setEstado(ESTADO_ENTREGADA);
        orden.setFechaEntrega(LocalDateTime.now());
        Orden guardada = ordenRepository.save(orden);
        log.info("Orden {} entregada con código {}", guardada.getId(), guardada.getCodigoRecojo());
        return ordenMapper.toResponse(guardada);
    }

    @Transactional
    public OrdenResponse cancelar(Long id) {
        Orden orden = buscarOFallar(id);
        if (ESTADO_CANCELADA.equals(orden.getEstado())) {
            return ordenMapper.toResponse(orden);
        }
        if (ESTADO_ENTREGADA.equals(orden.getEstado())) {
            throw new NegocioException("No se puede cancelar una orden ya entregada");
        }
        if (!ESTADO_PAGADA.equals(orden.getEstado()) && !ESTADO_PENDIENTE_PAGO.equals(orden.getEstado())) {
            throw new NegocioException("La orden " + id + " no se puede cancelar desde el estado " + orden.getEstado());
        }
        restaurarStock(orden.getDetalles());
        orden.setEstado(ESTADO_CANCELADA);
        Orden guardada = ordenRepository.save(orden);
        log.info("Orden {} cancelada; se restauró el stock", guardada.getId());
        return ordenMapper.toResponse(guardada);
    }

    @Transactional
    public void eliminar(Long id) {
        Orden orden = buscarOFallar(id);
        if (ESTADO_PENDIENTE_PAGO.equals(orden.getEstado()) || ESTADO_PAGADA.equals(orden.getEstado())) {
            restaurarStock(orden.getDetalles());
        }
        ordenRepository.delete(orden);
        log.info("Orden {} eliminada por admin (estado previo {})", id, orden.getEstado());
    }

    @Transactional
    public int cancelarNoRecogidas() {
        List<Orden> pendientes = ordenRepository.findByEstadoConDetalles(ESTADO_PAGADA);
        if (pendientes.isEmpty()) {
            return 0;
        }
        for (Orden orden : pendientes) {
            restaurarStock(orden.getDetalles());
            orden.setEstado(ESTADO_CANCELADA);
        }
        ordenRepository.saveAll(pendientes);
        log.warn("Cierre de día: {} orden(es) PAGADA no recogidas canceladas (stock restaurado)", pendientes.size());
        return pendientes.size();
    }

    private void restaurarStock(List<OrdenDetalle> detalles) {
        if (detalles == null) {
            return;
        }
        for (OrdenDetalle detalle : detalles) {
            catalogoResiliente.restaurarStock(detalle.getIdProducto(), detalle.getCantidad());
        }
    }

    private String generarCodigoRecojo() {
        for (int intento = 0; intento < 12; intento++) {
            StringBuilder codigo = new StringBuilder("QM");
            ThreadLocalRandom random = ThreadLocalRandom.current();
            for (int i = 0; i < 6; i++) {
                codigo.append(ALFABETO_CODIGO.charAt(random.nextInt(ALFABETO_CODIGO.length())));
            }
            String candidato = codigo.toString();
            if (!ordenRepository.existsByCodigoRecojo(candidato)) {
                return candidato;
            }
        }
        throw new NegocioException("No se pudo generar un código de recojo único");
    }

    private Orden buscarOFallar(Long id) {
        return ordenRepository.findByIdConDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: " + id));
    }

    private Orden buscarPorCodigoOFallar(String codigo) {
        String normalizado = codigo == null ? "" : codigo.trim().toUpperCase();
        if (normalizado.isBlank()) {
            throw new NegocioException("El código de recojo es obligatorio");
        }
        return ordenRepository.findByCodigoRecojoIgnoreCase(normalizado)
                .orElseThrow(() -> new ResourceNotFoundException("No hay una orden con el código: " + normalizado));
    }

    private Orden validarPropiedadOrden(Orden orden) {
        if (esStaff()) {
            return orden;
        }
        String idCliente = currentUserProvider.getIdClienteString();
        if (idCliente != null && idCliente.equals(orden.getIdCliente())) {
            return orden;
        }
        throw new AccesoDenegadoException("No tiene permisos para consultar esta orden");
    }

    private boolean esStaff() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))
                || authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_CAJA"));
    }
}
