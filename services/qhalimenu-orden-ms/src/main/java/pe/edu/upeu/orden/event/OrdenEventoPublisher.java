package pe.edu.upeu.orden.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.outbox.OutboxEventoService;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrdenEventoPublisher {

    private final OutboxEventoService outboxEventoService;

    @Value("${qhalimenu.kafka.topic.orden-eventos:orden-eventos}")
    private String topicOrdenEventos;

    public void publicarOrdenCreada(Orden orden) {
        OrdenCreadaEvento evento = OrdenCreadaEvento.desde(orden);
        outboxEventoService.encolar(
                topicOrdenEventos,
                String.valueOf(orden.getId()),
                "ORDEN",
                OrdenCreadaEvento.TIPO,
                evento);
    }
}
