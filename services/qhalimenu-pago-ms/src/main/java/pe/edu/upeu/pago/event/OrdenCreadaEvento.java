package pe.edu.upeu.pago.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

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
}
