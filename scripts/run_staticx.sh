#!/bin/bash
export PATH="/tmp/bin:$HOME/.local/bin:$PATH"
BASEDIR="/home/mausb/build-gv/backend/dist"

echo "=== Running staticx ==="
"$HOME/.local/bin/staticx" "$BASEDIR/gestion-ventas" "$BASEDIR/gestion-ventas-static" 2>&1
echo "EXIT=$?"
ls -lh "$BASEDIR/gestion-ventas-static"
