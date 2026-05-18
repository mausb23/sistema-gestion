#!/bin/bash
export PATH="$HOME/node-v24.15.0-linux-x64/bin:$PATH"
cd "/mnt/c/Users/mausb/Documents/Proyectos Programación/gestion-ventas/frontend"
echo "Starting npm install..."
npm install 2>&1 | tail -10
echo "Done npm install"
