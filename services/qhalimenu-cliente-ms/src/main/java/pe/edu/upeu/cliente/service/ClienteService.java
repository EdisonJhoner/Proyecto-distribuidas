package pe.edu.upeu.cliente.service;

import pe.edu.upeu.cliente.dto.ClienteRequest;
import pe.edu.upeu.cliente.dto.ClienteResponse;
import pe.edu.upeu.cliente.entity.Cliente;
import pe.edu.upeu.cliente.exception.ResourceNotFoundException;
import pe.edu.upeu.cliente.mapper.ClienteMapper;
import pe.edu.upeu.cliente.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final ClienteMapper clienteMapper;

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar() {
        return clienteRepository.findAll().stream()
                .map(clienteMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse obtener(Long id) {
        return clienteMapper.toResponse(buscarOFallar(id));
    }

    @Transactional(readOnly = true)
    public ClienteResponse obtenerPorDocumento(String numeroDocumento) {
        return clienteRepository.findByNumeroDocumento(numeroDocumento)
                .map(clienteMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cliente no encontrado para documento: " + numeroDocumento));
    }

    @Transactional
    public ClienteResponse asociarExpress(ClienteRequest request) {
        return clienteRepository.findByNumeroDocumento(request.getNumeroDocumento())
                .map(existente -> actualizarDatosEntrega(existente, request))
                .orElseGet(() -> clienteMapper.toResponse(
                        clienteRepository.save(clienteMapper.toEntity(request))));
    }

    @Transactional
    public ClienteResponse actualizar(Long id, ClienteRequest request) {
        Cliente cliente = buscarOFallar(id);
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
}
