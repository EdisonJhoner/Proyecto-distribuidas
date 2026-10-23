package pe.edu.upeu.pago;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;

import pe.edu.upeu.pago.entity.Pago;
import pe.edu.upeu.pago.event.OrdenCreadaEvento;
import pe.edu.upeu.pago.event.OrdenItemEvento;
import pe.edu.upeu.pago.outbox.OutboxEventoService;
import pe.edu.upeu.pago.repository.PagoRepository;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:pago_saga;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
        "spring.kafka.consumer.group-id=qhalimenu-pago-ms",
        "spring.kafka.consumer.auto-offset-reset=earliest",
        "mercadopago.access-token=TEST-YOUR-ACCESS-TOKEN",
        "mercadopago.placeholder-token=TEST-YOUR-ACCESS-TOKEN",
        "mercadopago.currency-id=PEN",
        "mercadopago.success-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.failure-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.pending-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.notification-url=http://localhost:18080/api/v1/pagos/webhook",
        "mercadopago.simulation-base-url=http://localhost:18080/api/v1/pagos/simulacion",
        "mercadopago.simulation-id-prefix=SIM-"
})
@EmbeddedKafka(partitions = 1, topics = {
        "orden-eventos", "orden-eventos.DLT", "pago-eventos", "pago-eventos.DLT"
})
class SagaPagoTest {

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private OutboxEventoService outboxEventoService;

    @Test
    void ordenCreadaRegistraYValidaElPagoYPublicaPagoValidado() throws Exception {
        kafkaTemplate.send("orden-eventos", "500", ordenCreada(500L)).get(10, TimeUnit.SECONDS);

        Pago pago = esperarPago(500L);
        assertEquals("PROCESADO", pago.getEstadoPago());
        assertNotNull(pago.getPreferenceId());

        List<String> eventos = consumirTexto("pago-eventos", 1, 15000);
        assertTrue(eventos.stream().anyMatch(v -> v.contains("pago.validado") && v.contains("500")),
                "Debe publicarse 'pago.validado' para la orden 500: " + eventos);
    }

    @Test
    void ordenCreadaDuplicadaNoGeneraPagoAdicional() throws Exception {
        kafkaTemplate.send("orden-eventos", "600", ordenCreada(600L)).get(10, TimeUnit.SECONDS);
        esperarPago(600L);

        kafkaTemplate.send("orden-eventos", "600", ordenCreada(600L)).get(10, TimeUnit.SECONDS);
        Thread.sleep(3000);

        assertEquals(1, pagoRepository.findByOrdenId(600L).size(),
                "El evento duplicado no debe generar un segundo pago (idempotencia)");
    }

    @Test
    void ordenCreadaPublicadaPorOutboxEsConsumidaYDeserializada() throws Exception {
        outboxEventoService.encolar(
                "orden-eventos", "700", "ORDEN", OrdenCreadaEvento.TIPO, ordenCreada(700L));

        Pago pago = esperarPago(700L);
        assertEquals("PROCESADO", pago.getEstadoPago());
    }

    private OrdenCreadaEvento ordenCreada(Long ordenId) {        return new OrdenCreadaEvento(
                UUID.randomUUID().toString(),
                OrdenCreadaEvento.TIPO,
                ordenId,
                "1",
                new BigDecimal("30.00"),
                "TARJETA",
                "ANTICIPADO",
                "PENDIENTE_PAGO",
                Instant.now(),
                List.of(new OrdenItemEvento(10L, 2, new BigDecimal("15.00"))));
    }

    private Pago esperarPago(Long ordenId) throws InterruptedException {
        long limite = System.currentTimeMillis() + 15000;
        Pago pago = null;
        while (System.currentTimeMillis() < limite) {
            pago = pagoRepository.findFirstByOrdenId(ordenId).orElse(null);
            if (pago != null) {
                break;
            }
            Thread.sleep(250);
        }
        assertNotNull(pago, "Debe registrarse un pago para la orden " + ordenId);
        return pago;
    }

    private List<String> consumirTexto(String topic, int cantidad, long timeoutMs) {
        Map<String, Object> props = KafkaTestUtils.consumerProps(
                "test-" + UUID.randomUUID(), "true", embeddedKafka);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        DefaultKafkaConsumerFactory<String, String> factory = new DefaultKafkaConsumerFactory<>(props);
        try (Consumer<String, String> consumer = factory.createConsumer()) {
            embeddedKafka.consumeFromAnEmbeddedTopic(consumer, topic);
            List<String> resultado = new ArrayList<>();
            long limite = System.currentTimeMillis() + timeoutMs;
            while (resultado.size() < cantidad && System.currentTimeMillis() < limite) {
                for (ConsumerRecord<String, String> record : consumer.poll(Duration.ofMillis(500))) {
                    resultado.add(record.value());
                }
            }
            return resultado;
        }
    }
}
