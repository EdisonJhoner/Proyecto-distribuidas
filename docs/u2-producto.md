# Distribuidas - Producto de Unidad 2 — QhaliMenu

**Plantilla del producto de Unidad 2**, adaptada al dominio de **QhaliMenu** (reserva anticipada de almuerzos). La estructura (comunicación resiliente, seguridad distribuida, mensajería asíncrona, consistencia distribuida, observabilidad, integración frontend) es la exigida por el sílabo. El contenido de `pagatu` se reemplazó por el sistema real de este repositorio.

Producto de Unidad I: [u1-producto.md](u1-producto.md). Accesos DEV verificados: [accesos-dev.md](accesos-dev.md).

## Producto

**Sistema distribuido seguro, resiliente, consistente, observable e integrado con cliente frontend.**

QhaliMenu fortalece el sistema base de Unidad I con comunicación síncrona resiliente (OpenFeign + Circuit Breaker), seguridad distribuida (Keycloak OIDC + JWT en Gateway y microservicios), mensajería asíncrona (Kafka), consistencia eventual (SAGA coreografiada + Outbox + idempotencia), trazas/`health` por servicio e integración frontend Angular que consume la API **solo** a través del Gateway.

Equipo: Edison Jhoner Paye Mamani · Jhosef Giampiere Cuadros Flores.

## 1. Alcance de capacidades por sesión

**Tabla 1. De la sesión a la capacidad del sistema QhaliMenu**

| Sesión | Capacidad que agrega | Implementación en QhaliMenu |
|---|---|---|
| S6 | Comunicación síncrona resiliente entre servicios (respuesta controlada ante fallos). | `qhalimenu-orden-ms` llama a `qhalimenu-catalogo-ms` y `qhalimenu-cliente-ms` por OpenFeign (`name` lógico en Eureka, no URL fija). `CatalogoResiliente` / `ClienteResiliente` envuelven la llamada con Circuit Breaker. Si catálogo cae, la creación de la orden responde `ServicioNoDisponibleException` (no se cuelga ni deja una orden con precios inventados). |
| S7 / S07b | Seguridad distribuida y protección de rutas. | S7: `qhalimenu-auth-ms` emitía JWT RS256 + JWKS. S07b: Keycloak (`realm qhalimenu`, `:18180`) es el emisor real. Gateway, `orden-ms`, `cliente-ms` y `pago-ms` son Resource Server con `issuer-uri` de Keycloak. Cada MS valida el token (no solo el Gateway). `idCliente` pasó de `Long` a `String` (`sub` del JWT). `auth-ms` queda como legado. |
| S8 | Mensajería asíncrona entre servicios desacoplados. | `orden-ms` publica `orden.creada` en el topic `orden-eventos`. `pago-ms` lo consume y registra el pago. `pago-ms` publica `pago.validado` / `pago.fallido` en `pago-eventos`. `orden-ms` lo consume y cambia el estado. No hay llamada REST orden→pago para ese flujo. DLT: `orden-eventos.DLT`, `pago-eventos.DLT`. |
| S9 | Consistencia eventual, compensación e idempotencia. | SAGA coreografiada: orden nace `PENDIENTE_PAGO`; pago `PROCESADO` → `PAGADA`; pago `RECHAZADO` o timeout → `CANCELADA`. Outbox en la misma transacción. Idempotencia: un segundo `orden.creada` no duplica el `Pago`; un evento tardío no cancela una orden ya `PAGADA`. Efectivo no se auto-aprueba: un `ADMIN` confirma el cobro. |
| S10 | Observabilidad operacional: logs, health, métricas y paneles. | Carpeta `obs/` como en pagatu: Prometheus `:19090` (descubre por Eureka + target estático de Keycloak), Loki `:13100`, Promtail, Grafana `:13000` (`admin`/`admin`). Health groups liveness/readiness. `FeignTraceConfig` propaga `X-Trace-ID` orden→catálogo. |
| S11 | Integración con cliente frontend mediante el Gateway. | Angular 19 en `:4200`. Todas las llamadas van a `http://localhost:18080`. Login Authorization Code + PKCE (`keycloak-js`, client `qhalimenu-frontend`). Token en memoria (no `localStorage`). Catálogo público; ordenar y “Mis órdenes” exigen rol `CLIENTE`; confirmar efectivo exige `ADMIN`. |
| S12 (esta evaluación) | Ensambla todo lo anterior y lo sustenta. | Este documento + demo en vivo (sección 4) + diapositivas de alcance, arquitectura y asignación. |

Lo que se sustenta en S12 es **QhaliMenu**, no el dominio de `pagatu`.

## 2. Rúbrica de Evaluación

**Tabla 2. Rúbrica de evaluación de la Unidad 2** (cita de la plantilla oficial; no se altera)

| Criterio | Peso | CE / Nivel | A (20 pts) | B (15 pts) | C (10 pts) | D (5 pts) | Calificación obtenida |
|---|---:|---|---|---|---|---|---:|
| 1. Comunicación entre servicios con respuesta controlada ante fallos | 12% | CE023-N3 | Timeout, reintentos y *fallback* verificados en vivo ante una caída provocada. | Mecanismo presente, verificado parcialmente. | Mecanismo definido, sin verificación clara ante fallo real. | No implementa respuesta controlada ante fallos. | |
| 2. Seguridad distribuida y protección de rutas | 16% | CE023-N3 | Autenticación y autorización verificadas en todos los microservicios propios, no solo en el Gateway. | Seguridad verificada en la mayoría de los servicios. | Seguridad presente solo en el Gateway o parcial. | No implementa seguridad distribuida. | |
| 3. Mensajería asíncrona entre servicios desacoplados | 16% | CE023-N3 | Evento de negocio publicado y consumido, con los dos servicios verificados de forma independiente (no acoplados). | Mensajería funcional, con acoplamiento parcial. | Mensajería definida, sin verificación clara del desacople. | No implementa mensajería asíncrona. | |
| 4. Consistencia eventual, compensación e idempotencia en procesos de negocio | 16% | CE023-N3 | Proceso de negocio probado con fallo parcial y reprocesamiento del mismo evento, sin inconsistencia ni duplicidad. | Consistencia verificada parcialmente (uno de los dos casos: compensación o idempotencia). | Consistencia mencionada, sin caso de prueba real. | No evidencia consistencia distribuida. | |
| 5. Logs, health, métricas y paneles de diagnóstico | 12% | CE023-N3 | Panel de diagnóstico operativo con métricas, logs y health checks correlacionados entre servicios. | Panel operativo, con correlación parcial entre servicios. | Métricas o logs presentes, sin panel ni correlación. | No presenta observabilidad verificable. | |
| 6. Cliente frontend integrado mediante Gateway | 8% | CE023-N3 | Cliente funcional que consume la API completa solo a través del Gateway, con sesión y rutas protegidas según rol. | Cliente funcional, con alguna llamada fuera del Gateway o protección parcial. | Cliente parcialmente integrado. | No presenta cliente frontend integrado. | |
| 7. Sustentación | 20% | CG | Sustenta con claridad y profesionalismo su aporte individual, respondiendo con precisión las preguntas del jurado. | Sustenta con solvencia, con detalles menores en claridad, orden o precisión. | Sustenta con dificultad; claridad, orden o precisión insuficientes. | No sustenta adecuadamente ni demuestra su aporte individual. | |

Nota final = suma de (`Peso` × `Puntos de la calificación obtenida`) / 100 × 20.

`CE023-N3` = Nivel 3 de la competencia CE023 (Programación). `CG` = Competencia General "Carácter y Aprendizaje Autónomo" del sílabo.

**Tabla 3. Subaspectos de la sustentación (Unidad 2)**

| Subaspecto | Qué observa en Unidad 2 — evidencia QhaliMenu |
|---|---|
| 1. Aporte individual | Cada integrante demuestra al menos una capacidad de la Tabla 1 (ver asignación, sección 4.8). |
| 2. Comunicación y orden | Tres diapositivas grupales (alcance, arquitectura, tareas) + demo de 3 min por integrante. |
| 3. Presentación personal y actitud | Puntualidad, vestimenta adecuada, actitud profesional. |
| 4. Repositorio y estándares | Código en `infra/`, `services/`, `clients/`, `keycloak/`, `docs/`. Arranque: `start-project.ps1`. |
| 5. MkDocs o equivalente | Documentación Markdown en `docs/` (este archivo + sesiones 6-9 + accesos-dev). Publicar en MkDocs queda como mejora de Unidad III si el docente lo exige navegable. |
| 6. Pitch/demo ejecutiva | Qué cambió desde Unidad I: Keycloak, Kafka, SAGA, frontend Angular, efectivo vs tarjeta. |

## 3. Trazabilidad y procedencia de la rúbrica

Los primeros seis criterios son cita literal de los criterios de evaluación del producto de la Unidad II en el sílabo de Desarrollo de Aplicaciones Distribuidas; el séptimo (Sustentación) corresponde a la sustentación exigida por el mismo sílabo (sesión 12, actividad 2).

**Con la malla curricular:** estos criterios profundizan la porción de plataforma distribuida del **Nivel 3 de CE023** (Programación) que Unidad 1 dejó como base. El criterio 7 (Sustentación) es transversal y no forma parte de la definición de la competencia.

## 4. Evidencia del sistema QhaliMenu (para la demo de S12)

Esta sección no está en la plantilla de `pagatu`: documenta **cómo se verifica en vivo** cada capacidad, con rutas y comportamiento reales del código.

### 4.1 Comunicación resiliente (S6)

- Cliente Feign: `services/qhalimenu-orden-ms/.../client/CatalogoClient.java` (`@FeignClient(name = "qhalimenu-catalogo-ms")`).
- Envoltorio: `resilience/CatalogoResiliente.java` — `circuitBreakerFactory.create("catalogo")`.
- Fallback: si catálogo no responde, lanza `ServicioNoDisponibleException` y **no persiste** la orden. El hilo no espera indefinido (timeout Feign + Circuit Breaker).
- Demo: con el sistema arriba, detener `qhalimenu-catalogo-ms` y pulsar **Ordenar** (o `POST /api/v1/ordenes`). Se espera error controlado, no 500 en cascada ni orden huérfana.

### 4.2 Seguridad distribuida (S7 / S07b)

Emisor activo: Keycloak `http://localhost:18180/realms/qhalimenu`.

| Petición | Sin token | `CLIENTE` | `ADMIN` |
|---|---|---|---|
| `GET /api/v1/productos` | 200 | 200 | 200 |
| `GET /api/v1/ordenes/mis-ordenes` | 401 | 200 | 200 |
| `GET /api/v1/ordenes` | 401 | 403 | 200 |
| `GET /api/v1/pagos` | 401 | 403 | 200 |
| `POST /api/v1/pagos/{id}/confirmar` | 401 | 403 | 200 |

La misma matriz se replica **dentro** de `OrdenSecurityConfig` y `PagoSecurityConfig`, no solo en el Gateway. `catalogo-ms` no tiene `SecurityFilterChain` (GET es público; las mutaciones deberían restringirse a `ADMIN` — deuda de Unidad III).

Usuarios DEV: `cliente1` / `Cliente123!` (`CLIENTE`), `admin` / `Admin123!` (`ADMIN`).

Migración S07b: Gateway y resource servers cambiaron `jwk-set-uri` de auth-ms por `issuer-uri` de Keycloak. Los claims de rol se leen de `realm_access.roles` (y del claim plano `roles`, compatibilidad S7). `idCliente` es el `sub` (String).

### 4.3 Mensajería asíncrona (S8)

| Topic | Productor | Consumidor | Evento |
|---|---|---|---|
| `orden-eventos` | `orden-ms` (Outbox) | `pago-ms` | `orden.creada` |
| `pago-eventos` | `pago-ms` (Outbox) | `orden-ms` | `pago.validado`, `pago.fallido` |

Broker: `localhost:19092`. Panel: Kafka UI `http://localhost:18085`.

Demo: crear una orden desde el frontend y ver el mensaje en `orden-eventos`, luego el de `pago-eventos`, sin que `orden-ms` llame por REST a `pago-ms`.

### 4.4 Consistencia (S9)

Estados de la orden: `PENDIENTE_PAGO` → `PAGADA` | `CANCELADA`.

- **Idempotencia:** `PagoService.registrarPagoDesdeOrden` ignora un segundo evento con el mismo `ordenId`. `OrdenService.aplicarResultadoPago` ignora eventos si la orden ya es terminal.
- **Compensación:** `pago.fallido` o reconciliador (15 min) pasan la orden a `CANCELADA`.
- **Outbox:** el evento se guarda en la misma transacción que el agregado; `OutboxPublisher` lo envía a Kafka cada 2 s.
- **Efectivo:** el pago queda `PENDIENTE` hasta `POST /api/v1/pagos/{id}/confirmar` (solo `ADMIN`).

Demo de idempotencia: reenviar el mismo JSON de `orden.creada` (o dejar que Kafka reintente); debe existir un solo `Pago` para esa orden.

### 4.5 Observabilidad (S10)

Igual que pagatu: `obs/compose-dev.yml` (Prometheus, Loki, Promtail, Grafana).

| Pieza | Dónde | Qué demuestra |
|---|---|---|
| Grafana | `http://localhost:13000` (`admin`/`admin`) | Tablero S10: `up`, tasa de peticiones, errores, logs |
| Prometheus | `http://localhost:19090/targets` | Microservicios por Eureka + Keycloak estático |
| Liveness / readiness | `/actuator/health/liveness` y `/readiness` | Proceso vivo vs listo (incluye `db`) |
| Trace | `FeignTraceConfig` + `X-Trace-ID` | Mismo `traceId` en `orden.log` y `catalogo.log` |
| Kafka UI | `:18085` | Eventos de la SAGA (no sustituye a Grafana) |

El tablero no viene precargado (en pagatu también se arma a mano en S10, Tabla 5).

### 4.6 Frontend (S11)

- App: `clients/qhalimenu-frontend` (Angular 19), `ng serve` → `:4200`.
- API: interceptor Bearer hacia `http://localhost:18080/api/v1/...` únicamente.
- Auth: `KeycloakService` — `onLoad: check-sso`, `pkceMethod: S256`. Token en el objeto Keycloak (memoria).
- Flujo: catálogo público → login → Ordenar (efectivo o tarjeta simulada) → Mis órdenes (polling 5 s). Un `ADMIN` confirma pagos en efectivo.

### 4.7 Decisión propia distinta a `pagatu`

1. **Dos métodos de pago de negocio:** `EFECTIVO` (caja, confirma `ADMIN`) y `TARJETA` (simulación MercadoPago). `pagatu` se centra en la pasarela.
2. **Outbox + reconciliador** encima de la SAGA coreografiada, para no perder eventos si Kafka está caído.
3. **`idCliente` = `sub` de Keycloak (UUID String)** en órdenes, en lugar de un Long de tabla propia. `cliente-ms` (compra exprés de U1) queda como ficha auxiliar.

### 4.8 Asignación para la sustentación

| Integrante | Capacidad que demuestra en vivo (3 min) | Evidencia |
|---|---|---|
| Jhosef Giampiere Cuadros Flores | S6 resiliencia + S9 consistencia en `orden-ms` | Caer catálogo al crear orden; estados `PENDIENTE_PAGO` / `PAGADA` / `CANCELADA` |
| Edison Jhoner Paye Mamani | S8 mensajería + S11 frontend (pago) | Kafka UI `orden-eventos`/`pago-eventos`; flujo Ordenar → tarjeta o efectivo desde Angular |
| Ambos | S7 seguridad | Matriz 401/403/200 en Gateway **y** en `orden-ms`/`pago-ms` |

Ajustar en la diapositiva de tareas si el equipo reparte distinto; cada uno debe ser dueño de **una** capacidad verificable.

### 4.9 Secuencia de demo (S12)

1. Pitch 30 s: desde U1 (Config/Eureka/Gateway) ahora hay Keycloak, Kafka, SAGA y Angular.
2. Caer `catalogo-ms` → crear orden → error controlado.
3. Token `CLIENTE` vs `ADMIN` en `/ordenes` y `/pagos`.
4. Crear orden → Kafka UI muestra `orden.creada` y luego `pago.validado`.
5. Reenviar el mismo evento / confirmar efectivo: un solo pago, orden a `PAGADA`.
6. Grafana `:13000` (servicios arriba + logs) y el mismo `traceId` en orden y catálogo.
7. Frontend: login PKCE, ordenar, ver “Mis órdenes” (no recargar).
8. Cerrar con la decisión propio (efectivo vs tarjeta, o Outbox).

## 5. Contrato y puertos que se usan en U2

El contrato REST de U1 se mantiene. Todo el tráfico de negocio entra por `qhalimenu-gateway` `:18080`.

| Componente | Puerto DEV | Rol en U2 |
|---|---|---|
| Gateway | `18080` | Único acceso + JWT |
| Catálogo | `8080` / `8081` | Lectura pública; Feign desde órdenes |
| Órdenes | `8082` / `8083` | Feign, Outbox, SAGA, `/mis-ordenes` |
| Cliente | `8084` / `8085` | Resource Server (ficha DNI) |
| Pago | `8086` / `8087` | Consumidor Kafka + simulación / efectivo |
| Auth (legado) | `8088` | JWT propio S7; ya no emite tokens del frontend |
| Keycloak | `18180` | IdP OIDC |
| Kafka / Kafka UI | `19092` / `18085` | Eventos de la SAGA |
| Frontend | `4200` | SPA Angular |

Arranque: `powershell -ExecutionPolicy Bypass -File .\start-project.ps1`.
