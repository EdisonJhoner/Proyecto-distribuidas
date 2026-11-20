# obs

Observabilidad de QhaliMenu (S3-S4 / S10): métricas con Prometheus, logs con
Loki/Promtail, paneles con Grafana. Observa `infra/` y `services/` desde
afuera — no es una dependencia de arranque, el sistema funciona sin esta
carpeta levantada.

Copia del patrón de `pagatu/obs` (mismas imágenes y puertos DEV).

## Servicios y versiones (DEV)

| Servicio | Imagen | Puerto |
|---|---|---|
| Prometheus | `prom/prometheus:v3.14.0` | `http://localhost:19090` |
| Loki | `grafana/loki:3.7.6` | `http://localhost:13100` |
| Promtail | `grafana/promtail:3.6.8` | (sin puerto expuesto al host) |
| Grafana | `grafana/grafana:11.4.0` | `http://localhost:13000` (`admin`/`admin`) |

## Uso (DEV)

```powershell
cd obs
docker compose -f compose-dev.yml up -d
docker compose -f compose-dev.yml ps
```

Contenedores esperados:

```text
qhalimenu-prometheus-dev
qhalimenu-loki-dev
qhalimenu-promtail-dev
qhalimenu-grafana-dev
```

## Cómo descubre a los microservicios

- **Prometheus** (`prometheus/prometheus-dev.yml`) usa *service discovery*
  contra Eureka (`eureka_sd_configs`, `http://host.docker.internal:18761/eureka`):
  cualquier microservicio que se registre y exponga `/actuator/prometheus`
  aparece solo. `qhalimenu-config` y `qhalimenu-eureka` están fijos como
  *targets* estáticos. Keycloak tiene un *target* estático en `:19000/metrics`
  porque no se registra en Eureka.
- **Promtail** (`promtail/promtail-config-dev.yml`) lee `logs/` de cada
  microservicio y de Keycloak / Gateway. No hay descubrimiento automático.

## Verificar

- Prometheus *Targets*: `http://localhost:19090/targets`
- Grafana: `http://localhost:13000` (`admin` / `admin`). Datasources Prometheus
  y Loki ya provisionados.
