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

    @Value("${mercadopago.simulation-base-url}")
    private String simulationBaseUrl;

    @Value("${mercadopago.simulation-id-prefix}")
    private String simulationIdPrefix;

    @PostConstruct
    public void configurarSdk() {
        if (usarSimulacion()) {
            log.warn("Mercado Pago: modo SIMULACIÓN (sin token). El checkout es local.");
        } else {
            // Mercado Pago emite credenciales de prueba y de producción con el prefijo
            // APP_USR-, por eso el entorno lo define el token que se copie del panel.
            // Este proyecto solo debe usar el token del selector "Prueba".
            MercadoPagoConfig.setAccessToken(accessToken);
            log.info("Mercado Pago: modo REAL · entorno configurado = {} · " +
                            "usa el token copiado del selector 'Prueba' (nunca de 'Producción')",
                    entorno);
        }
    }

    public boolean usarSimulacion() {
        String token = accessToken == null ? "" : accessToken.trim();
        if (token.isEmpty()) {
            return true;
        }
        String placeholder = placeholderToken == null ? "" : placeholderToken.trim();
        if (token.equalsIgnoreCase(placeholder)
                || token.toUpperCase().contains("YOUR-ACCESS-TOKEN")
                || token.toUpperCase().contains("YOUR_ACCESS_TOKEN")) {
            return true;
        }
        // Cualquier token real (incluidos los de prueba APP_USR-) usa la API de MP.
        return false;
    }
}
