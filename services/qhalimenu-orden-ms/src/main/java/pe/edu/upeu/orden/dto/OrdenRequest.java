package pe.edu.upeu.orden.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OrdenRequest {

    @NotBlank
    @Size(max = 20)
    private String tipoComprobante;

    @NotBlank
    @Size(max = 20)
    private String metodoPago;

    @NotBlank
    @Size(max = 20)
    private String momentoPago;

    @NotEmpty
    @Valid
    private List<OrdenDetalleRequest> detalles;
}
