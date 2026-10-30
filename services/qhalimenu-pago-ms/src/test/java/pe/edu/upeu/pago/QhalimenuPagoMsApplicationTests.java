package pe.edu.upeu.pago;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:pago;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost:0/jwks",
        "mercadopago.access-token=TEST-YOUR-ACCESS-TOKEN",
        "mercadopago.placeholder-token=TEST-YOUR-ACCESS-TOKEN",
        "mercadopago.currency-id=PEN",
        "mercadopago.success-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.failure-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.pending-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.notification-url=http://localhost:18080/api/v1/pagos/webhook",
        "mercadopago.simulation-base-url=http://localhost:18080/api/v1/pagos/simulacion",
        "mercadopago.simulation-id-prefix=SIM-"
})
class QhalimenuPagoMsApplicationTests {

    @Test
    void contextLoads() {
    }
}
