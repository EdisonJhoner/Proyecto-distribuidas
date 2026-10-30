# =====================================================================
#  QhaliMenu - Inicio completo del proyecto (entorno DEV)
#  ---------------------------------------------------------------------
#  Abre una terminal independiente por cada servicio, en el orden
#  correcto, y espera a que cada prerequisito este listo antes de
#  arrancar el siguiente nivel (Docker/Keycloak/Kafka -> Config ->
#  Eureka -> Gateway -> servicios -> frontend Angular).
#
#  Uso:
#    - Doble clic en start-project.bat   (recomendado)
#    - powershell -ExecutionPolicy Bypass -File .\start-project.ps1
#
#  Detener todo:  Ctrl+C en cada terminal, o cierra cada ventana.
# =====================================================================

$ErrorActionPreference = 'Continue'
$Root = $PSScriptRoot
$env:QHALI_ROOT = $Root

if (-not $env:QHALI_ROOT) {
    $env:QHALI_ROOT = (Get-Location).Path
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Reserva anticipada de almuerzos (DEV)'          -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

# ---------------------------------------------------------------
# 0) Pre-requisitos
# ---------------------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host '[ERROR] Docker no esta instalado o no esta en el PATH.' -ForegroundColor Red
    Read-Host 'Presiona Enter para salir'
    exit 1
}
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host '[ERROR] JDK 21 no esta instalado o no esta en el PATH.' -ForegroundColor Red
    Read-Host 'Presiona Enter para salir'
    exit 1
}
if (-not (Get-Command powershell.exe -ErrorAction SilentlyContinue)) {
    Write-Host '[ERROR] powershell.exe no disponible.' -ForegroundColor Red
    Read-Host 'Presiona Enter para salir'
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host '[AVISO] npm no esta en el PATH: la terminal del frontend Angular fallara.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------
# 1) Verificacion de puertos libres
# ---------------------------------------------------------------
function Test-PortInUse([int]$Port) {
    return (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) -ne $null
}

$dbPorts   = @(15432, 15434, 15436, 15438, 15440, 15442)
$kafkaPorts = @(19092, 18085)
$appPorts  = @(18888, 18761, 18080, 8088, 8080, 8082, 8084, 8086, 4200, 18180, 19000)

foreach ($p in $dbPorts) {
    if (Test-PortInUse $p) {
        Write-Host ("[AVISO] Puerto BD {0} esta en uso. Si lo ocupa otro proyecto (p.ej. contenedores 'pagatu-*')," -f $p) -ForegroundColor Yellow
        Write-Host '        la base de datos correspondiente no podra publicar ese puerto.' -ForegroundColor Yellow
    }
}
foreach ($p in $kafkaPorts) {
    if (Test-PortInUse $p) {
        Write-Host ("[AVISO] Puerto Kafka {0} ya esta en uso (broker o Kafka UI). Liberalo para evitar conflictos." -f $p) -ForegroundColor Yellow
    }
}
foreach ($p in $appPorts) {
    if (Test-PortInUse $p) {
        Write-Host ("[AVISO] Puerto {0} ya esta en uso. Cierra ese proceso para evitar conflictos." -f $p) -ForegroundColor Yellow
    }
}
Write-Host ''

# ---------------------------------------------------------------
# 2) Bases de datos (Docker Compose)
# ---------------------------------------------------------------
Write-Host '==> [1/10] Levantando bases de datos (docker compose up -d)' -ForegroundColor Green
Push-Location $Root
docker compose -f docker-compose.yml up -d 2>&1 | Out-Host
$dockerExit = $LASTEXITCODE
Pop-Location
if ($dockerExit -ne 0) {
    Write-Host ''
    Write-Host '[AVISO] docker compose devolvio un error (posible conflicto de puertos).' -ForegroundColor Yellow
    Write-Host '        Revisa la salida anterior y libera los puertos ocupados.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------
# 2b) Broker de mensajeria (Kafka KRaft + Kafka UI)
# ---------------------------------------------------------------
Write-Host ''
Write-Host '==> [1b/10] Levantando broker Kafka y Kafka UI (infra\kafka)' -ForegroundColor Green
docker compose -f (Join-Path $Root 'infra\kafka\compose-dev.yml') up -d 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host '[AVISO] No se pudo levantar Kafka (revisa puertos 19092/18085).' -ForegroundColor Yellow
}

# ---------------------------------------------------------------
# 2c) Keycloak (emisor de tokens OIDC) + su base de datos
# ---------------------------------------------------------------
Write-Host ''
Write-Host '==> [1c/10] Levantando Keycloak y su base de datos (keycloak\compose-dev.yml)' -ForegroundColor Green
docker compose -f (Join-Path $Root 'keycloak\compose-dev.yml') up -d 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host '[AVISO] No se pudo levantar Keycloak (revisa puertos 18180/19000/15442).' -ForegroundColor Yellow
}
$keycloakReady = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:19000/health/ready' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $keycloakReady = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if ($keycloakReady) {
    Write-Host '    Keycloak listo en http://localhost:18180 (realm qhalimenu)' -ForegroundColor Green
} else {
    Write-Host '[AVISO] Keycloak no respondio. Los servicios no podran validar tokens.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------
# 3) Abrir una terminal independiente por servicio
#    (cada terminal espera a su prerequisito antes de arrancar)
# ---------------------------------------------------------------
function New-ServiceWindow([string]$Title, [string]$Body) {
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Body))
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded `
        -WindowStyle Normal
}

$waitConfig = @'
$cfgUrl = 'http://localhost:18888/actuator/health'
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $cfgUrl -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host 'ADVERTENCIA: Config Server no respondio antes de iniciar el servicio.' -ForegroundColor Yellow
}
'@

$waitEureka = @'
$eukUrl = 'http://localhost:18761/actuator/health'
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $eukUrl -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host 'ADVERTENCIA: Eureka no respondio antes de iniciar el Gateway.' -ForegroundColor Yellow
}
'@

$waitKeycloak = @'
$kcUrl = 'http://localhost:19000/health/ready'
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $kcUrl -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host 'ADVERTENCIA: Keycloak no respondio.' -ForegroundColor Yellow
}
'@

Write-Host ''
Write-Host '==> Abriendo terminales independientes para cada servicio...' -ForegroundColor Green
Write-Host ''

# Terminal 2: Config Server (18888)  -- no espera nada, el primero
New-ServiceWindow 'QhaliMenu - Config Server (18888)' @'
Set-Location (Join-Path $env:QHALI_ROOT 'infra\qhalimenu-config')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Config Server    http://localhost:18888'       -ForegroundColor Cyan
Write-Host '  Config repo: infra\qhalimenu-config\config-repo'           -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
'@

# Terminal 3: Eureka Server (18761) -- espera a Config Server
New-ServiceWindow 'QhaliMenu - Eureka Server (18761)' @"
$waitConfig
Set-Location (Join-Path `$env:QHALI_ROOT 'infra\qhalimenu-eureka')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Eureka Server   http://localhost:18761'       -ForegroundColor Cyan
Write-Host '  Consola Eureka: http://localhost:18761'                   -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
"@

# Terminal 4: API Gateway (18080) -- espera a Eureka
New-ServiceWindow 'QhaliMenu - API Gateway (18080)' @"
$waitEureka
Set-Location (Join-Path `$env:QHALI_ROOT 'infra\qhalimenu-gateway')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - API Gateway     http://localhost:18080'       -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
"@

# Terminal 5: Auth (8088) -- espera a Config Server
New-ServiceWindow 'QhaliMenu - Auth (8088)' @"
$waitConfig
Set-Location (Join-Path `$env:QHALI_ROOT 'services\qhalimenu-auth-ms')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Auth            http://localhost:8088'         -ForegroundColor Cyan
Write-Host '  JWKS:     http://localhost:8088/api/v1/auth/jwks'          -ForegroundColor Cyan
Write-Host '  Swagger:  http://localhost:8088/swagger-ui.html'           -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
"@

# Terminal 6: Catalogo (8080) -- espera a Config Server
New-ServiceWindow 'QhaliMenu - Catalogo (8080)' @"
$waitConfig
Set-Location (Join-Path `$env:QHALI_ROOT 'services\qhalimenu-catalogo-ms')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Catalogo        http://localhost:8080'         -ForegroundColor Cyan
Write-Host '  Swagger:  http://localhost:8080/swagger-ui.html'           -ForegroundColor Cyan
Write-Host '  Actuator: http://localhost:8080/actuator/health'          -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
"@

# Terminal 7: Orden (8082) -- espera a Config Server
New-ServiceWindow 'QhaliMenu - Orden (8082)' @"
$waitConfig
Set-Location (Join-Path `$env:QHALI_ROOT 'services\qhalimenu-orden-ms')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Orden           http://localhost:8082'         -ForegroundColor Cyan
Write-Host '  Swagger:  http://localhost:8082/swagger-ui.html'           -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
"@

# Terminal 8: Cliente (8084) -- espera a Config Server
New-ServiceWindow 'QhaliMenu - Cliente (8084)' @"
$waitConfig
Set-Location (Join-Path `$env:QHALI_ROOT 'services\qhalimenu-cliente-ms')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Cliente         http://localhost:8084'         -ForegroundColor Cyan
Write-Host '  Swagger:  http://localhost:8084/swagger-ui.html'           -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
"@

# Terminal 9: Pago (8086) -- espera a Config Server
New-ServiceWindow 'QhaliMenu - Pago (8086)' @"
$waitConfig
Set-Location (Join-Path `$env:QHALI_ROOT 'services\qhalimenu-pago-ms')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Pago            http://localhost:8086'         -ForegroundColor Cyan
Write-Host '  Swagger:  http://localhost:8086/swagger-ui.html'           -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
"@

# Terminal 10: Frontend Angular (4200) -- espera a Keycloak
New-ServiceWindow 'QhaliMenu - Frontend (4200)' @"
$waitKeycloak
Set-Location (Join-Path `$env:QHALI_ROOT 'clients\qhalimenu-frontend')
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  QhaliMenu - Frontend        http://localhost:4200'         -ForegroundColor Cyan
Write-Host '  Login Keycloak:             http://localhost:18180'        -ForegroundColor Cyan
Write-Host '  Detener: Ctrl+C'                                           -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
& npm start -- --port 4200
"@

# ---------------------------------------------------------------
# 4) Resumen
# ---------------------------------------------------------------
Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host '  Ventanas de servicio abiertas. Resumen:'                    -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
Write-Host '  [1] Bases de datos (Docker)         puertos 15432/15434/15436/15438/15440/15442'
Write-Host '      Kafka (Docker)                  broker 19092  -  Kafka UI http://localhost:18085'
Write-Host '      Keycloak (Docker)               http://localhost:18180  (admin / admin123)'
Write-Host '  [2] Config Server                   http://localhost:18888'
Write-Host '  [3] Eureka Server                   http://localhost:18761'
Write-Host '  [4] API Gateway                     http://localhost:18080'
Write-Host '  [5] Auth      (ms, legado)          http://localhost:8088   (Swagger: /swagger-ui.html)'
Write-Host '  [6] Catalogo  (ms)                  http://localhost:8080   (Swagger: /swagger-ui.html)'
Write-Host '  [7] Orden     (ms)                  http://localhost:8082   (Swagger: /swagger-ui.html)'
Write-Host '  [8] Cliente   (ms)                  http://localhost:8084   (Swagger: /swagger-ui.html)'
Write-Host '  [9] Pago      (ms)                  http://localhost:8086   (Swagger: /swagger-ui.html)'
Write-Host '  [10] Frontend Angular               http://localhost:4200'
Write-Host ''
Write-Host '  Los tokens ahora los emite Keycloak (realm qhalimenu, client qhalimenu-frontend).'
Write-Host '  Usuarios de prueba: cliente1 / Cliente123!  y  admin / Admin123!'
Write-Host ''
Write-Host '  Endpoints de prueba a traves del Gateway (puerto 18080):'
Write-Host '    GET  http://localhost:18080/api/v1/categorias    (publico)'
Write-Host '    GET  http://localhost:18080/api/v1/productos     (publico)'
Write-Host '    GET  http://localhost:18080/api/v1/ordenes/mis-ordenes  (CLIENTE)'
Write-Host '    GET  http://localhost:18080/api/v1/ordenes       (ADMIN)'
Write-Host '    GET  http://localhost:18080/api/v1/clientes      (ADMIN)'
Write-Host '    GET  http://localhost:18080/api/v1/pagos         (ADMIN)'
Write-Host ''
Write-Host '  Detener el proyecto: Ctrl+C en cada terminal o cerrar sus ventanas.'
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
Read-Host 'Presiona Enter para cerrar este panel de control'