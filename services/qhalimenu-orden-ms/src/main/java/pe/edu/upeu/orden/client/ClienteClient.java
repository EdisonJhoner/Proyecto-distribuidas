package pe.edu.upeu.orden.client;

import pe.edu.upeu.orden.client.dto.ClienteDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "qhalimenu-cliente-ms", path = "/api/v1/clientes")
public interface ClienteClient {

    @GetMapping("/{id}")
    ClienteDto obtener(@PathVariable("id") Long id);
}
