package pe.edu.upeu.pago.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import pe.edu.upeu.pago.outbox.OutboxEventoService;

import java.math.BigDecimal;

@Slf4j
@Component
@RequiredArgsConstructor
public class PagoEventoPublisher {

    private final OutboxEventoService outboxEventoService;

    @Value("${qhalimenu.kafka.topic.pago-eventos:pago-eventos}")
    private String topicPagoEventos;

    public void publicarValidado(Long ordenId, Long pagoId, String preferenceId, BigDecimal monto) {
        publicar(PagoValidadoEvento.validado(ordenId, pagoId, preferenceId, monto));
    }

    public void publicarFallido(Long ordenId, Long pagoId, String preferenceId, BigDecimal monto) {
        publicar(PagoValidadoEvento.fallido(ordenId, pagoId, preferenceId, monto));
    }

    public void publicar(PagoValidadoEvento evento) {
        outboxEventoService.encolar(
                topicPagoEventos,
                String.valueOf(evento.ordenId()),
                "PAGO",
                evento.tipo(),
                evento);
    }
}
