package pe.edu.upeu.orden.event;

import java.math.BigDecimal;

public record OrdenItemEvento(
        Long idProducto,
        Integer cantidad,
        BigDecimal precioUnitario) {
}
