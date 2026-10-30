package pe.edu.upeu.pago.security;

import java.util.Collection;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class PagoSecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info", "/swagger-ui/**",
                                "/swagger-ui.html", "/v3/api-docs/**")
                        .permitAll()
                        .requestMatchers("/saludo").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/pagos/simulacion/**").permitAll()
                        .requestMatchers("/api/v1/pagos/feedback").permitAll()
                        .requestMatchers("/api/v1/pagos/webhook").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/pagos").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/pagos/orden/**").hasAnyRole("CLIENTE", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/pagos/crear-preferencia")
                        .hasAnyRole("CLIENTE", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/pagos/*/confirmar").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/pagos/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new RolesClaimConverter());
        return converter;
    }

    static class RolesClaimConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

        @Override
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            java.util.Collection<String> roles = new java.util.ArrayList<>();
            Object realmAccess = jwt.getClaim("realm_access");
            if (realmAccess instanceof java.util.Map<?, ?> map) {
                Object realmRoles = map.get("roles");
                if (realmRoles instanceof Collection<?> list) {
                    list.forEach(rol -> roles.add(String.valueOf(rol)));
                }
            }
            List<String> directRoles = jwt.getClaimAsStringList("roles");
            if (directRoles != null) {
                roles.addAll(directRoles);
            }
            return roles.stream()
                    .distinct()
                    .map(rol -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + rol))
                    .toList();
        }
    }
}
