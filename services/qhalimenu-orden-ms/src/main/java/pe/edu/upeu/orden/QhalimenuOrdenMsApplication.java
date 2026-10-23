package pe.edu.upeu.orden;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class QhalimenuOrdenMsApplication {

    public static void main(String[] args) {
        SpringApplication.run(QhalimenuOrdenMsApplication.class, args);
    }
}
