#!/bin/bash
# Configura permisos udev para impresora térmica USB (ESC/POS)
# Uso: sudo ./permisos-impresora.sh VID PID
# Ejemplo: sudo ./permisos-impresora.sh 0416 5011

if [ $# -ne 2 ]; then
  echo "Uso: sudo $0 <vendor_id> <product_id>"
  echo "Ej: sudo $0 0416 5011"
  exit 1
fi

VID="$1"
PID="$2"

RULE_FILE="/etc/udev/rules.d/99-impresora-termica.rules"
echo "SUBSYSTEM==\"usb\", ATTRS{idVendor}==\"$VID\", ATTRS{idProduct}==\"$PID\", MODE=\"0666\"" | sudo tee "$RULE_FILE"

sudo udevadm control --reload-rules
sudo udevadm trigger

echo "Regla creada en $RULE_FILE"
echo "Desconectá y volvé a conectar la impresora para aplicar los cambios."
