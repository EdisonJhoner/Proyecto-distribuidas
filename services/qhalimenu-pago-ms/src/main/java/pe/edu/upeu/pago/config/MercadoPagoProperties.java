package pe.edu.upeu.pago.config;

import com.mercadopago.MercadoPagoConfig;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

@Getter
@Component
@RefreshScope
public class MercadoPagoProperties {

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
        if (!usarSimulacion()) {
            MercadoPagoConfig.setAccessToken(accessToken);
        }
    }

    public boolean usarSimulacion() {
        String token = accessToken == null ? "" : accessToken.trim();
        if (token.isEmpty()) {
            return true;
        }
        if (token.startsWith("APP_USR-")) {
            return false;
        }
        String placeholder = placeholderToken == null ? "" : placeholderToken.trim();
        return token.equals(placeholder);
    }
}
