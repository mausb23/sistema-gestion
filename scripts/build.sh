#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== 1. Construyendo frontend ==="
cd "$PROJECT_DIR/frontend"
npm install
npm run build

echo "=== 2. Instalando dependencias Python ==="
cd "$PROJECT_DIR/backend"
pip install -r requirements.txt
pip install pyinstaller

echo "=== 3. Empaquetando con PyInstaller ==="
pyinstaller --onefile --name gestion-ventas \
  --add-data "static:static" \
  --hidden-import uvicorn \
  --hidden-import uvicorn.loggers \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.protocols.http.auto \
  app/main.py

echo ""
echo "=== Hecho! ==="
echo "Ejecutable: backend/dist/gestion-ventas"
echo "Copia el archivo a cualquier carpeta y ejecuta."
