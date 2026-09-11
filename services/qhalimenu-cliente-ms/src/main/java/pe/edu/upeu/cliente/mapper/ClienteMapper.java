package pe.edu.upeu.cliente.mapper;

import pe.edu.upeu.cliente.dto.ClienteRequest;
import pe.edu.upeu.cliente.dto.ClienteResponse;
import pe.edu.upeu.cliente.entity.Cliente;
import org.springframework.stereotype.Component;

@Component
public class ClienteMapper {

    public Cliente toEntity(ClienteRequest request) {
        return Cliente.builder()
                .numeroDocumento(request.getNumeroDocumento())
                .nombres(request.getNombres())
                .celular(request.getCelular())
                .build();
    }

    public ClienteResponse toResponse(Cliente cliente) {
        return ClienteResponse.builder()
                .id(cliente.getId())
                .numeroDocumento(cliente.getNumeroDocumento())
                .nombres(cliente.getNombres())
                .celular(cliente.getCelular())
                .build();
    }
}
