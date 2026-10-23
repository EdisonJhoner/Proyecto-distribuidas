package pe.edu.upeu.orden;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.entity.OrdenDetalle;
import pe.edu.upeu.orden.event.OrdenEventoPublisher;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:orden_kafka;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}"
})
@EmbeddedKafka(partitions = 1, topics = {"orden-eventos", "orden-eventos.DLT"})
class OrdenEventoPublisherTest {

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Autowired
    private OrdenEventoPublisher ordenEventoPublisher;

    @MockitoBean
    private org.springframework.security.oauth2.jwt.JwtDecoder jwtDecoder;

    @Test
    void publicaOrdenCreadaEnTopicOrdenEventos() {
        Orden orden = Orden.builder()
                .id(123L)
                .idCliente("1")
                .fechaCreacion(LocalDateTime.now())
                .estado("PENDIENTE_PAGO")
                .tipoComprobante("BOLETA")
                .metodoPago("TARJETA")
                .momentoPago("ANTICIPADO")
                .total(new BigDecimal("15.00"))
                .build();
        orden.getDetalles().add(OrdenDetalle.builder()
                .idProducto(10L)
                .cantidad(2)
                .precioUnitario(new BigDecimal("7.50"))
                .orden(orden)
                .build());

        ordenEventoPublisher.publicarOrdenCreada(orden);

        List<String> valores = consumirTexto("orden-eventos", 1, 15000);
        assertTrue(valores.stream()
                        .anyMatch(v -> v.contains("orden.creada")
                                && v.contains("123")
                                && v.contains("PENDIENTE_PAGO")),
                "Debe publicarse 'orden.creada' para la orden 123: " + valores);
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
