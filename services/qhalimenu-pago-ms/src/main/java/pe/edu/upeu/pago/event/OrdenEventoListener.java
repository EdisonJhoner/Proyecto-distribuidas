package pe.edu.upeu.pago.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import pe.edu.upeu.pago.service.PagoService;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrdenEventoListener {

    private final PagoService pagoService;

    @KafkaListener(
            topics = "${qhalimenu.kafka.topic.orden-eventos:orden-eventos}",
            groupId = "${spring.kafka.consumer.group-id:qhalimenu-pago-ms}")
    public void onOrdenCreada(OrdenCreadaEvento evento) {
        log.info("Evento '{}' recibido: ordenId={} idCliente={} total={} items={}",
                evento.tipo(),
                evento.ordenId(),
                evento.idCliente(),
                evento.total(),
                evento.items() == null ? 0 : evento.items().size());
        pagoService.registrarPagoDesdeOrden(evento);
    }
}
