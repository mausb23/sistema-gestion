@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..\

echo === 1. Construyendo frontend ===
cd /d "%PROJECT_DIR%frontend"
call npm install
call npm run build

echo === 2. Instalando dependencias Python ===
cd /d "%PROJECT_DIR%backend"
pip install -r requirements.txt
pip install pyinstaller

echo === 3. Empaquetando con PyInstaller ===
pyinstaller --onefile --name gestion-ventas ^
  --add-data "static;static" ^
  --hidden-import uvicorn ^
  --hidden-import uvicorn.loggers ^
  --hidden-import uvicorn.loops.auto ^
  --hidden-import uvicorn.protocols.http.auto ^
  app/main.py

echo.
echo === Hecho! ===
echo Ejecutable: backend\dist\gestion-ventas.exe
echo Copia el archivo a cualquier carpeta y ejecuta.
pause
