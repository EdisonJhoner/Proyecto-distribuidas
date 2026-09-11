package pe.edu.upeu.orden.mapper;

import pe.edu.upeu.orden.dto.OrdenDetalleResponse;
import pe.edu.upeu.orden.dto.OrdenResponse;
import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.entity.OrdenDetalle;
import org.springframework.stereotype.Component;

@Component
public class OrdenMapper {

    public OrdenResponse toResponse(Orden orden) {
        return OrdenResponse.builder()
                .id(orden.getId())
                .idCliente(orden.getIdCliente())
                .fechaCreacion(orden.getFechaCreacion())
                .estado(orden.getEstado())
                .tipoComprobante(orden.getTipoComprobante())
                .metodoPago(orden.getMetodoPago())
                .momentoPago(orden.getMomentoPago())
                .total(orden.getTotal())
                .detalles(orden.getDetalles().stream().map(this::toDetalleResponse).toList())
                .build();
    }

    private OrdenDetalleResponse toDetalleResponse(OrdenDetalle detalle) {
        return OrdenDetalleResponse.builder()
                .id(detalle.getId())
                .idProducto(detalle.getIdProducto())
                .cantidad(detalle.getCantidad())
                .precioUnitario(detalle.getPrecioUnitario())
                .build();
    }
}
