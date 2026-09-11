# Avance S3 — Registro y descubrimiento (Eureka)

Documento de la sesión S3 para **QhaliMenu**. El producto integrado de Unidad I está en [u1-producto.md](u1-producto.md).

- Eureka Server: `qhalimenu-eureka` en `18761`, Config Client, no se registra a sí mismo.
- Clientes Eureka: `qhalimenu-catalogo-ms` (`8080`/`8081`), `qhalimenu-orden-ms` (`8082`/`8083`), `qhalimenu-cliente-ms` (`8084`/`8085`) y `qhalimenu-pago-ms` (`8086`/`8087`).
- `instance-id` DEV: `${spring.application.name}:${server.port}`.
- Self-preservation desactivada solo en DEV.

Dashboard: `http://localhost:18761`.
