package pe.edu.upeu.orden.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.upeu.orden.entity.OutboxEvento;
import pe.edu.upeu.orden.repository.OutboxEventoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxEventoRepository outboxEventoRepository;
    private final KafkaTemplate<String, String> stringKafkaTemplate;

    @Scheduled(
            fixedDelayString = "${qhalimenu.outbox.poll-delay-ms:2000}",
            initialDelayString = "${qhalimenu.outbox.initial-delay-ms:3000}")
    @Transactional
    public void publicarPendientes() {
        List<OutboxEvento> pendientes =
                outboxEventoRepository.findTop50ByEstadoOrderByCreadoEnAsc("PENDIENTE");
        for (OutboxEvento evento : pendientes) {
            try {
                stringKafkaTemplate
                        .send(evento.getTopic(), evento.getAgregadoId(), evento.getPayload())
                        .get(10, TimeUnit.SECONDS);
                evento.setEstado("PUBLICADO");
                evento.setPublicadoEn(LocalDateTime.now());
                outboxEventoRepository.save(evento);
                log.info("Outbox: evento '{}' (id={}) publicado en '{}'",
                        evento.getTipo(), evento.getId(), evento.getTopic());
            } catch (Exception ex) {
                evento.setIntentos(evento.getIntentos() + 1);
                outboxEventoRepository.save(evento);
                log.error("Outbox: no se pudo publicar evento id={} tipo={}: {}",
                        evento.getId(), evento.getTipo(), ex.getMessage());
            }
        }
    }
}
