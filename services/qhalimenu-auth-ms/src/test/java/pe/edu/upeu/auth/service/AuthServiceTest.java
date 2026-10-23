package pe.edu.upeu.auth.service;

import pe.edu.upeu.auth.dto.LoginRequest;
import pe.edu.upeu.auth.dto.LoginResponse;
import pe.edu.upeu.auth.entity.Rol;
import pe.edu.upeu.auth.entity.Usuario;
import pe.edu.upeu.auth.exception.CredencialesInvalidasException;
import pe.edu.upeu.auth.repository.RolRepository;
import pe.edu.upeu.auth.repository.UsuarioRepository;
import pe.edu.upeu.auth.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private UsuarioRepository usuarioRepository;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        RolRepository rolRepository = mock(RolRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        JwtService jwtService = new JwtService(new pe.edu.upeu.auth.security.RsaKeyProvider("", ""),
                "qhalimenu-auth-ms", 3600);
        authService = new AuthService(usuarioRepository, rolRepository, passwordEncoder, jwtService);
    }

    @Test
    void loginValidoDevuelveTokenYRoles() {
        Usuario usuario = Usuario.builder()
                .username("admin")
                .password(passwordEncoder.encode("admin123"))
                .activo(true)
                .roles(Set.of(Rol.builder().nombre("ADMIN").build()))
                .build();
        when(usuarioRepository.findByUsername("admin")).thenReturn(Optional.of(usuario));

        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("admin123");

        LoginResponse response = authService.login(request);

        assertEquals("Bearer", response.getTokenType());
        assertEquals("admin", response.getUsername());
        assertEquals(1, response.getRoles().size());
        assertEquals("ADMIN", response.getRoles().get(0));
    }

    @Test
    void loginConPasswordIncorrectaEsRechazado() {
        Usuario usuario = Usuario.builder()
                .username("admin")
                .password(passwordEncoder.encode("admin123"))
                .activo(true)
                .roles(Set.of(Rol.builder().nombre("ADMIN").build()))
                .build();
        when(usuarioRepository.findByUsername("admin")).thenReturn(Optional.of(usuario));

        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("incorrecta");

        assertThrows(CredencialesInvalidasException.class, () -> authService.login(request));
    }
}
