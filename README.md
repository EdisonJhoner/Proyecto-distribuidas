# QhaliMenu — Reserva anticipada de almuerzos

Sistema distribuido de reserva anticipada de almuerzos. Identidad oficial: **QhaliMenu**.

Producto de Unidad I: [docs/u1-producto.md](docs/u1-producto.md).

Producto de Unidad II (S12): [docs/u2-producto.md](docs/u2-producto.md).

Sesiones 6-9 (comunicación resiliente, seguridad JWT, Kafka, SAGA coreografiada): [docs/sesiones-06-09/](docs/sesiones-06-09/README.md).

## Componentes

| Componente | Ruta | Rol | Puerto DEV |
|---|---|---|---|
| `qhalimenu-config` | `infra/qhalimenu-config` | Config Server | `18888` |
| `qhalimenu-eureka` | `infra/qhalimenu-eureka` | Eureka Server | `18761` |
| `qhalimenu-gateway` | `infra/qhalimenu-gateway` | API Gateway + `lb://` | `18080` |
| `qhalimenu-catalogo-ms` | `services/qhalimenu-catalogo-ms` | Categorías y productos | `8080` / `8081` |
| `qhalimenu-orden-ms` | `services/qhalimenu-orden-ms` | Órdenes de reserva | `8082` / `8083` |
| `qhalimenu-cliente-ms` | `services/qhalimenu-cliente-ms` | Compra exprés (DNI + nombre + celular) | `8084` / `8085` |
| `qhalimenu-pago-ms` | `services/qhalimenu-pago-ms` | Pagos de órdenes | `8086` / `8087` |

Configuración centralizada: `infra/qhalimenu-config/config-repo/`.

Tema de acceso (login) de Keycloak: [`keycloak/themes/qhalimenu`](keycloak/themes/qhalimenu/README.md).

Bases de datos DEV: `qhalimenu_catalogo_db` (`15432`), `qhalimenu_orden_db` (`15434`), `qhalimenu_cliente_db` (`15436`) y `qhalimenu_pago_db` (`15438`). Usuario: `qhalimenu`.

## Requisitos

JDK 21 y Docker.

Si existían contenedores o volúmenes anteriores, recréalos para aplicar los nuevos nombres de BD:

```powershell
cd services\qhalimenu-catalogo-ms
docker compose -f compose-dev.yml down -v
```

## Inicio rápido (scripts)

La forma más sencilla de levantar todo (bases de datos + 7 servicios) es:

1. Doble clic en **`start-project.bat`** (Windows), o ejecuta:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start-project.ps1
   ```

   El script:
   - Levanta las 4 bases de datos PostgreSQL con `docker compose -f docker-compose.yml up -d`.
   - Abre una terminal independiente por servicio, en el orden correcto:
     Config Server → Eureka → Gateway → Catálogo → Órdenes → Clientes → Pagos.
   - Cada terminal espera a que su prerequisito (Config Server / Eureka) esté listo antes de arrancar.
   - Al final muestra el resumen de puertos y URLs de verificación.

2. Verifica el estado:

   | Qué | URL |
   |---|---|
   | Eureka (registros) | <http://localhost:18761> |
   | Config | <http://localhost:18888/qhalimenu-catalogo-ms/dev> |
   | Gateway | <http://localhost:18080/api/v1/productos> |
   | Swagger | <http://localhost:8080/swagger-ui.html> → 8082, 8084, 8086 |

> **Posible conflicto de puertos:** los contenedores `pagatu-*` que ya existan en la misma máquina ocupan los puertos `15432` (y otros). Si `docker compose up -d` falla, libera esos puertos o detén esos contenedores antes de levantar las bases de QhaliMenu.

### Arranque tolerante a fallos

Los módulos que consumen Config Server (`eureka`, `gateway`, `catalogo`, `orden`, `cliente`, `pago`, `auth`) tienen:

- `spring.config.import: "configserver:..."` **obligatorio** (sin prefijo `optional:`).
- `spring.cloud.config.fail-fast: true`, que es lo que habilita el reintento.
- `spring-retry` en el `pom.xml` y `spring.cloud.config.retry.*` en `application.yml`: 15 intentos con backoff de 1 s a 5 s (≈60 s de ventana).
- `spring.devtools.restart.enabled: false`, para que un rebuild del IDE no reinicie el servicio en caliente y tumbe la cadena de arranque.

Si el Config Server aún no está listo, el servicio **espera y reintenta** en vez de morir con `Failed to configure a DataSource`. Si sigue caído al agotar los intentos, falla con un error explícito de Config Server (mejor diagnóstico que un `datasource.url` ausente).

Para volver al comportamiento anterior: quitar `spring-retry` del `pom.xml`, borrar `spring.cloud.config.fail-fast` y el bloque `spring.cloud.config.retry`, restaurar `optional:configserver:` en `spring.config.import` y poner `spring.devtools.restart.enabled: true` (también en los `*-dev.yml` del `config-repo`).

## Ejecución DEV

### 1. Bases de datos

```powershell
cd services\qhalimenu-catalogo-ms
docker compose -f compose-dev.yml up -d

cd ..\qhalimenu-orden-ms
docker compose -f compose-dev.yml up -d

cd ..\qhalimenu-cliente-ms
docker compose -f compose-dev.yml up -d

cd ..\qhalimenu-pago-ms
docker compose -f compose-dev.yml up -d
```

### 2. Config Server

```powershell
cd infra\qhalimenu-config
.\mvnw.cmd spring-boot:run
```

### 3. Eureka Server

```powershell
cd infra\qhalimenu-eureka
.\mvnw.cmd spring-boot:run
```

### 4. Catálogo (8080 y 8081)

```powershell
cd services\qhalimenu-catalogo-ms
.\mvnw.cmd spring-boot:run

.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

### 5. Órdenes (8082 y 8083)

```powershell
cd services\qhalimenu-orden-ms
.\mvnw.cmd spring-boot:run

.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8083"
```

### 6. Clientes (8084 y 8085)

```powershell
cd services\qhalimenu-cliente-ms
.\mvnw.cmd spring-boot:run

.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8085"
```

### 7. Pagos (8086 y 8087)

```powershell
cd services\qhalimenu-pago-ms
.\mvnw.cmd spring-boot:run

.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8087"
```

### 8. Gateway

```powershell
cd infra\qhalimenu-gateway
.\mvnw.cmd spring-boot:run
```

## Verificación

- Config: `http://localhost:18888/qhalimenu-catalogo-ms/dev`, `/qhalimenu-orden-ms/dev`, `/qhalimenu-cliente-ms/dev` y `/qhalimenu-pago-ms/dev`
- Eureka: `http://localhost:18761` — `QHALIMENU-CATALOGO-MS`, `QHALIMENU-ORDEN-MS`, `QHALIMENU-CLIENTE-MS`, `QHALIMENU-PAGO-MS`, `QHALIMENU-GATEWAY`
- Gateway:
  - `GET http://localhost:18080/api/v1/categorias`
  - `GET http://localhost:18080/api/v1/productos`
  - `GET http://localhost:18080/api/v1/ordenes`
  - `GET http://localhost:18080/api/v1/clientes`
  - `GET http://localhost:18080/api/v1/pagos`
- Swagger DEV: `http://localhost:8080/swagger-ui.html`, `http://localhost:8082/swagger-ui.html`, `http://localhost:8084/swagger-ui.html` y `http://localhost:8086/swagger-ui.html`
- Compra exprés (sin registro): `POST http://localhost:18080/api/v1/clientes` con `numeroDocumento`, `nombres` y `celular`. Consulta: `GET http://localhost:18080/api/v1/clientes/documento/{dni}`
- Pagos: `POST http://localhost:18080/api/v1/pagos/crear-preferencia` crea la preferencia y devuelve el `sandbox_init_point` real de Mercado Pago; el frontend lo abre en otra ventana. Sin un Access Token de Prueba responde error (no hay checkout simulado). Configura el token con `configurar-mercadopago.ps1` (ver `docs/accesos-dev.md`). El cobro en efectivo se confirma desde Caja.

## Pruebas

```powershell
cd infra\qhalimenu-config;          .\mvnw.cmd test
cd infra\qhalimenu-eureka;          .\mvnw.cmd test
cd infra\qhalimenu-gateway;         .\mvnw.cmd test
cd services\qhalimenu-catalogo-ms;  .\mvnw.cmd test
cd services\qhalimenu-orden-ms;     .\mvnw.cmd test
cd services\qhalimenu-cliente-ms;   .\mvnw.cmd test
cd services\qhalimenu-pago-ms;      .\mvnw.cmd test
```
