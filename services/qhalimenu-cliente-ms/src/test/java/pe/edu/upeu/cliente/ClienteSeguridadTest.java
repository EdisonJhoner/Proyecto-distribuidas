package pe.edu.upeu.cliente;

import org.junit.jupiter.api.BeforeEach;
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

import pe.edu.upeu.cliente.entity.Cliente;
import pe.edu.upeu.cliente.repository.ClienteRepository;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:cliente_seg;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
class ClienteSeguridadTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ClienteRepository clienteRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    private Long idPropio;
    private Long idAjeno;

    @BeforeEach
    void prepararDatos() {
        clienteRepository.deleteAll();
        idPropio = clienteRepository.save(Cliente.builder()
                .numeroDocumento("11111111").nombres("Cliente Propio").celular("900000001").build()).getId();
        idAjeno = clienteRepository.save(Cliente.builder()
                .numeroDocumento("22222222").nombres("Cliente Ajeno").celular("900000002").build()).getId();
    }

    private static RequestPostProcessor clienteToken(long idCliente) {
        return jwt().jwt(builder -> builder
                .subject("cliente1")
                .claim("idCliente", idCliente)
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
        mockMvc.perform(get("/api/v1/clientes/" + idPropio))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listadoDeClientesEsExclusivoDeAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/clientes").with(clienteToken(idPropio)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/clientes").with(adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void clienteVeSuPropioRegistroPeroNoElAjeno() throws Exception {
        mockMvc.perform(get("/api/v1/clientes/" + idPropio).with(clienteToken(idPropio)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(idPropio));

        mockMvc.perform(get("/api/v1/clientes/" + idAjeno).with(clienteToken(idPropio)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/clientes/" + idAjeno).with(adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void clienteNoPuedeEliminarClientes() throws Exception {
        mockMvc.perform(delete("/api/v1/clientes/" + idAjeno).with(clienteToken(idPropio)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/v1/clientes/" + idAjeno).with(adminToken()))
                .andExpect(status().isNoContent());
    }

    @Test
    void clienteSoloPuedeActualizarSuPropioPerfil() throws Exception {
        String body = """
                {
                  "numeroDocumento": "11111111",
                  "nombres": "Nombre Actualizado",
                  "celular": "900000009"
                }
                """;

        mockMvc.perform(put("/api/v1/clientes/" + idAjeno)
                        .with(clienteToken(idPropio))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/clientes/" + idPropio)
                        .with(clienteToken(idPropio))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombres").value("Nombre Actualizado"));
    }

    @Test
    void endpointPublicoDeHealthNoExigeToken() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }
}
