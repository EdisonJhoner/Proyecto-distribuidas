package pe.edu.upeu.auth.config;

import pe.edu.upeu.auth.entity.Rol;
import pe.edu.upeu.auth.entity.Usuario;
import pe.edu.upeu.auth.repository.RolRepository;
import pe.edu.upeu.auth.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public ApplicationRunner inicializarDatos() {
        return args -> {
            Rol rolAdmin = rolRepository.findByNombre("ADMIN")
                    .orElseGet(() -> rolRepository.save(Rol.builder().nombre("ADMIN").build()));
            Rol rolCliente = rolRepository.findByNombre("CLIENTE")
                    .orElseGet(() -> rolRepository.save(Rol.builder().nombre("CLIENTE").build()));

            crearUsuarioSiNoExiste("admin", "admin@qhalimenu.pe", "admin123", null, Set.of(rolAdmin));
            crearUsuarioSiNoExiste("cliente1", "cliente1@qhalimenu.pe", "cliente123", 1L, Set.of(rolCliente));
        };
    }

    private void crearUsuarioSiNoExiste(String username, String email, String password,
                                        Long idCliente, Set<Rol> roles) {
        if (usuarioRepository.existsByUsername(username)) {
            return;
        }
        usuarioRepository.save(Usuario.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .idCliente(idCliente)
                .activo(true)
                .roles(roles)
                .build());
        log.info("Usuario semilla creado: {}", username);
    }
}
