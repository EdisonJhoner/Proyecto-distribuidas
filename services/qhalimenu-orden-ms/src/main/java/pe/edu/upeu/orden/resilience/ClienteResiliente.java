package pe.edu.upeu.orden.resilience;

import pe.edu.upeu.orden.client.ClienteClient;
import pe.edu.upeu.orden.client.dto.ClienteDto;
import pe.edu.upeu.orden.exception.ClienteNoEncontradoException;
import pe.edu.upeu.orden.exception.ServicioNoDisponibleException;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ClienteResiliente {

    private final ClienteClient clienteClient;
    private final CircuitBreakerFactory<?, ?> circuitBreakerFactory;

    public ClienteDto validarCliente(Long idCliente) {
        ClienteDto cliente = circuitBreakerFactory.create("cliente").run(
                () -> consultarCliente(idCliente),
                throwable -> {
                    log.warn("Clientes no disponible al validar cliente {}: {}",
                            idCliente, throwable.getMessage());
                    throw new ServicioNoDisponibleException(
                            "No se pudo validar el cliente " + idCliente
                                    + " porque el servicio de clientes no está disponible. Intente nuevamente.", throwable);
                });

        if (cliente == null) {
            throw new ClienteNoEncontradoException("El cliente " + idCliente + " no existe");
        }
        return cliente;
    }

    private ClienteDto consultarCliente(Long idCliente) {
        try {
            return clienteClient.obtener(idCliente);
        } catch (FeignException.NotFound ex) {
            return null;
        }
    }
}
