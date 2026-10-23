package pe.edu.upeu.orden.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PagoValidadoEvento(
        String eventoId,
        String tipo,
        Long ordenId,
        Long pagoId,
        String preferenceId,
        BigDecimal monto,
        String estadoPago,
        Instant ocurridoEn) {

    public static final String TIPO_VALIDADO = "pago.validado";
    public static final String TIPO_FALLIDO = "pago.fallido";

    public static PagoValidadoEvento validado(Long ordenId, Long pagoId, String preferenceId, BigDecimal monto) {
        return new PagoValidadoEvento(UUID.randomUUID().toString(), TIPO_VALIDADO,
                ordenId, pagoId, preferenceId, monto, "PROCESADO", Instant.now());
    }

    public static PagoValidadoEvento fallido(Long ordenId, Long pagoId, String preferenceId, BigDecimal monto) {
        return new PagoValidadoEvento(UUID.randomUUID().toString(), TIPO_FALLIDO,
                ordenId, pagoId, preferenceId, monto, "RECHAZADO", Instant.now());
    }
}
