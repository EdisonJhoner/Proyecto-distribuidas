package pe.edu.upeu.catalogo.dto;

import java.math.BigDecimal;

public record MenuResponse(
        Long id,
        String nombre,
        BigDecimal precio,
        Integer raciones
) {
}
