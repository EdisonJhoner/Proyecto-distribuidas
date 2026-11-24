package pe.edu.upeu.pago.mapper;

import pe.edu.upeu.pago.dto.PagoResponse;
import pe.edu.upeu.pago.entity.Pago;
import org.springframework.stereotype.Component;

@Component
public class PagoMapper {

    public PagoResponse toResponse(Pago pago) {
        return toResponse(pago, null, null);
    }

    public PagoResponse toResponse(Pago pago, String initPoint, String sandboxInitPoint) {
        return PagoResponse.builder()
                .id(pago.getId())
                .ordenId(pago.getOrdenId())
                .monto(pago.getMonto())
                .metodoPago(pago.getMetodoPago())
                .estadoPago(pago.getEstadoPago())
                .preferenceId(pago.getPreferenceId())
                .initPoint(initPoint)
                .sandboxInitPoint(sandboxInitPoint)
                .fechaPago(pago.getFechaPago())
                .build();
    }
}
