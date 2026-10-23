package pe.edu.upeu.orden.event;

import pe.edu.upeu.orden.entity.Orden;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrdenCreadaEvento(
        String eventoId,
        String tipo,
        Long ordenId,
        String idCliente,
        BigDecimal total,
        String metodoPago,
        String momentoPago,
        String estado,
        Instant ocurridoEn,
        List<OrdenItemEvento> items) {

    public static final String TIPO = "orden.creada";

    public static OrdenCreadaEvento desde(Orden orden) {
        List<OrdenItemEvento> items = orden.getDetalles().stream()
                .map(detalle -> new OrdenItemEvento(
                        detalle.getIdProducto(),
                        detalle.getCantidad(),
                        detalle.getPrecioUnitario()))
                .toList();
        return new OrdenCreadaEvento(
                UUID.randomUUID().toString(),
                TIPO,
                orden.getId(),
                orden.getIdCliente(),
                orden.getTotal(),
                orden.getMetodoPago(),
                orden.getMomentoPago(),
                orden.getEstado(),
                Instant.now(),
                items);
    }
}
