package pe.edu.upeu.pago;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.boot.test.context.TestConfiguration;

import pe.edu.upeu.pago.event.OrdenCreadaEvento;
import pe.edu.upeu.pago.event.OrdenItemEvento;
import pe.edu.upeu.pago.event.PagoEventoPublisher;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:pago_kafka;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost:0/jwks",
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
@Import(KafkaMensajeriaTest.ConfiguracionTest.class)
class KafkaMensajeriaTest {

    private static final BlockingQueue<OrdenCreadaEvento> RECIBIDOS = new LinkedBlockingQueue<>();

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Autowired
    private PagoEventoPublisher pagoEventoPublisher;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @TestConfiguration
    static class ConfiguracionTest {
        @KafkaListener(topics = "orden-eventos", groupId = "test-orden-creada")
        void escuchar(OrdenCreadaEvento evento) {
            RECIBIDOS.add(evento);
        }

        @Bean
        KafkaTemplate<String, String> testStringKafkaTemplate(EmbeddedKafkaBroker embeddedKafka) {
            Map<String, Object> props = KafkaTestUtils.producerProps(embeddedKafka);
            props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
            props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
            return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(props));
        }
    }

    @Autowired
    private KafkaTemplate<String, String> testStringKafkaTemplate;

    @Test
    void consumeOrdenCreadaDesdeTopicOrdenEventos() throws Exception {
        OrdenCreadaEvento evento = new OrdenCreadaEvento(
                UUID.randomUUID().toString(),
                OrdenCreadaEvento.TIPO,
                77L,
                "1",
                new BigDecimal("25.50"),
                "TARJETA",
                "ANTICIPADO",
                "PENDIENTE",
                Instant.now(),
                List.of(new OrdenItemEvento(10L, 2, new BigDecimal("12.75"))));

        kafkaTemplate.send("orden-eventos", "77", evento).get(10, TimeUnit.SECONDS);

        OrdenCreadaEvento recibido = RECIBIDOS.poll(15, TimeUnit.SECONDS);
        assertNotNull(recibido, "El listener debio recibir el evento orden.creada");
        assertTrue(recibido.ordenId().equals(77L));
        assertTrue(new BigDecimal("25.50").compareTo(recibido.total()) == 0);
    }

    @Test
    void publicaEventoPagoEnTopicPagoEventos() throws Exception {
        pagoEventoPublisher.publicarValidado(55L, 100L, "SIM-abc", new BigDecimal("12.50"));

        List<String> valores = consumirTexto("pago-eventos", 1, 15000);
        assertTrue(valores.stream().anyMatch(v -> v.contains("pago.validado") && v.contains("55")),
                "Debe publicarse 'pago.validado' para la orden 55: " + valores);
    }

    @Test
    void mensajeMalFormadoTerminaEnDeadLetterTopic() throws Exception {
        testStringKafkaTemplate.send("orden-eventos", "99", "esto-no-es-json-valido").get(10, TimeUnit.SECONDS);

        List<String> dlt = consumirTexto("orden-eventos.DLT", 1, 20000);
        assertTrue(!dlt.isEmpty(), "El mensaje invalido debio publicarse en orden-eventos.DLT");
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
            List<String> resultado = new java.util.ArrayList<>();
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
