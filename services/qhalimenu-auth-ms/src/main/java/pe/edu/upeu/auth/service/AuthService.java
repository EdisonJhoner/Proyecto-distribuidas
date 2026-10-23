package pe.edu.upeu.auth.service;

import pe.edu.upeu.auth.dto.LoginRequest;
import pe.edu.upeu.auth.dto.LoginResponse;
import pe.edu.upeu.auth.dto.RegistroRequest;
import pe.edu.upeu.auth.dto.UsuarioResponse;
import pe.edu.upeu.auth.entity.Rol;
import pe.edu.upeu.auth.entity.Usuario;
import pe.edu.upeu.auth.exception.CredencialesInvalidasException;
import pe.edu.upeu.auth.exception.NegocioException;
import pe.edu.upeu.auth.repository.RolRepository;
import pe.edu.upeu.auth.repository.UsuarioRepository;
import pe.edu.upeu.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new CredencialesInvalidasException("Usuario o contrasena incorrectos"));

        if (!usuario.isActivo() || !passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            throw new CredencialesInvalidasException("Usuario o contrasena incorrectos");
        }

        String token = jwtService.generarToken(usuario);
        return LoginResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpiracionSegundos())
                .username(usuario.getUsername())
                .roles(usuario.getRoles().stream().map(Rol::getNombre).sorted().toList())
                .idCliente(usuario.getIdCliente())
                .build();
    }

    @Transactional
    public UsuarioResponse registrar(RegistroRequest request) {
        if (usuarioRepository.existsByUsername(request.getUsername())) {
            throw new NegocioException("El nombre de usuario ya esta registrado");
        }
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new NegocioException("El correo ya esta registrado");
        }

        Rol rolCliente = rolRepository.findByNombre("CLIENTE")
                .orElseThrow(() -> new NegocioException("El rol CLIENTE no existe"));

        Usuario usuario = Usuario.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .idCliente(request.getIdCliente())
                .activo(true)
                .roles(java.util.Set.of(rolCliente))
                .build();

        return toResponse(usuarioRepository.save(usuario));
    }

    private UsuarioResponse toResponse(Usuario usuario) {
        List<String> roles = usuario.getRoles().stream().map(Rol::getNombre).sorted().toList();
        return UsuarioResponse.builder()
                .id(usuario.getId())
                .username(usuario.getUsername())
                .email(usuario.getEmail())
                .idCliente(usuario.getIdCliente())
                .activo(usuario.isActivo())
                .roles(roles)
                .build();
    }
}
