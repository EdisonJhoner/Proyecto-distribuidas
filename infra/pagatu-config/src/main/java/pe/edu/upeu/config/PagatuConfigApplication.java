package pe.edu.upeu.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.config.server.EnableConfigServer;

@SpringBootApplication
@EnableConfigServer
public class PagatuConfigApplication {

    public static void main(String[] args) {
        SpringApplication.run(PagatuConfigApplication.class, args);
    }
}
