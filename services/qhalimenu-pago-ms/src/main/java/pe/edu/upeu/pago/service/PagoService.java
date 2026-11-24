package pe.edu.upeu.pago.service;

import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePayerRequest;
import com.mercadopago.client.preference.PreferencePaymentMethodsRequest;
import com.mercadopago.client.preference.PreferencePaymentTypeRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.preference.Preference;
import pe.edu.upeu.pago.config.MercadoPagoProperties;
import pe.edu.upeu.pago.dto.PagoRequest;
import pe.edu.upeu.pago.dto.PagoResponse;
import pe.edu.upeu.pago.entity.Pago;
import pe.edu.upeu.pago.event.OrdenCreadaEvento;
import pe.edu.upeu.pago.event.PagoEventoPublisher;
import pe.edu.upeu.pago.exception.ResourceNotFoundException;
import pe.edu.upeu.pago.mapper.PagoMapper;
import pe.edu.upeu.pago.repository.PagoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PagoService {

    public static final String METODO_EFECTIVO = "EFECTIVO";
    public static final String METODO_MERCADOPAGO = "MERCADOPAGO";

    private final PagoRepository pagoRepository;
    private final PagoMapper pagoMapper;
    private final MercadoPagoProperties mercadoPagoProperties;
    private final PagoEventoPublisher pagoEventoPublisher;

    @Transactional(readOnly = true)
    public List<PagoResponse> listar() {
        return pagoRepository.findAll().stream()
                .map(pagoMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagoResponse obtener(Long id) {
        return pagoMapper.toResponse(buscarOFallar(id));
    }

    @Transactional(readOnly = true)
    public List<PagoResponse> listarPorOrden(Long ordenId) {
        return pagoRepository.findByOrdenId(ordenId).stream()
                .map(pagoMapper::toResponse)
                .toList();
    }

    @Transactional
    public Optional<Pago> registrarPagoDesdeOrden(OrdenCreadaEvento evento) {
        Optional<Pago> existente = pagoRepository.findFirstByOrdenId(evento.ordenId());
        if (existente.isPresent()) {
            log.info("Ya existe un pago para la orden {}; evento '{}' ignorado (idempotente)",
                    evento.ordenId(), evento.tipo());
            return Optional.empty();
        }
        String metodoPago = evento.metodoPago() == null || evento.metodoPago().isBlank()
                ? "MERCADOPAGO"
                : evento.metodoPago();
        // El preferenceId lo asigna Mercado Pago al crear la preferencia en el checkout real.
        Pago pago = Pago.builder()
                .ordenId(evento.ordenId())
                .monto(evento.total())
                .metodoPago(metodoPago)
                .estadoPago("PENDIENTE")
                .fechaPago(LocalDateTime.now())
                .build();
        Pago guardado = pagoRepository.save(pago);
        publicarEventoSiCambioDeEstado(guardado, "PENDIENTE");
        if (esEfectivo(metodoPago)) {
            log.info("Pago {} en EFECTIVO registrado PENDIENTE para la orden {}; " +
                    "la orden seguirá en PENDIENTE_PAGO hasta que se confirme el cobro",
                    guardado.getId(), guardado.getOrdenId());
        } else {
            log.info("Pago {} registrado PENDIENTE para la orden {}; se espera confirmación de Mercado Pago",
                    guardado.getId(), guardado.getOrdenId());
        }
        return Optional.of(guardado);
    }

    @Transactional
    public PagoResponse crearPreferencia(PagoRequest request) {
        try {
            String metodoPago = request.getMetodoPago() == null || request.getMetodoPago().isBlank()
                    ? "MERCADOPAGO"
                    : request.getMetodoPago();

            // Idempotencia por orden: el pago pudo haber sido creado por el evento 'orden.creada'.
            Pago existente = request.getOrdenId() == null
                    ? null
                    : pagoRepository.findFirstByOrdenId(request.getOrdenId()).orElse(null);

            if (existente != null && "PROCESADO".equals(existente.getEstadoPago())) {
                log.info("El pago {} de la orden {} ya está PROCESADO; se reutiliza sin crear otro",
                        existente.getId(), existente.getOrdenId());
                return pagoMapper.toResponse(existente);
            }

            if (esEfectivo(metodoPago)) {
                log.info("La orden {} usa pago en EFECTIVO; no se genera preferencia de pasarela",
                        request.getOrdenId());
                Pago pago = existente != null ? existente : Pago.builder().build();
                pago.setOrdenId(request.getOrdenId());
                if (request.getMonto() != null) {
                    pago.setMonto(request.getMonto());
                }
                pago.setMetodoPago(metodoPago);
                pago.setEstadoPago("PENDIENTE");
                pago.setFechaPago(LocalDateTime.now());
                return pagoMapper.toResponse(pagoRepository.save(pago));
            }

            mercadoPagoProperties.validarToken();
            Preference preference = crearPreferenceMercadoPago(request);
            if (preference == null
                    || preference.getInitPoint() == null || preference.getInitPoint().isBlank()) {
                throw new IllegalStateException(
                        "Mercado Pago no devolvió el checkout. Revisa el Access Token de Prueba.");
            }

            Pago pago = existente != null ? existente : Pago.builder().build();
            pago.setOrdenId(request.getOrdenId());
            if (request.getMonto() != null) {
                pago.setMonto(request.getMonto());
            }
            pago.setMetodoPago(metodoPago);
            pago.setEstadoPago("PENDIENTE");
            pago.setPreferenceId(preference.getId());
            pago.setFechaPago(LocalDateTime.now());
            return pagoMapper.toResponse(
                    pagoRepository.save(pago),
                    preference.getInitPoint(),
                    preference.getSandboxInitPoint());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("No se pudo crear la preferencia real de Mercado Pago: ", e);
            throw new IllegalStateException(
                    "No se pudo conectar con Mercado Pago. Verifica el Access Token de Prueba.", e);
        }
    }

    @Transactional
    public PagoResponse confirmarPago(Long id) {
        return confirmarEfectivo(buscarOFallar(id));
    }

    @Transactional
    public PagoResponse confirmarEfectivoPorOrden(Long ordenId) {
        Pago pago = pagoRepository.findFirstByOrdenId(ordenId)
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado para la orden: " + ordenId));
        return confirmarEfectivo(pago);
    }

    private PagoResponse confirmarEfectivo(Pago pago) {
        if (!esEfectivo(pago.getMetodoPago())) {
            throw new IllegalStateException(
                    "Solo se pueden confirmar manualmente los pagos en efectivo");
        }
        String estadoAnterior = pago.getEstadoPago();
        if ("PROCESADO".equals(estadoAnterior)) {
            return pagoMapper.toResponse(pago);
        }
        pago.setEstadoPago("PROCESADO");
        pago.setFechaPago(LocalDateTime.now());
        Pago guardado = pagoRepository.save(pago);
        publicarEventoSiCambioDeEstado(guardado, estadoAnterior);
        return pagoMapper.toResponse(guardado);
    }

    @Transactional
    public PagoResponse procesarFeedback(String preferenceId, String collectionStatus, String status) {
        Pago pago = pagoRepository.findByPreferenceId(preferenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado para preference: " + preferenceId));
        String estadoAnterior = pago.getEstadoPago();
        pago.setEstadoPago(mapearEstado(primerValor(collectionStatus, status)));
        pago.setFechaPago(LocalDateTime.now());
        Pago guardado = pagoRepository.save(pago);
        publicarEventoSiCambioDeEstado(guardado, estadoAnterior);
        return pagoMapper.toResponse(guardado);
    }

    @Transactional
    public void procesarWebhook(String preferenceId, String collectionStatus, String status) {
        if (preferenceId == null || preferenceId.isBlank()) {
            return;
        }
        pagoRepository.findByPreferenceId(preferenceId).ifPresent(pago -> {
            String estadoAnterior = pago.getEstadoPago();
            pago.setEstadoPago(mapearEstado(primerValor(collectionStatus, status)));
            pago.setFechaPago(LocalDateTime.now());
            Pago guardado = pagoRepository.save(pago);
            publicarEventoSiCambioDeEstado(guardado, estadoAnterior);
        });
    }

    private void publicarEventoSiCambioDeEstado(Pago pago, String estadoAnterior) {
        if (pago.getEstadoPago() == null || pago.getEstadoPago().equals(estadoAnterior)) {
            return;
        }
        switch (pago.getEstadoPago()) {
            case "PROCESADO" -> {
                log.info("Pago {} de la orden {} pasó de {} a PROCESADO; se publica pago.validado",
                        pago.getId(), pago.getOrdenId(), estadoAnterior);
                pagoEventoPublisher.publicarValidado(
                        pago.getOrdenId(), pago.getId(), pago.getPreferenceId(), pago.getMonto());
            }
            case "RECHAZADO" -> {
                log.info("Pago {} de la orden {} pasó de {} a RECHAZADO; se publica pago.fallido",
                        pago.getId(), pago.getOrdenId(), estadoAnterior);
                pagoEventoPublisher.publicarFallido(
                        pago.getOrdenId(), pago.getId(), pago.getPreferenceId(), pago.getMonto());
            }
            default -> log.debug("Pago {} quedó en estado {}; no se publica evento de SAGA",
                    pago.getId(), pago.getEstadoPago());
        }
    }

    private Preference crearPreferenceMercadoPago(PagoRequest request) {
        PreferenceItemRequest item = PreferenceItemRequest.builder()
                .title("Orden #" + request.getOrdenId())
                .quantity(1)
                .unitPrice(request.getMonto())
                .currencyId("PEN")
                .build();

        // El navegador vuelve al frontend: ahí se consulta el feedback y se muestra
        // la boleta con el estado real de la orden.
        PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                .success(mercadoPagoProperties.getSuccessUrl())
                .failure(mercadoPagoProperties.getFailureUrl())
                .pending(mercadoPagoProperties.getPendingUrl())
                .build();

        String emailComprador = request.getEmailComprador();
        if (emailComprador == null || emailComprador.isBlank()) {
            emailComprador = request.getEmail();
        }

        PreferenceRequest.PreferenceRequestBuilder preferenceBuilder = PreferenceRequest.builder()
                .items(List.of(item))
                .notificationUrl(mercadoPagoProperties.getNotificationUrl())
                .externalReference(String.valueOf(request.getOrdenId()))
                .payer(PreferencePayerRequest.builder()
                        .email(emailComprador)
                        .build());

        if (backUrls != null) {
            // Mercado Pago solo permite auto_return con URLs HTTPS públicas. En DEV las
            // URLs son http://localhost, así que el checkout muestra el enlace
            // "Volver al sitio" y el navegador regresa a /pago-retorno al pulsarlo.
            preferenceBuilder.backUrls(backUrls);
        }

        // QhaliMenu solo atiende tarjetas (crédito/débito) y Yape dentro de Mercado Pago.
        // Se excluyen el resto de tipos para que el checkout no ofrezca métodos ajenos.
        PreferencePaymentMethodsRequest paymentMethods = PreferencePaymentMethodsRequest.builder()
                .excludedPaymentTypes(List.of(
                        tipoExcluido("wallet"),
                        tipoExcluido("bank_transfer"),
                        tipoExcluido("atm"),
                        tipoExcluido("prepaid_card"),
                        tipoExcluido("ticket"),
                        tipoExcluido("digital_currency")))
                .build();
        preferenceBuilder.paymentMethods(paymentMethods);

        PreferenceRequest preferenceRequest = preferenceBuilder.build();

        PreferenceClient client = new PreferenceClient();
        try {
            return client.create(preferenceRequest);
        } catch (MPApiException e) {
            log.error("MercadoPago MPApiException statusCode={} content={}",
                    e.getApiResponse().getStatusCode(),
                    e.getApiResponse().getContent());
            return null;
        } catch (MPException e) {
            log.error("MercadoPago MPException: {}", e.getMessage(), e);
            return null;
        }
    }

    private PreferencePaymentTypeRequest tipoExcluido(String id) {
        return PreferencePaymentTypeRequest.builder()
                .id(id)
                .build();
    }

    private String mapearEstado(String estadoMercadoPago) {
        if (estadoMercadoPago == null) {
            return "PENDIENTE";
        }
        return switch (estadoMercadoPago.toLowerCase()) {
            case "approved" -> "PROCESADO";
            case "rejected", "cancelled", "failure" -> "RECHAZADO";
            default -> "PENDIENTE";
        };
    }

    private String primerValor(String primero, String segundo) {
        if (primero != null && !primero.isBlank()) {
            return primero;
        }
        return segundo;
    }

    private boolean esEfectivo(String metodoPago) {
        return metodoPago != null && METODO_EFECTIVO.equalsIgnoreCase(metodoPago.trim());
    }

    private Pago buscarOFallar(Long id) {
        return pagoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado: " + id));
    }
}
