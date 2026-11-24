package pe.edu.upeu.pago;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;

import pe.edu.upeu.pago.entity.Pago;
import pe.edu.upeu.pago.event.OrdenCreadaEvento;
import pe.edu.upeu.pago.event.OrdenItemEvento;
import pe.edu.upeu.pago.outbox.OutboxEventoService;
import pe.edu.upeu.pago.repository.PagoRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost:0/jwks",
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
        "spring.kafka.consumer.group-id=qhalimenu-pago-ms",
        "spring.kafka.consumer.auto-offset-reset=earliest",
        "mercadopago.access-token=TEST-1234567890123456789012",
        "mercadopago.placeholder-token=TEST-YOUR-ACCESS-TOKEN",
        "mercadopago.currency-id=PEN",
        "mercadopago.success-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.failure-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.pending-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.notification-url=http://localhost:18080/api/v1/pagos/webhook"
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
    void ordenCreadaRegistraElPagoPendienteSinAprobarloAutomaticamente() throws Exception {
        kafkaTemplate.send("orden-eventos", "500", ordenCreada(500L)).get(10, TimeUnit.SECONDS);

        Pago pago = esperarPago(500L);
        assertEquals("PENDIENTE", pago.getEstadoPago(),
                "El pago se aprueba solo desde el checkout real o desde Caja");
        assertNotNull(pago.getId());
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
    void ordenCreadaConYapeQuedaPendienteHastaConfirmarLaTransferencia() throws Exception {
        kafkaTemplate.send("orden-eventos", "810", ordenCreadaYape(810L)).get(10, TimeUnit.SECONDS);

        Pago pago = esperarPago(810L);
        assertEquals("PENDIENTE", pago.getEstadoPago(),
                "Un pago Yape no debe aprobarse hasta que el cliente confirme Ya transferí");
        assertEquals("YAPE", pago.getMetodoPago());
    }

    @Test
    void ordenCreadaConMercadoPagoQuedaPendienteHastaElegirMetodoEnElCheckout() throws Exception {
        kafkaTemplate.send("orden-eventos", "820", ordenCreadaMercadoPago(820L)).get(10, TimeUnit.SECONDS);

        Pago pago = esperarPago(820L);
        assertEquals("PENDIENTE", pago.getEstadoPago(),
                "Mercado Pago no debe aprobarse automáticamente: el cliente elige el método en el checkout");
        assertEquals("MERCADOPAGO", pago.getMetodoPago());
    }

    @Test
    void ordenCreadaEnEfectivoQuedaPendienteHastaConfirmarElCobro() throws Exception {
        kafkaTemplate.send("orden-eventos", "800", ordenCreadaEfectivo(800L)).get(10, TimeUnit.SECONDS);

        Pago pago = esperarPago(800L);
        assertEquals("PENDIENTE", pago.getEstadoPago(),
                "Un pago en efectivo no debe aprobarse automáticamente");
        assertEquals("EFECTIVO", pago.getMetodoPago());
    }

    @Test
    void ordenCreadaPublicadaPorOutboxEsConsumidaYDeserializada() throws Exception {
        outboxEventoService.encolar(
                "orden-eventos", "700", "ORDEN", OrdenCreadaEvento.TIPO, ordenCreada(700L));

        Pago pago = esperarPago(700L);
        assertEquals("PENDIENTE", pago.getEstadoPago());
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

    private OrdenCreadaEvento ordenCreadaYape(Long ordenId) {
        return new OrdenCreadaEvento(
                UUID.randomUUID().toString(),
                OrdenCreadaEvento.TIPO,
                ordenId,
                "1",
                new BigDecimal("18.00"),
                "YAPE",
                "ANTICIPADO",
                "PENDIENTE_PAGO",
                Instant.now(),
                List.of(new OrdenItemEvento(10L, 1, new BigDecimal("18.00"))));
    }

    private OrdenCreadaEvento ordenCreadaMercadoPago(Long ordenId) {
        return new OrdenCreadaEvento(
                UUID.randomUUID().toString(),
                OrdenCreadaEvento.TIPO,
                ordenId,
                "1",
                new BigDecimal("25.00"),
                "MERCADOPAGO",
                "ANTICIPADO",
                "PENDIENTE_PAGO",
                Instant.now(),
                List.of(new OrdenItemEvento(10L, 1, new BigDecimal("25.00"))));
    }

    private OrdenCreadaEvento ordenCreadaEfectivo(Long ordenId) {
        return new OrdenCreadaEvento(
                UUID.randomUUID().toString(),
                OrdenCreadaEvento.TIPO,
                ordenId,
                "1",
                new BigDecimal("18.00"),
                "EFECTIVO",
                "ANTICIPADO",
                "PENDIENTE_PAGO",
                Instant.now(),
                List.of(new OrdenItemEvento(10L, 1, new BigDecimal("18.00"))));
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
}
