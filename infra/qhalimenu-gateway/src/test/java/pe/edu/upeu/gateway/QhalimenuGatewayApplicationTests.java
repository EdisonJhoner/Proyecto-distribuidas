package pe.edu.upeu.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.cloud.gateway.server.webmvc.routes[0].id=qhalimenu-catalogo-categorias",
        "spring.cloud.gateway.server.webmvc.routes[0].uri=http://localhost:8080",
        "spring.cloud.gateway.server.webmvc.routes[0].predicates[0]=Path=/api/v1/categorias/**"
})
class QhalimenuGatewayApplicationTests {

    @Test
    void contextLoads() {
    }
}
