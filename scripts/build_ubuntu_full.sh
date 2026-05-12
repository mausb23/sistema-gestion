#!/bin/bash
set -e

export PATH="$HOME/.local/bin:$HOME/node-v24.15.0-linux-x64/bin:$PATH"
BUILD_DIR="$HOME/build-gv"
SRC_DIR="/mnt/c/Users/mausb/Documents/Proyectos Programación/gestion-ventas"

echo "=== 1. Copiando proyecto a WSL ==="
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$SRC_DIR"
cp -r backend "$BUILD_DIR/"
cp -r frontend "$BUILD_DIR/"
cp -r scripts "$BUILD_DIR/"
cp .gitignore AGENTS.md DESIGN.md README.md "$BUILD_DIR/" 2>/dev/null
# Clean up
rm -rf "$BUILD_DIR/backend/static" "$BUILD_DIR/backend/dist" "$BUILD_DIR/backend/__pycache__" "$BUILD_DIR/backend/app/__pycache__" "$BUILD_DIR/frontend/node_modules" "$BUILD_DIR/frontend/.astro" 2>/dev/null
echo "Copied project"

echo "=== 2. Instalando dependencias de sistema (pywebview) ==="
apt-get install -y -qq python3-gi gir1.2-webkit2-4.1 2>&1 | tail -3

echo "=== 3. Instalando dependencias Python ==="
cd "$BUILD_DIR/backend"
python3 -m pip install --user --break-system-packages -r requirements.txt 2>&1 | tail -3
python3 -m pip install --user --break-system-packages pyinstaller 2>&1 | tail -3
python3 -m pip install --user --break-system-packages openpyxl requests beautifulsoup4 lxml 2>&1 | tail -3

echo "=== 4. Construyendo frontend ==="
cd "$BUILD_DIR/frontend"
npm install 2>&1 | tail -3
npm run build 2>&1 | tail -5

echo "=== 5. Empaquetando con PyInstaller ==="
cd "$BUILD_DIR/backend"
python3 -m PyInstaller --onefile --name gestion-ventas \
  --add-data "static:static" \
  --hidden-import uvicorn \
  --hidden-import uvicorn.loggers \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.protocols.http.auto \
  --hidden-import webview \
  --hidden-import webview.platforms.gtk \
  app/main.py 2>&1 | tail -15

echo "=== 6. Copiando resultado a Versiones ==="
VERSION_DIR="/mnt/c/Users/mausb/Documents/Proyectos Programación/gestion-ventas/Versiones"
VERSION_NAME="v0.12.05.2026-1"
cp "$BUILD_DIR/backend/dist/gestion-ventas" "$VERSION_DIR/$VERSION_NAME"
chmod +x "$VERSION_DIR/$VERSION_NAME"
ls -lh "$VERSION_DIR/$VERSION_NAME"

echo ""
echo "=== Hecho! ==="
echo "Archivos en Versiones/:"
ls -lh "$VERSION_DIR/"
echo ""
echo "Para instalar en Ubuntu:"
echo "  cd Versiones"
echo "  ./$VERSION_NAME"
echo ""
echo "Para que aparezca en el menú de aplicaciones:"
echo "  RUTA=\$(pwd)"
echo "  sed \"s|__RUTA__|\$RUTA|g\" gestion-ventas.desktop > ~/.local/share/applications/gestion-ventas.desktop"
