#!/bin/bash
set -e

export PATH="$HOME/.local/bin:$HOME/node-v24.15.0-linux-x64/bin:$PATH"
PROJECT_DIR="/mnt/c/Users/mausb/Documents/Proyectos Programación/gestion-ventas"

echo "=== 1. Instalando dependencias Python ==="
cd "$PROJECT_DIR/backend"
python3 -m pip install --user --break-system-packages -r requirements.txt 2>&1 | tail -3
python3 -m pip install --user --break-system-packages pyinstaller 2>&1 | tail -3
python3 -m pip install --user --break-system-packages openpyxl requests beautifulsoup4 lxml 2>&1 | tail -3

echo "=== 2. Construyendo frontend ==="
cd "$PROJECT_DIR/frontend"
npm install 2>&1 | tail -3
npm run build 2>&1 | tail -5

echo "=== 3. Empaquetando con PyInstaller ==="
cd "$PROJECT_DIR/backend"
python3 -m PyInstaller --onefile --name gestion-ventas \
  --add-data "static:static" \
  --hidden-import uvicorn \
  --hidden-import uvicorn.loggers \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.protocols.http.auto \
  app/main.py 2>&1 | tail -10

echo "=== Resultado ==="
ls -lh "$PROJECT_DIR/backend/dist/gestion-ventas"
