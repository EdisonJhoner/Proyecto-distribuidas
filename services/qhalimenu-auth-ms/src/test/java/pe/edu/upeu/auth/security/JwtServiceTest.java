package pe.edu.upeu.auth.security;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.SignedJWT;
import pe.edu.upeu.auth.entity.Rol;
import pe.edu.upeu.auth.entity.Usuario;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private final RsaKeyProvider rsaKeyProvider = new RsaKeyProvider("", "");
    private final JwtService jwtService = new JwtService(rsaKeyProvider, "qhalimenu-auth-ms", 3600);

    @Test
    void generaUnTokenFirmadoConLasClaimsEsperadas() throws Exception {
        Usuario usuario = Usuario.builder()
                .username("cliente1")
                .idCliente(1L)
                .roles(Set.of(Rol.builder().nombre("CLIENTE").build()))
                .build();

        String token = jwtService.generarToken(usuario);

        SignedJWT signedJWT = SignedJWT.parse(token);
        assertTrue(signedJWT.verify(new RSASSAVerifier(rsaKeyProvider.getPublicRsaKey().toRSAPublicKey())));

        assertEquals("qhalimenu-auth-ms", signedJWT.getJWTClaimsSet().getIssuer());
        assertEquals("cliente1", signedJWT.getJWTClaimsSet().getSubject());
        assertEquals(List.of("CLIENTE"), signedJWT.getJWTClaimsSet().getStringListClaim("roles"));
        assertEquals(1L, ((Number) signedJWT.getJWTClaimsSet().getClaim("idCliente")).longValue());
    }

    @Test
    void elJwksExponeUnaClavePublica() {
        var jwks = jwtService.obtenerJwks();

        assertFalse(((List<?>) jwks.get("keys")).isEmpty());
        var key = (java.util.Map<?, ?>) ((List<?>) jwks.get("keys")).get(0);
        assertEquals("RSA", key.get("kty"));
    }
}
