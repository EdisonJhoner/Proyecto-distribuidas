<#
  Conecta Mercado Pago en MODO PRUEBA y reinicia solo qhalimenu-pago-ms.

  Uso (en una terminal de PowerShell):
    setx MERCADOPAGO_ACCESS_TOKEN "APP_USR-TU-TOKEN-DEL-SELECTOR-PRUEBA"
    powershell -ExecutionPolicy Bypass -File .\configurar-mercadopago.ps1

  El token se lee del registro de Windows; nunca se escribe en el repositorio.
#>
$ErrorActionPreference = 'Stop'

$token = [Environment]::GetEnvironmentVariable('MERCADOPAGO_ACCESS_TOKEN', 'User')
if ([string]::IsNullOrWhiteSpace($token)) {
    $token = [Environment]::GetEnvironmentVariable('MERCADOPAGO_ACCESS_TOKEN', 'Machine')
}
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host 'Falta la variable MERCADOPAGO_ACCESS_TOKEN. Ejecuta primero:' -ForegroundColor Yellow
    Write-Host '  setx MERCADOPAGO_ACCESS_TOKEN "APP_USR-TU-TOKEN-DE-PRUEBA"' -ForegroundColor Cyan
    exit 1
}

$token = $token.Trim()
if ($token -notmatch '^(APP_USR|TEST)-') {
    Write-Error 'El token debe venir del selector "Prueba" (APP_USR-... o TEST-...). No uses un token de Producción.'
}
if ($token -eq 'TEST-TU-TOKEN-DE-PRUEBA' -or $token -like '*YOUR*ACCESS*TOKEN*' -or $token -like '*TU-TOKEN*') {
    Write-Error 'El token sigue siendo un placeholder. Copia el Access Token real del selector "Prueba".'
}

$env:MERCADOPAGO_ACCESS_TOKEN = $token
$prefijo = $token.Substring(0, [Math]::Min(9, $token.Length))
Write-Host "Mercado Pago MODO PRUEBA: $prefijo... - reiniciando pago-ms" -ForegroundColor Green

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" |
    Where-Object { $_.CommandLine -like '*qhalimenu-pago-ms*' -or $_.CommandLine -like '*QhalimenuPagoMsApplication*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | ForEach-Object {
    $b64 = ($_.CommandLine -split '-EncodedCommand ')[-1].Trim().TrimEnd('"', "'")
    try {
        $txt = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($b64))
        if ($txt -like '*qhalimenu-pago-ms*') {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
    } catch { }
}

Start-Sleep -Seconds 3

$body = @'
$ready = $false
for ($i = 0; $i -lt 120; $i++) {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:18888/actuator/health' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ready) { Write-Host 'AVISO: Config Server no respondio' -ForegroundColor Yellow }
Set-Location '__RAIZ__\services\qhalimenu-pago-ms'
Write-Host 'QhaliMenu - Pago (8086) - Mercado Pago MODO PRUEBA' -ForegroundColor Cyan
& .\mvnw.cmd spring-boot:run
'@.Replace('__RAIZ__', $raiz)

$enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($body))
Start-Process -FilePath 'powershell.exe' `
    -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $enc `
    -WindowStyle Normal | Out-Null

Write-Host 'Listo. pago-ms se reinicio con el token de prueba. Prueba una reserva con Mercado Pago.' -ForegroundColor Green
