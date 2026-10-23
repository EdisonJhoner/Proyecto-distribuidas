package pe.edu.upeu.orden.resilience;

import pe.edu.upeu.orden.client.CatalogoClient;
import pe.edu.upeu.orden.client.dto.CatalogoProductoDto;
import pe.edu.upeu.orden.exception.ProductoNoEncontradoException;
import pe.edu.upeu.orden.exception.ServicioNoDisponibleException;
import feign.FeignException;
import feign.Request;
import feign.Response;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CatalogoResilienteTest {

    private CatalogoClient catalogoClient;
    private CatalogoResiliente catalogoResiliente;

    @BeforeEach
    void setUp() {
        catalogoClient = mock(CatalogoClient.class);
        Resilience4JCircuitBreakerFactory factory =
                new Resilience4JCircuitBreakerFactory(CircuitBreakerRegistry.ofDefaults(),
                        TimeLimiterRegistry.ofDefaults(), null);
        factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
                .circuitBreakerConfig(CircuitBreakerConfig.custom()
                        .slidingWindowSize(2)
                        .minimumNumberOfCalls(2)
                        .failureRateThreshold(50)
                        .waitDurationInOpenState(Duration.ofSeconds(10))
                        .build())
                .timeLimiterConfig(TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(4))
                        .build())
                .build());
        catalogoResiliente = new CatalogoResiliente(catalogoClient, factory);
    }

    @Test
    void devuelveProductoCuandoCatalogResponde() {
        when(catalogoClient.obtener(10L))
                .thenReturn(new CatalogoProductoDto(10L, "Menú del día", new BigDecimal("8.50"), true));

        CatalogoProductoDto producto = catalogoResiliente.obtenerProducto(10L);

        assertEquals(10L, producto.id());
        assertEquals(new BigDecimal("8.50"), producto.precio());
    }

    @Test
    void productoInexistenteSeConvierteEnErrorDeNegocio() {
        when(catalogoClient.obtener(99L)).thenThrow(notFound());

        assertThrows(ProductoNoEncontradoException.class,
                () -> catalogoResiliente.obtenerProducto(99L));
    }

    @Test
    void productoInactivoSeRechaza() {
        when(catalogoClient.obtener(11L))
                .thenReturn(new CatalogoProductoDto(11L, "Jugo", new BigDecimal("3.00"), false));

        assertThrows(ProductoNoEncontradoException.class,
                () -> catalogoResiliente.obtenerProducto(11L));
    }

    @Test
    void falloDeComunicacionSeTraduceEnServicioNoDisponible() {
        when(catalogoClient.obtener(12L)).thenThrow(new RuntimeException("connection refused"));

        assertThrows(ServicioNoDisponibleException.class,
                () -> catalogoResiliente.obtenerProducto(12L));
    }

    @Test
    void elCircuitoSeAbreYDejaDeInvocarElCatalogo() {
        when(catalogoClient.obtener(13L)).thenThrow(new RuntimeException("connection refused"));

        assertThrows(ServicioNoDisponibleException.class,
                () -> catalogoResiliente.obtenerProducto(13L));
        assertThrows(ServicioNoDisponibleException.class,
                () -> catalogoResiliente.obtenerProducto(13L));

        assertThrows(ServicioNoDisponibleException.class,
                () -> catalogoResiliente.obtenerProducto(13L));
        verify(catalogoClient, times(2)).obtener(13L);
    }

    private FeignException notFound() {
        Response response = Response.builder()
                .status(404)
                .reason("Not Found")
                .request(Request.create(Request.HttpMethod.GET, "/api/v1/productos/99",
                        Map.of(), null, null, null))
                .build();
        return FeignException.errorStatus("CatalogoClient#obtener(Long)", response);
    }
}
