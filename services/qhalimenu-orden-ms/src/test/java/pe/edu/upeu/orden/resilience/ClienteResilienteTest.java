package pe.edu.upeu.orden.resilience;

import pe.edu.upeu.orden.client.ClienteClient;
import pe.edu.upeu.orden.client.dto.ClienteDto;
import pe.edu.upeu.orden.exception.ClienteNoEncontradoException;
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

import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClienteResilienteTest {

    private ClienteClient clienteClient;
    private ClienteResiliente clienteResiliente;

    @BeforeEach
    void setUp() {
        clienteClient = mock(ClienteClient.class);
        Resilience4JCircuitBreakerFactory factory =
                new Resilience4JCircuitBreakerFactory(CircuitBreakerRegistry.ofDefaults(),
                        TimeLimiterRegistry.ofDefaults(), null);
        factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
                .circuitBreakerConfig(CircuitBreakerConfig.ofDefaults())
                .timeLimiterConfig(TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(4))
                        .build())
                .build());
        clienteResiliente = new ClienteResiliente(clienteClient, factory);
    }

    @Test
    void validaClienteExistente() {
        when(clienteClient.obtener(1L)).thenReturn(new ClienteDto(1L, "12345678", "Ana Perez"));

        ClienteDto cliente = clienteResiliente.validarCliente(1L);

        assertEquals("Ana Perez", cliente.nombres());
    }

    @Test
    void clienteInexistenteEsErrorDeNegocio() {
        when(clienteClient.obtener(99L)).thenThrow(notFound());

        assertThrows(ClienteNoEncontradoException.class,
                () -> clienteResiliente.validarCliente(99L));
    }

    @Test
    void falloDeComunicacionEsServicioNoDisponible() {
        when(clienteClient.obtener(2L)).thenThrow(new RuntimeException("timeout"));

        assertThrows(ServicioNoDisponibleException.class,
                () -> clienteResiliente.validarCliente(2L));
    }

    private FeignException notFound() {
        Response response = Response.builder()
                .status(404)
                .reason("Not Found")
                .request(Request.create(Request.HttpMethod.GET, "/api/v1/clientes/99",
                        Map.of(), null, null, null))
                .build();
        return FeignException.errorStatus("ClienteClient#obtener(Long)", response);
    }
}
