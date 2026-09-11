# Producto de Unidad 1 — QhaliMenu

Sistema distribuido base funcional, configurable y preparado para múltiples instancias.

**QhaliMenu** es la reserva anticipada de almuerzos: catálogo de platos, clientes, órdenes y pagos, con configuración centralizada, descubrimiento y Gateway.

## 1. Alcance de servicios

| Servicio | Rol | Sesión | Equipo |
|---|---|---|---|
| `qhalimenu-config` | Config Server, configuración externalizada por ambiente. | S2 | Infra |
| `qhalimenu-eureka` | Registro y descubrimiento de servicios. | S3 | Infra |
| `qhalimenu-gateway` | Punto único de acceso y balanceo de carga. | S4 | Infra |
| `qhalimenu-catalogo-ms` | Catálogo de categorías y productos (CRUD, no transaccional). | S1, S3 | Edison |
| `qhalimenu-orden-ms` | Registro de órdenes de reserva (transaccional). | S1, S2-S4 | Jhosef |
| `qhalimenu-cliente-ms` | Compra exprés: DNI + nombre + celular, sin registro ni contraseña. | S1-S4 | Jhosef |
| `qhalimenu-pago-ms` | Preferencia MercadoPago o simulación sandbox si el token no es real. | S1-S4 | Edison |

## 2. Contrato REST

Todo el tráfico de negocio se resuelve a través de `qhalimenu-gateway` (`localhost:18080` en DEV).

| Métodos | Endpoint | Propósito |
|---|---|---|
| `GET`, `GET /{id}`, `POST`, `PUT`, `DELETE` | `/api/v1/categorias` | CRUD de categorías. |
| `GET`, `GET /{id}`, `POST`, `PUT`, `DELETE` | `/api/v1/productos` | CRUD de productos, con categoría anidada. |
| `GET`, `GET /{id}`, `POST` | `/api/v1/ordenes` | Listar, consultar y registrar órdenes. |
| `GET`, `GET /{id}`, `GET /documento/{dni}`, `POST`, `PUT`, `DELETE` | `/api/v1/clientes` | Asociación exprés por DNI (nombre + celular). PUT/DELETE para caja/entrega. |
| `GET`, `GET /{id}`, `GET /orden/{ordenId}`, `POST /crear-preferencia`, `GET /simulacion/{preferenceId}`, `GET /feedback`, `GET|POST /webhook` | `/api/v1/pagos` | Preferencia MercadoPago o URL de simulación; confirmación y webhook. |

Errores: HTTP `400` (validación `@Valid`) y HTTP `404` (`ResourceNotFoundException`).

## 3. Configuración por ambiente

| Componente | Puerto DEV | Puerto PROD (interno) | Puerto PROD (expuesto) |
|---|---|---|---|
| `qhalimenu-config` | `18888` | `8888` | `28888` |
| `qhalimenu-eureka` | `18761` | `8761` | `28761` (solo dashboard) |
| `qhalimenu-gateway` | `18080` | `8080` | `28080` (único puerto de negocio) |
| `qhalimenu-catalogo-ms` | `8080` / `8081` | `8080` | Sin exponer |
| `qhalimenu-orden-ms` | `8082` / `8083` | `8080` | Sin exponer |
| `qhalimenu-cliente-ms` | `8084` / `8085` | `8080` | Sin exponer |
| `qhalimenu-pago-ms` | `8086` / `8087` | `8080` | Sin exponer |

Bases: `qhalimenu_catalogo_db`, `qhalimenu_orden_db`, `qhalimenu_cliente_db` y `qhalimenu_pago_db`.

## 4. Arquitectura del sistema distribuido base

```
Cliente externo
      |
      v
qhalimenu-gateway :18080
      |  lb://qhalimenu-catalogo-ms
      |  lb://qhalimenu-orden-ms
      |  lb://qhalimenu-cliente-ms
      |  lb://qhalimenu-pago-ms
      |
      +-- qhalimenu-catalogo-ms :8080 / :8081
      +-- qhalimenu-orden-ms    :8082 / :8083
      +-- qhalimenu-cliente-ms  :8084 / :8085
      +-- qhalimenu-pago-ms     :8086 / :8087
              |
              +-- registran --> qhalimenu-eureka :18761
              +-- config    --> qhalimenu-config :18888 --> config-repo
```

El cliente no conoce puertos de instancia. El Gateway resuelve `lb://` contra Eureka y reparte con Round Robin.
