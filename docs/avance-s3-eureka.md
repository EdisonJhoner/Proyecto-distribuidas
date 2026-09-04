# Avance S3 — Registro, Descubrimiento y Ejecución Concurrente de Servicios (Eureka)

**Microservicios de responsabilidad de Edison:** `catalogo-ms` (no transaccional) y `pago-ms` (transaccional, siguiente etapa).
**Sesión:** S3 — Registro, descubrimiento y ejecución concurrente de servicios mediante Eureka.
**Referencia:** https://262dist.github.io/pagatu/sesiones/S03_Registro_Descubrimiento_Ejecucion_Concurrente/

---

## 1. Objetivo

Implementar un servidor de **registro y descubrimiento de servicios** (`pagatu-eureka`) usando Spring Cloud Netflix Eureka, y conectar el microservicio `pagatu-catalogo-ms` como cliente Eureka, logrando que **dos instancias simultáneas** (puertos fijos `8080` y `8081`) queden localizables por su **nombre lógico** en el dashboard, sin que ningún componente necesite conocer sus direcciones de antemano.

## 2. Problema que resuelve Eureka

Antes de S3, cualquier cliente que llamara a un microservicio debía conocer su **host y puerto exactos** (una URL fija escrita a mano). Eso funciona con una instancia, pero falla cuando:

- aparece una **segunda instancia** del mismo servicio (¿cómo repartir tráfico sin conocer ambos puertos?),
- un servicio **se cae o se quiere escalar** (la lista de direcciones cambia),
- el sistema crece a varios microservicios con varias instancias c/u (nadie puede mantener a mano una lista actualizada).

La solución no es "recordar mejor" las direcciones, sino que **ningún cliente necesite conocerlas**: cada instancia se **anuncia sola** al arrancar ante `pagatu-eureka`, bajo un **nombre lógico**; quien la necesita pregunta por ese nombre.

## 3. Arquitectura

```
Cliente (PowerShell / navegador / Swagger)
      |
      +-----> GET localhost:18761        (consulta el registro)
      +-----> GET localhost:8080/api/v1/menus   (llamada directa a instancia 1)

pagatu-config (18888)  <-- configuración centralizada (S2) --> todos los servicios
      |
      v
pagatu-eureka (18761)  Eureka Server (Service Registry)
      |  registra / descubre
      +-------- pagatu-catalogo-ms:8080   (instancia 1)
      +-------- pagatu-catalogo-ms:8081   (instancia 2)
```

- `pagatu-config` (Config Server) entrega la configuración de DEV/PROD desde `config-repo`.
- `pagatu-eureka` lee su propia configuración desde `pagatu-config` (es Config Client) y se ejecuta en `18761`.
- `pagatu-catalogo-ms` es Config Client **y** Eureka Client.

## 4. Implementación

### 4.1 `pagatu-eureka` (Eureka Server)

- Dependencia clave: `spring-cloud-starter-netflix-eureka-server`.
- Clase principal anotada con `@EnableEurekaServer`.
- Su `application.yml` declara `spring.config.import: optional:configserver:http://localhost:18888` → actúa como Config Client.
- La configuración real (puerto, flags de Eureka) está en `config-repo/pagatu-eureka-dev.yml`.

```java
@SpringBootApplication
@EnableEurekaServer
public class PagatuEurekaApplication {
    public static void main(String[] args) {
        SpringApplication.run(PagatuEurekaApplication.class, args);
    }
}
```

### 4.2 `pagatu-catalogo-ms` (Eureka Client)

- Se agregó la dependencia `spring-cloud-starter-netflix-eureka-client` (versión gestionada por el BOM de Spring Cloud, sin versión manual).
- Su nombre lógico se fija con `spring.application.name: pagatu-catalogo-ms` (el mismo que usa ante `pagatu-config`, ahora también ante `pagatu-eureka`).
- Configuración de Eureka en `config-repo/pagatu-catalogo-ms-dev.yml`:

```yaml
eureka:
  instance:
    hostname: localhost
    instance-id: ${spring.application.name}:${server.port}
  client:
    service-url:
      defaultZone: http://localhost:18761/eureka
```

- Conserva su funcionalidad CRUD de la entidad `Menu` (`GET`/`POST /api/v1/menus`) y Flyway para la base de datos.

## 5. Configuración

### `pagatu-eureka-dev.yml` (en `config-repo`)

```yaml
server:
  port: 18761

eureka:
  server:
    enable-self-preservation: false   # solo DEV: con pocas instancias evita falsos "DOWN"
  client:
    register-with-eureka: false        # el propio Eureka no se registra a sí mismo
    fetch-registry: false
    service-url:
      defaultZone: http://localhost:18761/eureka/

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

### `pagatu-catalogo-ms-dev.yml` (en `config-repo`)

```yaml
server:
  port: 8080

spring:
  application:
    name: pagatu-catalogo-ms
  datasource:
    url: jdbc:postgresql://localhost:15432/ecomer_catalogo_db
    username: pagatu
    password: pagatu
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true

eureka:
  instance:
    hostname: localhost
    instance-id: ${spring.application.name}:${server.port}
  client:
    service-url:
      defaultZone: http://localhost:18761/eureka
```

> **Nota de versiones (compatibilidad corregida):** En Spring Boot 4.x, la integración automática de Flyway requiere el starter modular `spring-boot-starter-flyway` (además de `flyway-database-postgresql`). Solo `flyway-core` ya no dispara la auto-configuración en Spring Boot 4 — por eso se ajustó el `pom.xml` de `pagatu-catalogo-ms`.

## 6. Ejecución

Requisitos: **JDK 21** y **Docker** (base de datos PostgreSQL).

### Base de datos
```powershell
cd services\pagatu-catalogo-ms
docker compose -f compose-dev.yml up -d
```

### Orden de arranque (3 terminales + 2)

1. **Config Server** → `localhost:18888`
```powershell
cd infra\pagatu-config
.\mvnw.cmd spring-boot:run
```

2. **Eureka Server** → `localhost:18761`
```powershell
cd infra\pagatu-eureka
.\mvnw.cmd spring-boot:run
```

3. **Catalogo — instancia 1** → `localhost:8080`
```powershell
cd services\pagatu-catalogo-ms
.\mvnw.cmd spring-boot:run
```

4. **Catalogo — instancia 2** → `localhost:8081`
```powershell
cd services\pagatu-catalogo-ms
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

> En Windows se usa `.\mvnw.cmd`; en Linux/macOS `./mvnw`. La segunda instancia necesita el puerto distinto por línea de comandos porque ambas comparten el mismo `server.port: 8080` fijo del DEV — el mismo mecanismo de S1.

## 7. Prueba con dos instancias

### Instancia 1
```
GET http://localhost:8080/api/v1/menus
```
```json
[
  {"id":1,"nombre":"Lomo saltado","precio":15.00,"raciones":20},
  {"id":2,"nombre":"Ceviche","precio":18.00,"raciones":15},
  {"id":3,"nombre":"Arroz con pollo","precio":12.00,"raciones":25},
  {"id":4,"nombre":"Seco de carne","precio":14.00,"raciones":18}
]
```

### Instancia 2
```
GET http://localhost:8081/api/v1/menus
```
Devuelve la misma respuesta (misma base de datos compartida), de forma **independiente** en cada puerto.

### Health
```
GET http://localhost:8080/actuator/health   -> 200 UP
GET http://localhost:8081/actuator/health   -> 200 UP
```

### Registro en Eureka (REST)
```
GET http://localhost:18761/eureka/apps
```
```
Application: PAGATU-CATALOGO-MS
  instanceId = pagatu-catalogo-ms:8080   status = UP
  instanceId = pagatu-catalogo-ms:8081   status = UP
```

## 8. Resultado

En el dashboard `http://localhost:18761`, la sección *"Instances currently registered with Eureka"* muestra:

```
PAGATU-CATALOGO-MS
  localhost:8080   UP
  localhost:8081   UP
```

Es el mismo nombre lógico con dos instancias activas, cada una con su puerto fijo conocido y anunciada a Eureka. El propio Eureka no aparece registrado (no se registra a sí mismo), y con la autopreservación desactivada en DEV una instancia detenida desaparece tras perder su *heartbeat*, sin intervención manual.

## 9. Conclusiones

1. El registro y descubrimiento por **nombre lógico** eliminan la necesidad de codificar direcciones fijas.
2. Dos instancias del mismo servicio conviven sin conflicto: el puerto se elige a mano en DEV, pero ya **nadie ajeno a la instancia necesita conocerlo**.
3. Eureka resuelve el patrón **Service Registry / Service Discovery** (self-registration + heartbeat).
4. La configuración de Eureka (como toda la del proyecto) queda **centralizada** en `pagatu-config`/`config-repo`, manteniendo el patrón de S2.
5. `pago-ms` queda reservado para la siguiente etapa (S3 del flujo transaccional y Mercado Pago).

## 10. Posibles preguntas del docente

### ¿Qué es Eureka?
Eureka es un servidor de **registro y descubrimiento de servicios** de Netflix distribuido por Spring Cloud. Los microservicios se registran en él al arrancar y se dan de baja mediante *heartbeat* (latido). Actúa como un "directorio" donde cada servicio anuncia su nombre lógico y su dirección real.

### ¿Qué es Service Registry?
Es el patrón de arquitectura (y la base de datos centralizada) donde se guardan las ubicaciones de red (IP, puerto) de todas las instancias de servicio. Permite que los servicios se encuentren dinámicamente sin configuración estática. Eureka es la implementación concreta de este patrón para el curso.

### ¿Qué es Service Discovery?
Es la capacidad de encontrar una instancia real **preguntando solo por su nombre lógico**, sin conocer host/puerto de antemano. Quien pregunta puede ser otro microservicio o, en S4, el Gateway.

### ¿Qué diferencia hay entre host/puerto y nombre lógico?
- **Host/puerto** (`localhost:8080`) es una dirección física y concreta.
- **Nombre lógico** (`pagatu-catalogo-ms`) es un identificador estable del servicio. Una misma dirección física puede cambiar o multiplicarse, pero el nombre lógico se mantiene: Eureka resuelve el nombre a la(s) direcciones real(es) actuales.

### ¿Por qué necesitamos dos instancias?
Para demostrar **escalado horizontal y alta disponibilidad**: si una instancia cae o se satura, otra puede atender. Eureka las agrupa bajo el mismo nombre lógico, y un consumidor (o el Gateway en S4) puede repartir peticiones entre ambas sin escribir las direcciones a mano.

### ¿Qué ocurre cuando arranca catalogo-ms?
1. Lee su configuración desde `pagatu-config`.
2. Se levanta en su puerto (`8080` o `8081`).
3. Se registra ante `pagatu-eureka` con su nombre lógico y dirección real.
4. Renueva su registro periódicamente (heartbeat, ~30 s).
5. Aparece como UP en el dashboard bajo `PAGATU-CATALOGO-MS`.

### ¿Qué ocurre cuando una instancia deja de responder?
Al dejar de enviar heartbeat, Eureka la **expira del registro** después de un tiempo (configurable) y deja de anunciarla a los consumidores. Eso ocurre automáticamente, sin que nadie la elimine a mano.

### ¿Qué ventaja tiene Eureka frente a configurar manualmente localhost:8080?
Con Eureka, agregar/eliminar/escalar instancias no obliga a actualizar la configuración de los consumidores: solo se consulta el registro por el nombre lógico. Configurar a mano `localhost:8080` obliga a conocer y mantener cada puerto en cada cliente, y es insostenible cuando el sistema crece.

---

## Pruebas automáticas

```powershell
cd infra\pagatu-config;   .\mvnw.cmd clean test
cd infra\pagatu-eureka;   .\mvnw.cmd clean test
cd services\pagatu-catalogo-ms; .\mvnw.cmd clean test
```

Todos los módulos compilan y pasan sus pruebas de contexto (BUILD SUCCESS).
