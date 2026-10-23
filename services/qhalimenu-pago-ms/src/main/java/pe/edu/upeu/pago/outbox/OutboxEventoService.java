package pe.edu.upeu.pago.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.upeu.pago.entity.OutboxEvento;
import pe.edu.upeu.pago.repository.OutboxEventoRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxEventoService {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();

    private final OutboxEventoRepository outboxEventoRepository;

    @Transactional
    public void encolar(String topic, String clave, String agregadoTipo, String tipo, Object payload) {
        String json;
        try {
            json = MAPPER.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar el evento '" + tipo + "'", e);
        }
        OutboxEvento evento = OutboxEvento.builder()
                .eventoId(UUID.randomUUID().toString())
                .agregadoTipo(agregadoTipo)
                .agregadoId(clave)
                .tipo(tipo)
                .topic(topic)
                .payload(json)
                .estado("PENDIENTE")
                .intentos(0)
                .creadoEn(LocalDateTime.now())
                .build();
        outboxEventoRepository.save(evento);
        log.debug("Outbox: encolado evento '{}' para {}={} en '{}'", tipo, agregadoTipo, clave, topic);
    }
}
