package pe.edu.upeu.pago.config;

import com.mercadopago.MercadoPagoConfig;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

@Slf4j
@Getter
@Component
@RefreshScope
public class MercadoPagoProperties {

    /** Solo informativo: el proyecto se entrega configurado para PRUEBA (sandbox). */
    @Value("${mercadopago.entorno:PRUEBA}")
    private String entorno;

    @Value("${mercadopago.access-token:}")
    private String accessToken;

    @Value("${mercadopago.placeholder-token}")
    private String placeholderToken;

    @Value("${mercadopago.currency-id}")
    private String currencyId;

    @Value("${mercadopago.success-url}")
    private String successUrl;

    @Value("${mercadopago.failure-url}")
    private String failureUrl;

    @Value("${mercadopago.pending-url}")
    private String pendingUrl;

    @Value("${mercadopago.notification-url}")
    private String notificationUrl;

    @PostConstruct
    public void configurarSdk() {
        // No se detiene la aplicación: el cobro en efectivo debe seguir funcionando.
        // El token se valida al crear una preferencia de Mercado Pago.
        try {
            validarToken();
        } catch (IllegalStateException e) {
            log.warn("Mercado Pago sin configurar: {}. El checkout real se habilitará al configurar el token.",
                    e.getMessage());
            return;
        }
        // Mercado Pago emite credenciales de prueba y de producción con el prefijo
        // APP_USR-, por eso el entorno lo define el token que se copie del panel.
        // Este proyecto solo debe usar el token del selector "Prueba".
        MercadoPagoConfig.setAccessToken(accessToken.trim());
        log.info("Mercado Pago: checkout REAL en entorno {} · token del selector 'Prueba' " +
                        "(nunca de 'Producción')",
                entorno);
    }

    /** El proyecto ya no simula pagos: sin token real no se genera ningún checkout. */
    public void validarToken() {
        String token = accessToken == null ? "" : accessToken.trim();
        String placeholder = placeholderToken == null ? "" : placeholderToken.trim();
        boolean incompleto = token.isEmpty()
                || token.equalsIgnoreCase(placeholder)
                || token.toUpperCase().contains("YOUR-ACCESS-TOKEN")
                || token.toUpperCase().contains("YOUR_ACCESS_TOKEN")
                || token.equalsIgnoreCase("TEST-TU-TOKEN-DE-PRUEBA");
        if (incompleto) {
            throw new IllegalStateException(
                    "Mercado Pago requiere un Access Token real del entorno Prueba. " +
                    "Configura MERCADOPAGO_ACCESS_TOKEN y reinicia pago-ms. " +
                    "No se usa modo simulación.");
        }
    }
}
