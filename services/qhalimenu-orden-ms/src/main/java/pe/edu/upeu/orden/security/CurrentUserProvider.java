package pe.edu.upeu.orden.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserProvider {

    public Long getIdCliente() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            Jwt jwt = jwtToken.getToken();
            if (jwt == null) {
                return null;
            }
            Object claim = jwt.getClaim("idCliente");
            if (claim instanceof Number number) {
                return number.longValue();
            }
            if (claim instanceof String str && !str.isBlank()) {
                try {
                    return Long.parseLong(str);
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    public String getIdClienteString() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            Jwt jwt = jwtToken.getToken();
            if (jwt == null) {
                return null;
            }
            Object claim = jwt.getClaim("idCliente");
            if (claim != null) {
                return claim.toString();
            }
            if (jwt.getSubject() != null) {
                return jwt.getSubject();
            }
        }
        return null;
    }

    public String getUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            Jwt jwt = jwtToken.getToken();
            if (jwt != null && jwt.getSubject() != null) {
                return jwt.getSubject();
            }
        }
        if (authentication != null && authentication.getName() != null) {
            return authentication.getName();
        }
        return null;
    }

    public String getNombre() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            Jwt jwt = jwtToken.getToken();
            if (jwt != null) {
                String name = jwt.getClaimAsString("name");
                if (name != null && !name.isBlank()) {
                    return name.trim();
                }
                String given = jwt.getClaimAsString("given_name");
                String family = jwt.getClaimAsString("family_name");
                if (given != null && !given.isBlank()) {
                    return (given + " " + (family == null ? "" : family)).trim();
                }
                String preferred = jwt.getClaimAsString("preferred_username");
                if (preferred != null && !preferred.isBlank()) {
                    return preferred.trim();
                }
            }
        }
        String username = getUsername();
        return username == null || username.isBlank() ? "Cliente" : username;
    }
}
