#!/bin/bash
set -e

export PATH="$HOME/.local/bin:/tmp/bin:$PATH"
SRC="/mnt/c/Users/mausb/Documents/Proyectos Programación/gestion-ventas"
VER="v0.12.05.2026-1"
APPDIR="$HOME/build-appdir/$VER"

echo "=== 1. Preparando AppDir ==="
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/128x128/apps"

echo "=== 2. Construyendo frontend ==="
cd "$SRC/frontend"
npm install --silent 2>/dev/null
npm run build 2>/dev/null

echo "=== 3. Instalando dependencias Python ==="
mkdir -p "$APPDIR/usr/python"
pip3 install --quiet --no-input --break-system-packages --target "$APPDIR/usr/python" -r "$SRC/backend/requirements.txt" 2>&1 | tail -3
pip3 install --quiet --no-input --break-system-packages --target "$APPDIR/usr/python" pywebview uvicorn 2>&1 | tail -3

echo "=== 4. Copiando código de la app ==="
mkdir -p "$APPDIR/usr/app"
cp -r "$SRC/backend/app" "$APPDIR/usr/app/"
cp -r "$SRC/backend/static" "$APPDIR/usr/app/static/" 2>/dev/null || true
cp "$SRC/backend/run.py" "$APPDIR/usr/app/"
cp "$SRC/backend/requirements.txt" "$APPDIR/usr/app/"

echo "=== 5. Creando AppRun ==="
cat > "$APPDIR/AppRun" << 'APPRUN'
#!/bin/bash
set -e
HERE="$(dirname "$(readlink -f "$0")")"
export PYTHONPATH="$HERE/usr/python:$PYTHONPATH"
export PATH="$HERE/usr/python/bin:$PATH"
cd "$HERE/usr/app"
exec python3 -c "
import sys
sys.path.insert(0, '$HERE/usr/python')
from app.main import main
main()
"
APPRUN
chmod +x "$APPDIR/AppRun"

echo "=== 6. Creando .desktop ==="
cat > "$APPDIR/gestion-ventas.desktop" << DESK
[Desktop Entry]
Name=Gestión de Ventas
Comment=Sistema de gestión de ventas
Exec=gestion-ventas
Icon=gestion-ventas
Terminal=false
Type=Application
Categories=Office;Finance;
DESK

echo "=== 7. Copiando icono ==="
cp "$SRC/Versiones/icon.svg" "$APPDIR/gestion-ventas.svg"
cp "$SRC/Versiones/icon.svg" "$APPDIR/usr/share/icons/hicolor/128x128/apps/gestion-ventas.svg"

echo "=== 8. Descargando appimagetool ==="
if [ ! -f /tmp/appimagetool ]; then
    curl -sL https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage -o /tmp/appimagetool
    chmod +x /tmp/appimagetool
fi

echo "=== 9. Empaquetando AppImage ==="
export ARCH=x86_64
/tmp/appimagetool --appimage-extract-and-run --no-appstream "$APPDIR" "$SRC/Versiones/$VER.AppImage" 2>&1

echo "=== 10. Fijando permisos ==="
cp "$SRC/Versiones/$VER.AppImage" /tmp/
chmod +x "/tmp/$VER.AppImage"
cp "/tmp/$VER.AppImage" "$SRC/Versiones/$VER.AppImage"

echo "=== 11. Resultado ==="
ls -lh "$SRC/Versiones/$VER.AppImage"
echo "=== Hecho! ==="
