package pe.edu.upeu.pago.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagoResponse {
    private Long id;
    private Long ordenId;
    private BigDecimal monto;
    private String metodoPago;
    private String estadoPago;
    private String preferenceId;
    private String initPoint;
    private String sandboxInitPoint;
    private boolean modoSimulacion;
    private LocalDateTime fechaPago;
}
