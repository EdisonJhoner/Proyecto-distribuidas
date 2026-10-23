package pe.edu.upeu.cliente.service;

import pe.edu.upeu.cliente.dto.ClienteRequest;
import pe.edu.upeu.cliente.dto.ClienteResponse;
import pe.edu.upeu.cliente.entity.Cliente;
import pe.edu.upeu.cliente.exception.AccesoDenegadoException;
import pe.edu.upeu.cliente.exception.ResourceNotFoundException;
import pe.edu.upeu.cliente.mapper.ClienteMapper;
import pe.edu.upeu.cliente.repository.ClienteRepository;
import pe.edu.upeu.cliente.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final ClienteMapper clienteMapper;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar() {
        return clienteRepository.findAll().stream()
                .map(clienteMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse obtener(Long id) {
        Cliente cliente = buscarOFallar(id);
        validarPropiedad(cliente.getId());
        return clienteMapper.toResponse(cliente);
    }

    @Transactional(readOnly = true)
    public ClienteResponse obtenerPorDocumento(String numeroDocumento) {
        Cliente cliente = clienteRepository.findByNumeroDocumento(numeroDocumento)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cliente no encontrado para documento: " + numeroDocumento));
        validarPropiedad(cliente.getId());
        return clienteMapper.toResponse(cliente);
    }

    @Transactional
    public ClienteResponse asociarExpress(ClienteRequest request) {
        return clienteRepository.findByNumeroDocumento(request.getNumeroDocumento())
                .map(existente -> {
                    validarPropiedad(existente.getId());
                    return actualizarDatosEntrega(existente, request);
                })
                .orElseGet(() -> {
                    if (!currentUserProvider.esAdmin()) {
                        throw new AccesoDenegadoException(
                                "Solo un administrador puede registrar nuevos clientes");
                    }
                    return clienteMapper.toResponse(
                            clienteRepository.save(clienteMapper.toEntity(request)));
                });
    }

    @Transactional
    public ClienteResponse actualizar(Long id, ClienteRequest request) {
        Cliente cliente = buscarOFallar(id);
        validarPropiedad(id);
        return actualizarDatosEntrega(cliente, request);
    }

    @Transactional
    public void eliminar(Long id) {
        clienteRepository.delete(buscarOFallar(id));
    }

    private ClienteResponse actualizarDatosEntrega(Cliente cliente, ClienteRequest request) {
        cliente.setNombres(request.getNombres());
        cliente.setCelular(request.getCelular());
        cliente.setNumeroDocumento(request.getNumeroDocumento());
        return clienteMapper.toResponse(clienteRepository.save(cliente));
    }

    private Cliente buscarOFallar(Long id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + id));
    }

    private void validarPropiedad(Long idClienteRecurso) {
        if (currentUserProvider.esAdmin()) {
            return;
        }
        Long idClienteToken = currentUserProvider.getIdCliente();
        if (idClienteToken != null && Objects.equals(idClienteToken, idClienteRecurso)) {
            return;
        }
        throw new AccesoDenegadoException("No tiene permisos para acceder a este cliente");
    }
}
