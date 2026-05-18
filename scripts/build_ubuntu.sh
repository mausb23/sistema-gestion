#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== 1. Instalando dependencias de sistema ==="
sudo apt-get install -y -qq \
  python3-gi gir1.2-webkit2-4.1 \
  libusb-1.0-0-dev \
  fonts-dejavu-core \
  2>&1 | tail -3 || true

echo "=== 2. Instalando dependencias Python ==="
cd "$PROJECT_DIR/backend"
pip install -r requirements.txt 2>&1 | tail -5
pip install pyinstaller 2>&1 | tail -3

echo "=== 3. Construyendo frontend ==="
cd "$PROJECT_DIR/frontend"
npm install 2>&1 | tail -5
npm run build 2>&1 | tail -5

echo "=== 4. Empaquetando con PyInstaller ==="
cd "$PROJECT_DIR/backend"
pyinstaller --onefile --name gestion-ventas \
  --add-data "static:static" \
  --hidden-import uvicorn \
  --hidden-import uvicorn.loggers \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.protocols.http.auto \
  --hidden-import webview \
  --hidden-import webview.platforms.gtk \
  app/main.py 2>&1 | tail -10

echo ""
echo "=== Hecho! ==="
echo "Ejecutable: $PROJECT_DIR/backend/dist/gestion-ventas"
echo ""
echo "Para que aparezca en el menú de aplicaciones:"
echo "  cp \"$PROJECT_DIR/Versiones/gestion-ventas.desktop\" ~/.local/share/applications/"
