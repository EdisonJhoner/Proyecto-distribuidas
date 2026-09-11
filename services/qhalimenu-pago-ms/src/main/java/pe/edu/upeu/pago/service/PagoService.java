package pe.edu.upeu.pago.service;

import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePayerRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.preference.Preference;
import pe.edu.upeu.pago.config.MercadoPagoProperties;
import pe.edu.upeu.pago.dto.PagoRequest;
import pe.edu.upeu.pago.dto.PagoResponse;
import pe.edu.upeu.pago.entity.Pago;
import pe.edu.upeu.pago.exception.ResourceNotFoundException;
import pe.edu.upeu.pago.mapper.PagoMapper;
import pe.edu.upeu.pago.repository.PagoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PagoService {

    private final PagoRepository pagoRepository;
    private final PagoMapper pagoMapper;
    private final MercadoPagoProperties mercadoPagoProperties;

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
    public PagoResponse crearPreferencia(PagoRequest request) {
        try {
            String metodoPago = request.getMetodoPago() == null || request.getMetodoPago().isBlank()
                    ? "MERCADOPAGO"
                    : request.getMetodoPago();

            if (mercadoPagoProperties.usarSimulacion()) {
                return guardarSimulacion(request, metodoPago);
            }

            Preference preference = crearPreferenceMercadoPago(request);
            if (preference == null) {
                log.warn("MercadoPago falló; se activa modo simulación para no interrumpir la compra");
                return guardarSimulacion(request, metodoPago);
            }

            Pago pago = Pago.builder()
                    .ordenId(request.getOrdenId())
                    .monto(request.getMonto())
                    .metodoPago(metodoPago)
                    .estadoPago("PENDIENTE")
                    .preferenceId(preference.getId())
                    .fechaPago(LocalDateTime.now())
                    .build();
            return pagoMapper.toResponse(
                    pagoRepository.save(pago),
                    preference.getInitPoint(),
                    preference.getSandboxInitPoint(),
                    false);
        } catch (Throwable t) {
            log.error("Error general en preferencia: ", t);
            try {
                org.springframework.transaction.interceptor.TransactionAspectSupport
                        .currentTransactionStatus()
                        .setRollbackOnly();
            } catch (Exception ignored) {
                // Sin transacción activa: se devuelve el DTO simulado.
            }
            return PagoResponse.builder()
                    .ordenId(request.getOrdenId())
                    .estadoPago("PENDIENTE")
                    .modoSimulacion(true)
                    .initPoint("https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=simulated_12345")
                    .sandboxInitPoint("https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=simulated_12345")
                    .preferenceId("simulated_12345")
                    .build();
        }
    }

    @Transactional
    public PagoResponse confirmarSimulacion(String preferenceId) {
        Pago pago = pagoRepository.findByPreferenceId(preferenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado para preference: " + preferenceId));
        pago.setEstadoPago("PROCESADO");
        pago.setFechaPago(LocalDateTime.now());
        String url = urlSimulacion(preferenceId);
        return pagoMapper.toResponse(pagoRepository.save(pago), url, url, true);
    }

    @Transactional
    public PagoResponse procesarFeedback(String preferenceId, String collectionStatus, String status) {
        Pago pago = pagoRepository.findByPreferenceId(preferenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado para preference: " + preferenceId));
        pago.setEstadoPago(mapearEstado(primerValor(collectionStatus, status)));
        pago.setFechaPago(LocalDateTime.now());
        return pagoMapper.toResponse(pagoRepository.save(pago));
    }

    @Transactional
    public void procesarWebhook(String preferenceId, String collectionStatus, String status) {
        if (preferenceId == null || preferenceId.isBlank()) {
            return;
        }
        pagoRepository.findByPreferenceId(preferenceId).ifPresent(pago -> {
            pago.setEstadoPago(mapearEstado(primerValor(collectionStatus, status)));
            pago.setFechaPago(LocalDateTime.now());
            pagoRepository.save(pago);
        });
    }

    private PagoResponse guardarSimulacion(PagoRequest request, String metodoPago) {
        String preferenceId = mercadoPagoProperties.getSimulationIdPrefix() + UUID.randomUUID();
        String url = urlSimulacion(preferenceId);
        Pago pago = Pago.builder()
                .ordenId(request.getOrdenId())
                .monto(request.getMonto())
                .metodoPago(metodoPago)
                .estadoPago("PENDIENTE")
                .preferenceId(preferenceId)
                .fechaPago(LocalDateTime.now())
                .build();
        return pagoMapper.toResponse(pagoRepository.save(pago), url, url, true);
    }

    private String urlSimulacion(String preferenceId) {
        String base = mercadoPagoProperties.getSimulationBaseUrl();
        if (base.endsWith("/")) {
            return base + preferenceId;
        }
        return base + "/" + preferenceId;
    }

    private Preference crearPreferenceMercadoPago(PagoRequest request) {
        PreferenceItemRequest item = PreferenceItemRequest.builder()
                .title("Orden #" + request.getOrdenId())
                .quantity(1)
                .unitPrice(request.getMonto())
                .currencyId("PEN")
                .build();

        PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                .success("https://www.google.com")
                .failure("https://www.google.com")
                .pending("https://www.google.com")
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
            preferenceBuilder.backUrls(backUrls);
            preferenceBuilder.autoReturn("approved");
        }

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

    private Pago buscarOFallar(Long id) {
        return pagoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado: " + id));
    }
}
