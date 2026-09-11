package pe.edu.upeu.pago.mapper;

import pe.edu.upeu.pago.config.MercadoPagoProperties;
import pe.edu.upeu.pago.dto.PagoResponse;
import pe.edu.upeu.pago.entity.Pago;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PagoMapper {

    private final MercadoPagoProperties mercadoPagoProperties;

    public PagoResponse toResponse(Pago pago) {
        return toResponse(pago, null, null, esSimulacion(pago));
    }

    public PagoResponse toResponse(Pago pago, String initPoint, String sandboxInitPoint, boolean modoSimulacion) {
        return PagoResponse.builder()
                .id(pago.getId())
                .ordenId(pago.getOrdenId())
                .monto(pago.getMonto())
                .metodoPago(pago.getMetodoPago())
                .estadoPago(pago.getEstadoPago())
                .preferenceId(pago.getPreferenceId())
                .initPoint(initPoint)
                .sandboxInitPoint(sandboxInitPoint)
                .modoSimulacion(modoSimulacion)
                .fechaPago(pago.getFechaPago())
                .build();
    }

    private boolean esSimulacion(Pago pago) {
        String prefix = mercadoPagoProperties.getSimulationIdPrefix();
        return pago.getPreferenceId() != null && prefix != null && pago.getPreferenceId().startsWith(prefix);
    }
}
