package pe.edu.upeu.orden.client;

import pe.edu.upeu.orden.client.dto.CatalogoProductoDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "qhalimenu-catalogo-ms", path = "/api/v1/productos")
public interface CatalogoClient {

    @GetMapping("/{id}")
    CatalogoProductoDto obtener(@PathVariable("id") Long id);
}
