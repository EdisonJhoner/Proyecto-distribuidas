package pe.edu.upeu.orden;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.event.PagoValidadoEvento;
import pe.edu.upeu.orden.outbox.OutboxEventoService;
import pe.edu.upeu.orden.repository.OrdenRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:orden_saga;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}"
})
@EmbeddedKafka(partitions = 1, topics = {
        "orden-eventos", "orden-eventos.DLT", "pago-eventos", "pago-eventos.DLT"
})
class OrdenSagaListenerTest {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private OrdenRepository ordenRepository;

    @Autowired
    private OutboxEventoService outboxEventoService;

    @MockitoBean
    private org.springframework.security.oauth2.jwt.JwtDecoder jwtDecoder;

    @Test
    void pagoValidadoMarcaLaOrdenComoPagada() throws Exception {
        Orden orden = guardarOrdenPendiente();

        kafkaTemplate.send("pago-eventos", String.valueOf(orden.getId()),
                PagoValidadoEvento.validado(orden.getId(), 100L, "SIM-1", new BigDecimal("20.00")))
                .get(10, TimeUnit.SECONDS);

        assertEquals("PAGADA", esperarEstado(orden.getId()));
    }

    @Test
    void pagoFallidoMarcaLaOrdenComoCancelada() throws Exception {
        Orden orden = guardarOrdenPendiente();

        kafkaTemplate.send("pago-eventos", String.valueOf(orden.getId()),
                PagoValidadoEvento.fallido(orden.getId(), 200L, "SIM-2", new BigDecimal("20.00")))
                .get(10, TimeUnit.SECONDS);

        assertEquals("CANCELADA", esperarEstado(orden.getId()));
    }

    @Test
    void pagoValidadoPublicadoPorOutboxEsConsumidoYDeserializado() throws Exception {
        Orden orden = guardarOrdenPendiente();

        outboxEventoService.encolar("pago-eventos", String.valueOf(orden.getId()), "PAGO",
                PagoValidadoEvento.TIPO_VALIDADO,
                PagoValidadoEvento.validado(orden.getId(), 300L, "SIM-3", new BigDecimal("20.00")));

        assertEquals("PAGADA", esperarEstado(orden.getId()));
    }

    private Orden guardarOrdenPendiente() {        return ordenRepository.save(Orden.builder()
                .idCliente("1")
                .fechaCreacion(LocalDateTime.now())
                .estado("PENDIENTE_PAGO")
                .tipoComprobante("BOLETA")
                .metodoPago("TARJETA")
                .momentoPago("ANTICIPADO")
                .total(new BigDecimal("20.00"))
                .build());
    }

    private String esperarEstado(Long ordenId) throws InterruptedException {
        long limite = System.currentTimeMillis() + 15000;
        String estado = null;
        while (System.currentTimeMillis() < limite) {
            estado = ordenRepository.findById(ordenId).map(Orden::getEstado).orElse(null);
            if ("PAGADA".equals(estado) || "CANCELADA".equals(estado)) {
                break;
            }
            Thread.sleep(250);
        }
        assertNotNull(estado);
        return estado;
    }
}
