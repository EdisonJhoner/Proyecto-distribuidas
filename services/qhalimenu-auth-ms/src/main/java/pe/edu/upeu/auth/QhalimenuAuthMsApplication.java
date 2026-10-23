package pe.edu.upeu.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class QhalimenuAuthMsApplication {

    public static void main(String[] args) {
        SpringApplication.run(QhalimenuAuthMsApplication.class, args);
    }
}
