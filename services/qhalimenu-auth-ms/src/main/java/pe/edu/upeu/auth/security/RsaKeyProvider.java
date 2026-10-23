package pe.edu.upeu.auth.security;

import com.nimbusds.jose.jwk.RSAKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Slf4j
@Component
public class RsaKeyProvider {

    private final RSAKey rsaKey;

    public RsaKeyProvider(
            @Value("${qhalimenu.jwt.private-key:}") String privateKeyPem,
            @Value("${qhalimenu.jwt.public-key:}") String publicKeyPem) {
        if (StringUtils.hasText(privateKeyPem) && StringUtils.hasText(publicKeyPem)) {
            this.rsaKey = construirDesdePem(privateKeyPem, publicKeyPem);
            log.info("Claves JWT RSA cargadas desde la configuracion (kid={})", rsaKey.getKeyID());
        } else {
            this.rsaKey = generarEfimeras();
            log.warn("No se configuraron JWT_PRIVATE_KEY/JWT_PUBLIC_KEY. Se genero un par de claves RSA "
                    + "efimero para desarrollo; los tokens dejaran de ser validos al reiniciar el servicio.");
        }
    }

    public RSAKey getRsaKey() {
        return rsaKey;
    }

    public RSAKey getPublicRsaKey() {
        return rsaKey.toPublicJWK();
    }

    private RSAKey construirDesdePem(String privateKeyPem, String publicKeyPem) {
        try {
            RSAPrivateKey privateKey = (RSAPrivateKey) KeyFactory.getInstance("RSA")
                    .generatePrivate(new PKCS8EncodedKeySpec(decodificarPem(privateKeyPem)));
            RSAPublicKey publicKey = (RSAPublicKey) KeyFactory.getInstance("RSA")
                    .generatePublic(new X509EncodedKeySpec(decodificarPem(publicKeyPem)));
            return new RSAKey.Builder(publicKey)
                    .privateKey(privateKey)
                    .keyID(keyId(publicKey))
                    .build();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudieron cargar las claves RSA desde las variables de entorno", ex);
        }
    }

    private RSAKey generarEfimeras() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair keyPair = generator.generateKeyPair();
            RSAPublicKey publicKey = (RSAPublicKey) keyPair.getPublic();
            RSAPrivateKey privateKey = (RSAPrivateKey) keyPair.getPrivate();
            return new RSAKey.Builder(publicKey)
                    .privateKey(privateKey)
                    .keyID(keyId(publicKey))
                    .build();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo generar el par de claves RSA efimero", ex);
        }
    }

    private byte[] decodificarPem(String pem) {
        String normalizado = pem
                .replace("\\n", "\n")
                .replaceAll("-----BEGIN [^-]+-----", "")
                .replaceAll("-----END [^-]+-----", "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(normalizado);
    }

    private String keyId(RSAPublicKey publicKey) {
        try {
            return new RSAKey.Builder(publicKey).build().computeThumbprint().toString();
        } catch (Exception ex) {
            return "qhalimenu-auth-key";
        }
    }
}
