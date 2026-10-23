package pe.edu.upeu.orden.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import pe.edu.upeu.orden.service.OrdenService;

@Slf4j
@Component
@RequiredArgsConstructor
public class PagoEventoListener {

    private final OrdenService ordenService;

    @KafkaListener(
            topics = "${qhalimenu.kafka.topic.pago-eventos:pago-eventos}",
            groupId = "${spring.kafka.consumer.group-id:qhalimenu-orden-ms}")
    public void onPagoEvento(PagoValidadoEvento evento) {
        log.info("Evento '{}' recibido: ordenId={} pagoId={} estadoPago={}",
                evento.tipo(), evento.ordenId(), evento.pagoId(), evento.estadoPago());
        ordenService.aplicarResultadoPago(evento);
    }
}
