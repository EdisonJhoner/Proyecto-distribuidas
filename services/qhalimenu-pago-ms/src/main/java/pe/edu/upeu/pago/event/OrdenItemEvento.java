package pe.edu.upeu.pago.event;

import java.math.BigDecimal;

public record OrdenItemEvento(
        Long idProducto,
        Integer cantidad,
        BigDecimal precioUnitario) {
}
