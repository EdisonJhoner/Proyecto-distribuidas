package pe.edu.upeu.orden.client.dto;

import java.math.BigDecimal;

public record CatalogoProductoDto(
        Long id,
        String nombre,
        BigDecimal precio,
        Boolean activo
) {
}
