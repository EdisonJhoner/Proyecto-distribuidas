package pe.edu.upeu.pago;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import pe.edu.upeu.pago.entity.Pago;
import pe.edu.upeu.pago.repository.PagoRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:pago_seg;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "mercadopago.access-token=TEST-1234567890123456789012",
        "mercadopago.placeholder-token=TEST-YOUR-ACCESS-TOKEN",
        "mercadopago.currency-id=PEN",
        "mercadopago.success-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.failure-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.pending-url=http://localhost:18080/api/v1/pagos/feedback",
        "mercadopago.notification-url=http://localhost:18080/api/v1/pagos/webhook"
})
@AutoConfigureMockMvc
class PagoSeguridadTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private PagoRepository pagoRepository;

    private static RequestPostProcessor clienteToken() {
        return jwt().jwt(builder -> builder
                .subject("cliente1")
                .claim("idCliente", 1L)
                .claim("roles", List.of("CLIENTE")))
                .authorities(new SimpleGrantedAuthority("ROLE_CLIENTE"));
    }

    private static RequestPostProcessor adminToken() {
        return jwt().jwt(builder -> builder
                .subject("admin")
                .claim("roles", List.of("ADMIN")))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static RequestPostProcessor cajaToken() {
        return jwt().jwt(builder -> builder
                .subject("caja1")
                .claim("roles", List.of("CAJA")))
                .authorities(new SimpleGrantedAuthority("ROLE_CAJA"));
    }

    @Test
    void listarPagosSinTokenSeRechazaCon401() throws Exception {
        mockMvc.perform(get("/api/v1/pagos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listarPagosEsExclusivoDeAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/pagos").with(clienteToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/pagos").with(adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void listarPagosPorOrdenRequiereAutenticacion() throws Exception {
        mockMvc.perform(get("/api/v1/pagos/orden/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/pagos/orden/1").with(clienteToken()))
                .andExpect(status().isOk());
    }

    @Test
    void crearPreferenciaRequiereAutenticacion() throws Exception {
        String body = """
                {"ordenId": 1, "monto": 12.50, "metodoPago": "EFECTIVO"}
                """;

        mockMvc.perform(post("/api/v1/pagos/crear-preferencia")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/pagos/crear-preferencia")
                        .with(clienteToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ordenId").value(1));
    }

    @Test
    void confirmarEfectivoLoPuedenCajaYAdmin() throws Exception {
        Pago pagoCaja = pagoRepository.save(Pago.builder()
                .ordenId(999L)
                .monto(new BigDecimal("15.00"))
                .metodoPago("EFECTIVO")
                .estadoPago("PENDIENTE")
                .fechaPago(LocalDateTime.now())
                .build());
        Pago pagoAdmin = pagoRepository.save(Pago.builder()
                .ordenId(998L)
                .monto(new BigDecimal("16.00"))
                .metodoPago("EFECTIVO")
                .estadoPago("PENDIENTE")
                .fechaPago(LocalDateTime.now())
                .build());

        mockMvc.perform(post("/api/v1/pagos/" + pagoCaja.getId() + "/confirmar")
                        .with(clienteToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/pagos/" + pagoCaja.getId() + "/confirmar")
                        .with(cajaToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoPago").value("PROCESADO"));

        mockMvc.perform(post("/api/v1/pagos/" + pagoAdmin.getId() + "/confirmar")
                        .with(adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoPago").value("PROCESADO"));
    }

    @Test
    void cajaPuedeConfirmarEfectivoPorNumeroDeOrden() throws Exception {
        Pago pago = pagoRepository.save(Pago.builder()
                .ordenId(997L)
                .monto(new BigDecimal("17.00"))
                .metodoPago("EFECTIVO")
                .estadoPago("PENDIENTE")
                .fechaPago(LocalDateTime.now())
                .build());

        mockMvc.perform(post("/api/v1/pagos/orden/" + pago.getOrdenId() + "/confirmar-efectivo")
                        .with(clienteToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/pagos/orden/" + pago.getOrdenId() + "/confirmar-efectivo")
                        .with(cajaToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ordenId").value(997L))
                .andExpect(jsonPath("$.estadoPago").value("PROCESADO"));
    }

    @Test
    void webhookEsPublico() throws Exception {
        mockMvc.perform(get("/api/v1/pagos/webhook"))
                .andExpect(status().isOk());
    }

    @Test
    void feedbackEsPublicoPeroFalla404SiNoExisteElPago() throws Exception {
        mockMvc.perform(get("/api/v1/pagos/feedback").param("preference_id", "SIM-inexistente"))
                .andExpect(status().isNotFound());
    }

    @Test
    void endpointPublicoDeHealthNoExigeToken() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }
}
