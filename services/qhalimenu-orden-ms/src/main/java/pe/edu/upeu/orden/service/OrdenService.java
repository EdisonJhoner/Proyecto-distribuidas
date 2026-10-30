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
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrdenService {

    public static final String ESTADO_PENDIENTE_PAGO = "PENDIENTE_PAGO";
    public static final String ESTADO_PAGADA = "PAGADA";
    public static final String ESTADO_CANCELADA = "CANCELADA";

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
    public OrdenResponse obtener(Long id) {
        Orden orden = buscarOFallar(id);
        validarPropiedadOrden(orden);
        return ordenMapper.toResponse(orden);
    }

    @Transactional
    public OrdenResponse crear(OrdenRequest request, String idCliente) {
        if (idCliente == null || idCliente.isBlank()) {
            throw new NegocioException("El token no contiene el subject del usuario");
        }
        // Try to validate client if it's numeric, otherwise skip for Keycloak sub
        try {
            Long clienteId = Long.parseLong(idCliente);
            clienteResiliente.validarCliente(clienteId);
        } catch (NumberFormatException ignored) {
            // Using Keycloak sub (UUID) - skip numeric validation
        }

        Orden orden = Orden.builder()
                .idCliente(idCliente)
                .fechaCreacion(LocalDateTime.now())
                .estado(ESTADO_PENDIENTE_PAGO)
                .tipoComprobante(request.getTipoComprobante())
                .metodoPago(request.getMetodoPago())
                .momentoPago(request.getMomentoPago())
                .total(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (OrdenDetalleRequest detalleRequest : request.getDetalles()) {
            CatalogoProductoDto producto = catalogoResiliente.obtenerProducto(detalleRequest.getIdProducto());
            OrdenDetalle detalle = OrdenDetalle.builder()
                    .orden(orden)
                    .idProducto(producto.id())
                    .cantidad(detalleRequest.getCantidad())
                    .precioUnitario(producto.precio())
                    .build();
            orden.getDetalles().add(detalle);
            total = total.add(producto.precio()
                    .multiply(BigDecimal.valueOf(detalleRequest.getCantidad())));
        }
        orden.setTotal(total);
        Orden guardada = ordenRepository.save(orden);
        ordenEventoPublisher.publicarOrdenCreada(guardada);
        return ordenMapper.toResponse(guardada);
    }

    @Transactional
    public void aplicarResultadoPago(PagoValidadoEvento evento) {
        ordenRepository.findById(evento.ordenId()).ifPresentOrElse(orden -> {
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
                log.info("Orden {} ya estǭ en estado {}; evento '{}' ignorado (idempotente)",
                        orden.getId(), orden.getEstado(), evento.tipo());
                return;
            }
            orden.setEstado(nuevoEstado);
            ordenRepository.save(orden);
            log.info("Orden {} actualizada a estado {} por evento '{}'",
                    orden.getId(), nuevoEstado, evento.tipo());
        }, () -> log.warn("No existe la orden {} referenciada por el evento '{}'",
                evento.ordenId(), evento.tipo()));
    }

    private Orden buscarOFallar(Long id) {
        return ordenRepository.findByIdConDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: " + id));
    }

    private void validarPropiedadOrden(Orden orden) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities().contains(
                new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            return;
        }
        String idCliente = currentUserProvider.getIdClienteString();
        if (idCliente != null && idCliente.equals(orden.getIdCliente())) {
            return;
        }
        throw new AccesoDenegadoException("No tiene permisos para consultar esta orden");
    }
}
