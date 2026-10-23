package pe.edu.upeu.auth.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import pe.edu.upeu.auth.entity.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private final RsaKeyProvider rsaKeyProvider;
    private final NimbusJwtEncoder encoder;
    private final String issuer;
    private final Duration expiration;

    public JwtService(RsaKeyProvider rsaKeyProvider,
                      @Value("${qhalimenu.jwt.issuer:qhalimenu-auth-ms}") String issuer,
                      @Value("${qhalimenu.jwt.expiracion-segundos:3600}") long expiracionSegundos) {
        this.rsaKeyProvider = rsaKeyProvider;
        this.issuer = issuer;
        this.expiration = Duration.ofSeconds(expiracionSegundos);
        JWKSource<SecurityContext> jwkSource = new ImmutableJWKSet<>(new JWKSet(rsaKeyProvider.getRsaKey()));
        this.encoder = new NimbusJwtEncoder(jwkSource);
    }

    public String generarToken(Usuario usuario) {
        Instant ahora = Instant.now();
        List<String> roles = usuario.getRoles().stream().map(rol -> rol.getNombre()).sorted().toList();

        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(ahora)
                .expiresAt(ahora.plus(expiration))
                .subject(usuario.getUsername())
                .id(UUID.randomUUID().toString())
                .claim("roles", roles);

        if (usuario.getIdCliente() != null) {
            claims.claim("idCliente", usuario.getIdCliente());
        }

        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    public Map<String, Object> obtenerJwks() {
        return new JWKSet(rsaKeyProvider.getPublicRsaKey()).toJSONObject();
    }

    public long getExpiracionSegundos() {
        return expiration.getSeconds();
    }
}
