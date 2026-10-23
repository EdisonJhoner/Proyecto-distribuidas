package pe.edu.upeu.cliente.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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

    public boolean esAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
