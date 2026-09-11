package pe.edu.upeu.pago.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PagoRequest {

    private Long ordenId;

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal monto;

    @Size(max = 20)
    private String metodoPago;

    @Email
    @Size(max = 150)
    private String email;

    @Email
    @Size(max = 150)
    private String emailComprador;
}
