# =====================================================================
#  QhaliMenu - Generacion de claves JWT RSA (RS256)
#  ---------------------------------------------------------------------
#  Crea un par de claves RSA 2048 en formato PEM (PKCS#8 / X.509),
#  tal como las espera qhalimenu-auth-ms (RsaKeyProvider):
#     JWT_PRIVATE_KEY  -> private key (BEGIN PRIVATE KEY)
#     JWT_PUBLIC_KEY   -> public key  (BEGIN PUBLIC KEY)
#
#  Uso:
#     powershell -ExecutionPolicy Bypass -File .\scripts\generate-jwt-keys.ps1
#     powershell -ExecutionPolicy Bypass -File .\scripts\generate-jwt-keys.ps1 -Force
#
#  Requiere el comando 'openssl' en el PATH (Git for Windows lo incluye).
#  Los archivos generados (*.pem) estan ignorados por git: no se suben.
# =====================================================================

param(
    [string]$OutDir = (Join-Path $PSScriptRoot '..\secrets'),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
    Write-Host '[ERROR] No se encontro "openssl" en el PATH.' -ForegroundColor Red
    Write-Host '        Instalalo (Git for Windows lo incluye) o usa WSL/otro equipo.' -ForegroundColor Yellow
    exit 1
}

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
if (-not (Test-Path -LiteralPath $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$privatePath = Join-Path $OutDir 'jwt-private.pem'
$publicPath  = Join-Path $OutDir 'jwt-public.pem'

if (((Test-Path -LiteralPath $privatePath) -or (Test-Path -LiteralPath $publicPath)) -and (-not $Force)) {
    Write-Host "[ERROR] Ya existe un par de claves en $OutDir." -ForegroundColor Red
    Write-Host '        Usa -Force para sobrescribirlas.' -ForegroundColor Yellow
    exit 1
}

& openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $privatePath 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host '[ERROR] "openssl genpkey" fallo al generar la clave privada.' -ForegroundColor Red
    exit 1
}

& openssl rsa -in $privatePath -pubout -out $publicPath 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host '[ERROR] "openssl rsa -pubout" fallo al derivar la clave publica.' -ForegroundColor Red
    exit 1
}

$privateValue = (Get-Content -LiteralPath $privatePath -Raw) -replace "`r?`n", '\n'
$publicValue  = (Get-Content -LiteralPath $publicPath  -Raw) -replace "`r?`n", '\n'

Write-Host ''
Write-Host 'Claves generadas:' -ForegroundColor Green
Write-Host "  Privada: $privatePath"
Write-Host "  Publica: $publicPath"
Write-Host ''
Write-Host 'Exporta las variables y arranca qhalimenu-auth-ms desde ESTA terminal:' -ForegroundColor Cyan
Write-Host ''
Write-Host "  `$env:JWT_PRIVATE_KEY = '$privateValue'"
Write-Host "  `$env:JWT_PUBLIC_KEY  = '$publicValue'"
Write-Host ''
Write-Host '  # Luego:'
Write-Host '  #   cd services\qhalimenu-auth-ms'
Write-Host '  #   .\mvnw.cmd spring-boot:run'
Write-Host ''
Write-Host 'Alternativa persistente (misma sesion de usuario):' -ForegroundColor Cyan
Write-Host '  setx JWT_PRIVATE_KEY "<valor>"   # abre una terminal NUEVA tras setx'
Write-Host '  setx JWT_PUBLIC_KEY  "<valor>"'
Write-Host ''
Write-Host 'Nota: si NO defines estas variables, auth-ms genera claves efimeras' -ForegroundColor Yellow
Write-Host '      en memoria (los tokens caducan al reiniciar). Apto solo para pruebas.' -ForegroundColor Yellow
