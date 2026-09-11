package pe.edu.upeu.orden.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdenDetalleResponse {
    private Long id;
    private Long idProducto;
    private Integer cantidad;
    private BigDecimal precioUnitario;
}
