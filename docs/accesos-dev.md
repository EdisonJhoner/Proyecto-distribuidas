# QhaliMenu - Accesos del entorno DEV

Estado verificado: **2026-10-29** (todo levantado y probado en esta máquina).

## URLs

| Componente | URL | Credenciales / notas |
|---|---|---|
| Frontend Angular | <http://localhost:4200> | Login vía Keycloak (PKCE) |
| API Gateway | <http://localhost:18080> | Punto único de entrada a los microservicios |
| Eureka | <http://localhost:18761> | Consola de registro |
| Config Server | <http://localhost:18888> | `http://localhost:18888/qhalimenu-gateway/dev` |
| Keycloak | <http://localhost:18180> | Consola admin: `admin` / `admin123` |
| Keycloak health | <http://localhost:19000/health/ready> | |
| Kafka UI | <http://localhost:18085> | Cluster `qhalimenu`, broker `19092` |
| Swagger Catálogo | <http://localhost:8080/swagger-ui.html> | |
| Swagger Orden | <http://localhost:8082/swagger-ui.html> | |
| Swagger Cliente | <http://localhost:8084/swagger-ui.html> | |
| Swagger Pago | <http://localhost:8086/swagger-ui.html> | |
| Swagger Auth (legado) | <http://localhost:8088/swagger-ui.html> | |

OpenAPI JSON: `http://localhost:<puerto>/v3/api-docs` en cada servicio.

## Usuarios de Keycloak (realm `qhalimenu`)

| Usuario | Contraseña | Rol |
|---|---|---|
| `cliente1` | `Cliente123!` | `CLIENTE` |
| `cli2` | `Cliente123!` | `CLIENTE` |
| `admin` | `Admin123!` | `ADMIN` |

Cliente OIDC: `qhalimenu-frontend` (público, Authorization Code + PKCE S256,
`directAccessGrantsEnabled=false`). Redirect permitido: `http://localhost:4200/*`.

## Métodos de pago (frontend)

Al pulsar **Ordenar** en el catálogo se abre un modal para elegir cómo pagar:

| Método | Comportamiento |
|---|---|
| **Efectivo** | Crea la orden y el pago queda `PENDIENTE`; la orden queda `PENDIENTE_PAGO` hasta que un `ADMIN` confirme el cobro. |
| **Tarjeta** | Pide número (16 dígitos), titular, vencimiento `MM/AA` y CVV; crea la orden y procesa el pago (simulado si no hay token real de MercadoPago). La orden pasa a `PAGADA`. |

Reglas del flujo:

1. `POST /api/v1/ordenes` guarda `metodoPago` = `EFECTIVO` o `TARJETA`.
2. Kafka `orden-eventos` -> `qhalimenu-pago-ms` registra el pago.
   - `TARJETA` en modo simulación se aprueba automáticamente.
   - `EFECTIVO` **nunca** se aprueba solo: queda `PENDIENTE`.
3. `TARJETA`: el frontend llama `POST /api/v1/pagos/crear-preferencia`
   (idempotente por `ordenId`, no duplica pagos) y confirma la simulación con
   `GET /api/v1/pagos/simulacion/{preferenceId}`.
4. Kafka `pago-eventos` -> `qhalimenu-orden-ms` cambia la orden a `PAGADA`.
5. Un `ADMIN` confirma el efectivo con
   `POST /api/v1/pagos/{pagoId}/confirmar` desde **Mis órdenes -> Pagos en
   efectivo pendientes** (o por API). Esto publica `pago.validado` y la orden
   pasa a `PAGADA`.

Los datos de tarjeta se validan en el navegador y **no se envían al backend**;
el pago es una simulación de demostración.

## Flujo verificado de extremo a extremo

1. Login desde el frontend contra Keycloak (Authorization Code + PKCE).
2. `GET /api/v1/productos` público a través del gateway.
3. **Ordenar -> Efectivo o Tarjeta** en el modal de pago.
4. `POST /api/v1/ordenes` con token `CLIENTE` -> orden creada con `idCliente` = `sub` del JWT.
5. Kafka `orden-eventos` -> `qhalimenu-pago-ms` registra el pago con el método elegido.
6. Tarjeta: `crear-preferencia` + confirmación de simulación -> `pago.validado`.
7. Kafka `pago-eventos` -> `qhalimenu-orden-ms` cambia la orden a `PAGADA`.
8. Efectivo: el pago queda `PENDIENTE`; el `ADMIN` lo confirma y entonces la orden pasa a `PAGADA`.
9. `GET /api/v1/ordenes/mis-ordenes` muestra estado, método de pago y total.
10. Logout contra Keycloak y regreso a la pantalla pública.

Autorización comprobada en el gateway:

| Petición | Sin token | `CLIENTE` | `ADMIN` |
|---|---|---|---|
| `GET /api/v1/productos` | 200 | 200 | 200 |
| `GET /api/v1/ordenes/mis-ordenes` | 401 | 200 | 200 |
| `GET /api/v1/ordenes` | 401 | 403 | 200 |
| `GET /api/v1/clientes` | 401 | 403 | 200 |
| `GET /api/v1/pagos` | 401 | 403 | 200 |
| `POST /api/v1/pagos/{id}/confirmar` | 401 | 403 | 200 |

## Pruebas ejecutadas

| Módulo | Resultado |
|---|---|
| `qhalimenu-auth-ms` | 5/5 OK |
| `qhalimenu-catalogo-ms` | 1/1 OK |
| `qhalimenu-gateway` | 1/1 OK |
| `qhalimenu-orden-ms` | 29/29 OK |
| `qhalimenu-cliente-ms` | 7/7 OK |
| `qhalimenu-pago-ms` | 17/17 OK |
| Frontend (Karma/ChromeHeadless) | 2/2 OK |
| `npm run build` (Angular) | OK |

## Inicio y detención

```powershell
# Desde la raíz del repositorio
powershell -ExecutionPolicy Bypass -File .\start-project.ps1
```

El script levanta PostgreSQL, Kafka + Kafka UI, Keycloak, Config Server, Eureka,
Gateway, los cinco microservicios y el frontend Angular.

Para detener: `Ctrl+C` en cada ventana, o cerrar las ventanas.

## Limitaciones conocidas

- **No existe stack de observabilidad** (Grafana/Prometheus/Loki/Tempo) en este
  repositorio. No hay URL de Grafana. Lo único disponible es Kafka UI.
- El realm `qhalimenu`, sus roles y usuarios se configuraron sobre la instancia
  en ejecución y persisten en el volumen Docker de Keycloak. **No hay un export
  del realm versionado en el repositorio**, así que un Keycloak desde cero
  requiere recrear realm/cliente/roles/usuarios.
- `qhalimenu-auth-ms` sigue levantado como legado, pero los tokens válidos para
  el resto del sistema los emite Keycloak.
- Los contenedores `pagatu-*` que puedan seguir activos pertenecen a otro
  proyecto y no participan en QhaliMenu.
