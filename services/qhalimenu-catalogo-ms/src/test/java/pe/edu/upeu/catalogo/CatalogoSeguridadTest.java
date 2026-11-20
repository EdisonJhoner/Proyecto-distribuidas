package pe.edu.upeu.catalogo;

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

import pe.edu.upeu.catalogo.entity.Categoria;
import pe.edu.upeu.catalogo.repository.CategoriaRepository;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.cloud.config.import-check.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:catalogo_seg;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
class CatalogoSeguridadTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    private static RequestPostProcessor clienteToken() {
        return jwt().jwt(builder -> builder
                .subject("cliente1")
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
    void catalogoPublicoNoExigeToken() throws Exception {
        mockMvc.perform(get("/api/v1/productos"))
                .andExpect(status().isOk());
    }

    @Test
    void crearMenuSinTokenSeRechaza() throws Exception {
        mockMvc.perform(post("/api/v1/productos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void clienteNoPuedeCrearNiBorrarMenus() throws Exception {
        mockMvc.perform(post("/api/v1/productos")
                        .with(clienteToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Aji de gallina",
                                  "descripcion": "Plato del dia",
                                  "precio": 14.00,
                                  "activo": true,
                                  "stock": 20,
                                  "categoriaId": 1
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/v1/productos/1").with(clienteToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminPuedeCrearMenu() throws Exception {
        Categoria categoria = categoriaRepository.save(Categoria.builder()
                .nombre("Almuerzos")
                .descripcion("Platos de fondo")
                .build());

        mockMvc.perform(post("/api/v1/productos")
                        .with(adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Aji de gallina",
                                  "descripcion": "Plato del dia",
                                  "precio": 14.00,
                                  "activo": true,
                                  "stock": 20,
                                  "categoriaId": %d
                                }
                                """.formatted(categoria.getId())))
                .andExpect(status().isCreated());
    }
}
