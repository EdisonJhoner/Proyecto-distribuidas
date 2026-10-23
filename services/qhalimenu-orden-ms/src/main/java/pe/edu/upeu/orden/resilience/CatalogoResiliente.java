package pe.edu.upeu.orden.resilience;

import pe.edu.upeu.orden.client.CatalogoClient;
import pe.edu.upeu.orden.client.dto.CatalogoProductoDto;
import pe.edu.upeu.orden.exception.ProductoNoEncontradoException;
import pe.edu.upeu.orden.exception.ServicioNoDisponibleException;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogoResiliente {

    private final CatalogoClient catalogoClient;
    private final CircuitBreakerFactory<?, ?> circuitBreakerFactory;

    public CatalogoProductoDto obtenerProducto(Long idProducto) {
        CatalogoProductoDto producto = circuitBreakerFactory.create("catalogo").run(
                () -> consultarCatalogo(idProducto),
                throwable -> {
                    log.warn("Catálogo no disponible al consultar producto {}: {}",
                            idProducto, throwable.getMessage());
                    throw new ServicioNoDisponibleException(
                            "No se pudo validar el producto " + idProducto
                                    + " porque el servicio de catálogo no está disponible. Intente nuevamente.", throwable);
                });

        if (producto == null) {
            throw new ProductoNoEncontradoException("El producto " + idProducto + " no existe en el catálogo");
        }
        if (Boolean.FALSE.equals(producto.activo())) {
            throw new ProductoNoEncontradoException("El producto " + idProducto + " no está activo");
        }
        return producto;
    }

    private CatalogoProductoDto consultarCatalogo(Long idProducto) {
        try {
            return catalogoClient.obtener(idProducto);
        } catch (FeignException.NotFound ex) {
            return null;
        }
    }
}
