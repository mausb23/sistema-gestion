import re
import subprocess
from io import BytesIO
from datetime import datetime
from app.models.configuracion import Configuracion

ETIQUETAS_METODO = {
    "efectivo": "Colones",
    "efectivo_dolares": "Dólares",
    "tarjeta": "Tarjeta",
    "sinpe": "SINPE",
}


def _obtener_config(db):
    def get(k, fallback=""):
        c = db.query(Configuracion).filter(Configuracion.clave == k).first()
        return c.valor if c else fallback

    return get("printer_vendor_id"), get("printer_product_id"), get("nombre_negocio", "Mi Negocio")


def detectar_impresoras():
    try:
        r = subprocess.run(["lsusb"], capture_output=True, text=True, timeout=5)
        dispositivos = []
        for line in r.stdout.strip().split("\n"):
            m = re.match(r"Bus \d+ Device \d+: ID ([0-9a-fA-F]{4}):([0-9a-fA-F]{4}) (.+)", line)
            if m:
                dispositivos.append({
                    "vid": m.group(1).lower(),
                    "pid": m.group(2).lower(),
                    "nombre": m.group(3),
                })
        return dispositivos
    except Exception:
        return []


def obtener_impresora(db):
    vid, pid, _ = _obtener_config(db)
    if not vid or not pid:
        return None, "Configure la impresora en Configuración (VID y PID)"
    try:
        from escpos.printer import Usb
        p = Usb(int(vid, 16), int(pid, 16), timeout=0)
        return p, None
    except ImportError:
        return None, "python-escpos no está instalado"
    except Exception as e:
        return None, f"Error al conectar: {e}"


def _formatear_metodo(metodo):
    if "+" in metodo:
        return "+".join(ETIQUETAS_METODO.get(m, m) for m in metodo.split("+"))
    return ETIQUETAS_METODO.get(metodo, metodo)


def formatear_ticket(venta, db):
    _, _, nombre_negocio = _obtener_config(db)
    metodo_label = _formatear_metodo(venta.metodo_pago)

    mono = "USD" if "+" not in venta.metodo_pago and "dolares" in venta.metodo_pago else "CRC"
    if "+" in venta.metodo_pago:
        mono = "CRC"
    simbolo = "$" if mono == "USD" else "₡"

    COL = 32
    lines = []
    lines.append("=" * COL)
    lines.append(f"  {nombre_negocio}")
    lines.append("=" * COL)
    lines.append(f"Venta #{venta.id}")
    lines.append(f"{venta.fecha.strftime('%d/%m/%Y %H:%M')}")
    lines.append(f"Atendió: {venta.usuario.nombre}")
    lines.append("-" * COL)
    lines.append(f"Item{' ' * 15}Cant   {simbolo}")
    for item in venta.items:
        p = item.producto
        nombre = p.nombre[:20] if p else "Producto"
        cant = str(item.cantidad)
        subtotal = round(item.subtotal, 2)
        fila = f"{nombre:<20}{cant:>5}  {subtotal:>7.2f}"
        if len(lines[-1].encode("utf-8")) > 40:
            lines[-1] += " (truncado)"
        lines.append(fila)
    lines.append("-" * COL)
    lines.append(f"{'Total:':>20}  {venta.total:>10.2f}")
    lines.append(f"Método: {metodo_label}")
    lines.append("=" * COL)
    lines.append("  ¡Gracias por su compra!")
    lines.append("=" * COL)
    return "\n".join(lines)


def imprimir(venta, db):
    p, err = obtener_impresora(db)
    if err:
        return {"error": err}
    try:
        p.set(align="center")
        p.text(formatear_ticket(venta, db) + "\n\n")
        p.cut()
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}


def imprimir_prueba(db):
    p, err = obtener_impresora(db)
    if err:
        return {"error": err}
    try:
        p.set(align="center")
        p.text("=" * 32 + "\n")
        p.text("     PRUEBA DE IMPRESIÓN\n")
        p.text("=" * 32 + "\n")
        p.text("Si ves esto, la impresora\n")
        p.text("funciona correctamente.\n\n")
        p.text(f"{datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
        p.text("=" * 32 + "\n")
        p.cut()
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}
