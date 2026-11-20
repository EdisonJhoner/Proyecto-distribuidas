package pe.edu.upeu.orden.client;

import pe.edu.upeu.orden.client.dto.CatalogoProductoDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "qhalimenu-catalogo-ms", path = "/api/v1/productos")
public interface CatalogoClient {

    @GetMapping("/{id}")
    CatalogoProductoDto obtener(@PathVariable("id") Long id);

    @PatchMapping("/{id}/descontar-stock")
    void descontarStock(@PathVariable("id") Long id, @RequestParam("cantidad") Integer cantidad);

    @PatchMapping("/{id}/restaurar-stock")
    void restaurarStock(@PathVariable("id") Long id, @RequestParam("cantidad") Integer cantidad);
}
