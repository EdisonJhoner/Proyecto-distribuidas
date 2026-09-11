package pe.edu.upeu.pago;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class QhalimenuPagoMsApplication {

    public static void main(String[] args) {
        SpringApplication.run(QhalimenuPagoMsApplication.class, args);
    }
}
