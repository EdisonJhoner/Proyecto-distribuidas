package pe.edu.upeu.orden.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdenResponse {
    private Long id;
    private String idCliente;
    private LocalDateTime fechaCreacion;
    private String estado;
    private String tipoComprobante;
    private String metodoPago;
    private String momentoPago;
    private BigDecimal total;
    private List<OrdenDetalleResponse> detalles;
}
