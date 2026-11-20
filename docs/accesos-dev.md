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
| Grafana | <http://localhost:13000> | `admin` / `admin` (S10) |
| Prometheus | <http://localhost:19090> | Targets: `/targets` |
| Loki | <http://localhost:13100> | Logs vía Grafana |
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

En el **carrito** solo se muestran dos métodos de pago:

| Método | Comportamiento |
|---|---|
| **Efectivo** | Crea la orden con código QR y el pago queda `PENDIENTE`; la orden aparece en la cola de **Caja** como "por cobrar" y el `CAJA` confirma el cobro (o un `ADMIN` si hace falta). |
| **Mercado Pago** | Crea la preferencia en `qhalimenu-pago-ms` y lleva el navegador al checkout de Mercado Pago. Ahí solo se ofrecen **tarjetas (crédito/débito) y Yape**; la preferencia excluye billetera/dinero en cuenta, transferencias bancarias (“Banca y agentes”), ATM, prepago, tickets y cuotas sin tarjeta. Verificado en el checkout sandbox. La orden queda `PENDIENTE` hasta que MP confirma; luego vuelve a `/pago-retorno` y se muestra la boleta. Sin token configurado se usa un checkout simulado local con Tarjeta, Yape y Plin. |

> **Plin:** Mercado Pago Perú no ofrece Plin en Checkout Pro (su lista de medios de pago
> solo incluye Yape como billetera/transferencia), por eso no puede aparecer en la
> pantalla real de MP. En el checkout simulado de respaldo sí se mantiene como opción.

### Conectar Mercado Pago en modo PRUEBA (sin producción)

1. Entra a https://www.mercadopago.com.pe/developers/panel/app con tu cuenta y selecciona tu aplicación (o crea una).
2. Arriba, en el selector de entorno, elige **Prueba** (nunca **Producción**).
3. En el menú lateral **Credenciales**, copia el **Access Token** del entorno Prueba.
   - Hoy empieza con `APP_USR-` también en prueba; lo que define el entorno es el selector, no el prefijo.
   - La **Public Key** no se necesita: el checkout es una redirección (Checkout Pro) y el token solo vive en el backend.
4. Guárdalo como variable de entorno (no lo escribas en el repo):

   ```powershell
   setx MERCADOPAGO_ACCESS_TOKEN "APP_USR-TU-TOKEN-DE-PRUEBA"
   ```

   Luego reinicia solo ese microservicio con:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\configurar-mercadopago.ps1
   ```

   El script lee la variable del registro de Windows (no del proceso actual),
   por eso funciona aunque la ventana de `pago-ms` ya estuviera abierta.
5. El pago queda `PENDIENTE`; al aprobarse en MP, pulsa **"Volver al sitio"** en la
   pantalla de Mercado Pago (en DEV no usamos `auto_return` porque MP solo lo permite
   con URLs HTTPS públicas). El navegador vuelve a `http://localhost:4200/pago-retorno`,
   se consulta `/api/v1/pagos/feedback` y la orden pasa a `PAGADA`.
6. El webhook `/api/v1/pagos/webhook` está habilitado en el gateway, pero MP no puede
   llamar a `localhost` desde internet; en la demo basta el retorno del navegador.

> Si no hay token (o es el placeholder), el sistema sigue funcionando con el checkout simulado. **No configures nunca un token de Producción en esta entrega.**

Reglas del flujo:

1. `POST /api/v1/ordenes` guarda `metodoPago` = `EFECTIVO`, `TARJETA` o `MERCADOPAGO`.
2. Kafka `orden-eventos` -> `qhalimenu-pago-ms` registra el pago.
   - `TARJETA` en modo simulación se aprueba automáticamente.
   - `EFECTIVO` y `MERCADOPAGO` **nunca** se aprueban solos: quedan `PENDIENTE`.
3. `TARJETA` / `MERCADOPAGO`: el frontend llama `POST /api/v1/pagos/crear-preferencia`
   (idempotente por `ordenId`, no duplica pagos). Con token real se redirige al
   `sandbox_init_point` de la preferencia; sin token se confirma la simulación con
   `GET /api/v1/pagos/simulacion/{preferenceId}` o se usa el checkout simulado.
4. Kafka `pago-eventos` -> `qhalimenu-orden-ms` cambia la orden a `PAGADA`.
5. El `CAJA` confirma el efectivo desde **Caja -> Cobrar efectivo**, mediante
   `POST /api/v1/pagos/orden/{ordenId}/confirmar-efectivo` (también existe
   `POST /api/v1/pagos/{pagoId}/confirmar` para `ADMIN`/`CAJA`). Esto publica
   `pago.validado` y la orden pasa a `PAGADA`, habilitando la entrega. No se
   requiere intervención de administración.

Los datos de tarjeta se validan en el navegador y **no se envían al backend**;
el pago es una simulación de demostración.

## Flujo verificado de extremo a extremo

1. Login desde el frontend contra Keycloak (Authorization Code + PKCE).
2. `GET /api/v1/productos` público a través del gateway.
3. **Ordenar -> Efectivo o Tarjeta** en el modal de pago.
4. `POST /api/v1/ordenes` con token `CLIENTE` -> orden creada con `idCliente` = `sub` del JWT.
5. Kafka `orden-eventos` -> `qhalimenu-pago-ms` registra el pago con el método elegido.
6. Tarjeta: `crear-preferencia` + confirmación de simulación -> `pago.validado`.
   Mercado Pago: `crear-preferencia` -> checkout de MP -> retorno `/pago-retorno` -> `feedback` -> `pago.validado`.
7. Kafka `pago-eventos` -> `qhalimenu-orden-ms` cambia la orden a `PAGADA`.
8. Efectivo: el pago queda `PENDIENTE`, la orden aparece en Caja con su QR; el `CAJA` cobra y confirma y entonces la orden pasa a `PAGADA`.
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

- Observabilidad S10: Prometheus + Loki + Promtail + Grafana en `obs/`.
  El tablero se arma en Grafana como en la guía del ingeniero
  (`S10 - Diagnóstico`). No hay Tempo.
- El realm `qhalimenu`, sus roles y usuarios se configuraron sobre la instancia
  en ejecución y persisten en el volumen Docker de Keycloak. **No hay un export
  del realm versionado en el repositorio**, así que un Keycloak desde cero
  requiere recrear realm/cliente/roles/usuarios.
- `qhalimenu-auth-ms` sigue levantado como legado, pero los tokens válidos para
  el resto del sistema los emite Keycloak.
- Los contenedores `pagatu-*` que puedan seguir activos pertenecen a otro
  proyecto y no participan en QhaliMenu.
