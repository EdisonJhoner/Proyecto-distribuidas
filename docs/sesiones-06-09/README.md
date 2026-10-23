# Sesiones 06-09 — QhaliMenu

Documentación de las sesiones 6 a 9 del sistema distribuido **QhaliMenu — Reserva anticipada de almuerzos**.

| Sesión | Tema | Documento |
|---|---|---|
| 6 | Comunicación síncrona resiliente (OpenFeign + Circuit Breaker) | [sesion-06-comunicacion-sincrona.md](sesion-06-comunicacion-sincrona.md) |
| 7 | Seguridad con JWT (RS256 / JWKS) | [sesion-07-seguridad-jwt.md](sesion-07-seguridad-jwt.md) |
| 8 | Mensajería asíncrona con Apache Kafka | [sesion-08-mensajeria-kafka.md](sesion-08-mensajeria-kafka.md) |
| 9 | Patrón SAGA coreografiado (+ Outbox y reconciliación) | [sesion-09-saga-coreografiada.md](sesion-09-saga-coreografiada.md) |

Producto de Unidad I: [../u1-producto.md](../u1-producto.md). Registro Eureka (S3): [../avance-s3-eureka.md](../avance-s3-eureka.md).

## Stack

- Java 21, Spring Boot 4.0.7, Spring Cloud 2025.1.2.
- PostgreSQL (una base por microservicio), Apache Kafka 3.8.1 (KRaft) + Kafka UI.
- Spring Security 7 / OAuth2 Resource Server, OpenFeign, Resilience4j, Spring Kafka.

## Módulos

| Componente | Ruta | Puerto DEV |
|---|---|---|
| Config Server | `infra/qhalimenu-config` | `18888` |
| Eureka Server | `infra/qhalimenu-eureka` | `18761` |
| API Gateway | `infra/qhalimenu-gateway` | `18080` |
| Catálogo | `services/qhalimenu-catalogo-ms` | `8080` |
| Órdenes | `services/qhalimenu-orden-ms` | `8082` |
| Cliente | `services/qhalimenu-cliente-ms` | `8084` |
| Pago | `services/qhalimenu-pago-ms` | `8086` |
| Auth | `services/qhalimenu-auth-ms` | `8088` |
| Kafka (broker) | `infra/kafka/compose-dev.yml` | `19092` (UI `18085`) |

## Estado de pruebas (verificado)

| Módulo | Suites | Resultado |
|---|---|---|
| `qhalimenu-orden-ms` | 29 | OK |
| `qhalimenu-pago-ms` | 15 | OK |
| `qhalimenu-cliente-ms` | 7 | OK |
| `qhalimenu-auth-ms` | 5 | OK |
| `qhalimenu-catalogo-ms` | 1 | OK |
| `qhalimenu-gateway` | 1 | OK |
