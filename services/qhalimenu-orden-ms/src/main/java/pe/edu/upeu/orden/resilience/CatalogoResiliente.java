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

    public boolean descontarStock(Long idProducto, Integer cantidad) {
        return Boolean.TRUE.equals(circuitBreakerFactory.create("catalogo").run(
                () -> {
                    catalogoClient.descontarStock(idProducto, cantidad);
                    return true;
                },
                throwable -> {
                    log.warn("No se pudo descontar stock del producto {}: {}",
                            idProducto, throwable.getMessage());
                    return false;
                }));
    }

    public void restaurarStock(Long idProducto, Integer cantidad) {
        circuitBreakerFactory.create("catalogo").run(
                () -> {
                    catalogoClient.restaurarStock(idProducto, cantidad);
                    return true;
                },
                throwable -> {
                    log.warn("No se pudo restaurar stock del producto {}: {}",
                            idProducto, throwable.getMessage());
                    return false;
                });
    }

    private CatalogoProductoDto consultarCatalogo(Long idProducto) {
        try {
            return catalogoClient.obtener(idProducto);
        } catch (FeignException.NotFound ex) {
            return null;
        }
    }
}
