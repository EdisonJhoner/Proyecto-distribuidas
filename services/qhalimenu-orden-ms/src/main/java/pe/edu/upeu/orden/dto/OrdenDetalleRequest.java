package pe.edu.upeu.orden.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrdenDetalleRequest {

    @NotNull
    private Long idProducto;

    @NotNull
    @Min(1)
    private Integer cantidad;
}
