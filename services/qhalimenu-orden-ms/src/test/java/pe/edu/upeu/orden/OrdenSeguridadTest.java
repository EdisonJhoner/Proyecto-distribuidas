package pe.edu.upeu.orden;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import pe.edu.upeu.orden.client.CatalogoClient;
import pe.edu.upeu.orden.client.ClienteClient;
import pe.edu.upeu.orden.client.dto.CatalogoProductoDto;
import pe.edu.upeu.orden.client.dto.ClienteDto;
import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.event.OrdenEventoPublisher;
import pe.edu.upeu.orden.repository.OrdenRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:orden_seg;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
class OrdenSeguridadTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrdenRepository ordenRepository;

    @MockitoBean
    private org.springframework.security.oauth2.jwt.JwtDecoder jwtDecoder;

    @MockitoBean
    private CatalogoClient catalogoClient;

    @MockitoBean
    private ClienteClient clienteClient;

    @MockitoBean
    private OrdenEventoPublisher ordenEventoPublisher;

    private static RequestPostProcessor clienteToken() {
        return jwt().jwt(builder -> builder
                .subject("cliente1")
                .claim("idCliente", 1L)
                .claim("roles", List.of("CLIENTE")))
                .authorities(new SimpleGrantedAuthority("ROLE_CLIENTE"));
    }

    private static RequestPostProcessor otroClienteToken() {
        return jwt().jwt(builder -> builder
                .subject("cliente2")
                .claim("idCliente", 2L)
                .claim("roles", List.of("CLIENTE")))
                .authorities(new SimpleGrantedAuthority("ROLE_CLIENTE"));
    }

    private static RequestPostProcessor adminToken() {
        return jwt().jwt(builder -> builder
                .subject("admin")
                .claim("roles", List.of("ADMIN")))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    void sinTokenSeRechazaCon401() throws Exception {
        mockMvc.perform(get("/api/v1/ordenes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listadoDeOrdenesEsExclusivoDeAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/ordenes").with(clienteToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/ordenes").with(adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void clienteNoPuedeConsultarOrdenDeOtroCliente() throws Exception {
        Orden ajena = Orden.builder()
                .idCliente("2")
                .fechaCreacion(LocalDateTime.now())
                .estado("PENDIENTE")
                .tipoComprobante("BOLETA")
                .metodoPago("TARJETA")
                .momentoPago("ANTICIPADO")
                .total(new BigDecimal("10.00"))
                .build();
        ajena = ordenRepository.save(ajena);

        mockMvc.perform(get("/api/v1/ordenes/" + ajena.getId()).with(clienteToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/ordenes/" + ajena.getId()).with(adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void creacionDeOrdenUsaIdClienteDelTokenValidado() throws Exception {
        when(clienteClient.obtener(1L)).thenReturn(new ClienteDto(1L, "12345678", "Ana Perez"));
        when(catalogoClient.obtener(10L)).thenReturn(
                new CatalogoProductoDto(10L, "Menu del dia", new BigDecimal("8.50"), true));

        String body = """
                {
                  "tipoComprobante": "BOLETA",
                  "metodoPago": "TARJETA",
                  "momentoPago": "ANTICIPADO",
                  "idCliente": 999,
                  "detalles": [ {"idProducto": 10, "cantidad": 2, "precioUnitario": 1.0} ]
                }
                """;

        mockMvc.perform(post("/api/v1/ordenes")
                        .with(clienteToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idCliente").value("1"));
    }

    @Test
    void endpointPublicoDeHealthNoExigeToken() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }
}
