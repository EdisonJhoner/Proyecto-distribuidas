@echo off
setlocal
title QhaliMenu - Inicio del proyecto
cd /d "%~dp0"

echo.
echo ============================================================
echo   QhaliMenu - Reserva anticipada de almuerzos (DEV)
echo ============================================================
echo.

if not exist "%~dp0start-project.ps1" (
    echo [ERROR] No se encontro start-project.ps1 junto a este archivo.
    pause
    exit /b 1
)

echo Ejecutando el lanzador principal...
echo Se abriran las ventanas de servicio en el orden correcto.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-project.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El lanzador fallo. Revisa la informacion mostrada arriba.
    pause
)
endlocal