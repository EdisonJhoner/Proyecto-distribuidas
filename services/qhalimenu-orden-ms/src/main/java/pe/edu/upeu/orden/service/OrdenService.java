package pe.edu.upeu.orden.service;

import pe.edu.upeu.orden.dto.OrdenDetalleRequest;
import pe.edu.upeu.orden.dto.OrdenRequest;
import pe.edu.upeu.orden.dto.OrdenResponse;
import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.entity.OrdenDetalle;
import pe.edu.upeu.orden.exception.ResourceNotFoundException;
import pe.edu.upeu.orden.mapper.OrdenMapper;
import pe.edu.upeu.orden.repository.OrdenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrdenService {

    private final OrdenRepository ordenRepository;
    private final OrdenMapper ordenMapper;

    @Transactional(readOnly = true)
    public List<OrdenResponse> listar() {
        return ordenRepository.findAllConDetalles().stream()
                .map(ordenMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrdenResponse obtener(Long id) {
        return ordenMapper.toResponse(buscarOFallar(id));
    }

    @Transactional
    public OrdenResponse crear(OrdenRequest request) {
        Orden orden = Orden.builder()
                .idCliente(request.getIdCliente())
                .fechaCreacion(LocalDateTime.now())
                .estado("PENDIENTE")
                .tipoComprobante(request.getTipoComprobante())
                .metodoPago(request.getMetodoPago())
                .momentoPago(request.getMomentoPago())
                .total(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (OrdenDetalleRequest detalleRequest : request.getDetalles()) {
            OrdenDetalle detalle = OrdenDetalle.builder()
                    .orden(orden)
                    .idProducto(detalleRequest.getIdProducto())
                    .cantidad(detalleRequest.getCantidad())
                    .precioUnitario(detalleRequest.getPrecioUnitario())
                    .build();
            orden.getDetalles().add(detalle);
            total = total.add(detalleRequest.getPrecioUnitario()
                    .multiply(BigDecimal.valueOf(detalleRequest.getCantidad())));
        }
        orden.setTotal(total);
        return ordenMapper.toResponse(ordenRepository.save(orden));
    }

    private Orden buscarOFallar(Long id) {
        return ordenRepository.findByIdConDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: " + id));
    }
}
