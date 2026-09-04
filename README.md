# E-Comedor — Avance S3: Eureka + Catalogo-MS

Sistema Distribuido de Reserva Anticipada de Almuerzos. Este repositorio contiene el avance individual de la **Sesión S3 — Registro, descubrimiento y ejecución concurrente de servicios mediante Eureka** (referencia: [Sesión S03](https://262dist.github.io/pagatu/sesiones/S03_Registro_Descubrimiento_Ejecucion_Concurrente/)).

## Componentes

| Componente | Ruta | Rol | Puerto |
|---|---|---|---|
| `pagatu-config` | `infra/pagatu-config` | Config Server (Spring Cloud Config) | `18888` |
| `pagatu-eureka` | `infra/pagatu-eureka` | Eureka Server (Service Registry) | `18761` |
| `pagatu-catalogo-ms` | `services/pagatu-catalogo-ms` | Microservicio de catálogo (cliente Eureka) | `8080` / `8081` |

`config-repo` contiene la configuración centralizada (DEV/PROD) de cada servicio: `infra/pagatu-config/config-repo/`.

## Arquitectura

```
pagatu-config (18888)
      |
      | configuración centralizada
      v
pagatu-eureka (18761)  <--registra/descubre--
      |                        |
      |                        +--- pagatu-catalogo-ms:8080
      |                        +--- pagatu-catalogo-ms:8081
```

Cada instancia de `pagatu-catalogo-ms` se registra a sí misma ante `pagatu-eureka` al arrancar, con su nombre lógico (`pagatu-catalogo-ms`) y su dirección real (`localhost:8080`, `localhost:8081`). Cualquier componente que consulte el registro encuentra ambas instancias por nombre lógico, sin necesidad de conocer los puertos de antemano.

## Ejecución

Requisitos: JDK 21 y Docker (para la base de datos PostgreSQL del catálogo).

### 1. Base de datos (catálogo)

```powershell
cd services\pagatu-catalogo-ms
docker compose -f compose-dev.yml up -d
```

### 2. Config Server

```powershell
cd infra\pagatu-config
.\mvnw.cmd spring-boot:run
```

### 3. Eureka Server

```powershell
cd infra\pagatu-eureka
.\mvnw.cmd spring-boot:run
```

### 4. Catalogo — Instancia 1 (8080)

```powershell
cd services\pagatu-catalogo-ms
.\mvnw.cmd spring-boot:run
```

### 5. Catalogo — Instancia 2 (8081)

```powershell
cd services\pagatu-catalogo-ms
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

## Verificación

- Dashboard Eureka: `http://localhost:18761`
- `GET http://localhost:8080/api/v1/menus`
- `GET http://localhost:8081/api/v1/menus`
- Health: `http://localhost:8080/actuator/health` y `http://localhost:8081/actuator/health`

Ambas instancias deben aparecer en el dashboard como `PAGATU-CATALOGO-MS` → `localhost:8080 UP` y `localhost:8081 UP`.

## Pruebas

```powershell
cd infra\pagatu-config;   .\mvnw.cmd clean test
cd infra\pagatu-eureka;   .\mvnw.cmd clean test
cd services\pagatu-catalogo-ms; .\mvnw.cmd clean test
```

## Documentación detallada

Ver [docs/avance-s3-eureka.md](docs/avance-s3-eureka.md) para la documentación completa de la presentación (objetivo, explicaciones de Eureka, Service Registry, Service Discovery, preguntas de defensa, etc.).
