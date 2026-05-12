import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.database import SessionLocal
from app.models.configuracion import Configuracion


def leer_smtp_config():
    db = SessionLocal()
    try:
        claves = db.query(Configuracion).filter(
            Configuracion.clave.in_(["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from", "nombre_negocio"])
        ).all()
        cfg = {c.clave: c.valor for c in claves}
        return cfg
    finally:
        db.close()


def enviar_email(destinatario: str, asunto: str, html: str) -> dict:
    cfg = leer_smtp_config()
    host = cfg.get("smtp_host", "")
    port = int(cfg.get("smtp_port", 587))
    user = cfg.get("smtp_user", "")
    password = cfg.get("smtp_password", "")
    from_addr = cfg.get("smtp_from", user)

    if not host or not user:
        return {"error": "SMTP no configurado"}

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{cfg.get('nombre_negocio', 'Tienda')} <{from_addr}>"
    msg["To"] = destinatario
    msg["Subject"] = asunto
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.ehlo()
            if port == 587:
                server.starttls(context=ctx)
                server.ehlo()
            if user:
                server.login(user, password)
            server.sendmail(from_addr, [destinatario], msg.as_string())
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}


def html_recibo(venta, items, negocio: str) -> str:
    filas = "".join(
        f"<tr><td style='padding:6px;border-bottom:1px solid #ddd'>{i.nombre}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #ddd;text-align:center'>{i.cantidad}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #ddd;text-align:right'>₡{i.subtotal:,.2f}</td></tr>"
        for i in items
    )
    moneda = venta.moneda or "CRC"
    simbolo = "$" if moneda == "USD" else "₡"
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="background:#2563eb;color:white;padding:20px;border-radius:10px 10px 0 0;text-align:center">
<h2 style="margin:0">{negocio}</h2>
</div>
<div style="border:1px solid #ddd;border-top:0;padding:20px;border-radius:0 0 10px 10px">
<p><strong>Recibo de venta #{venta.id}</strong></p>
<p>Fecha: {venta.fecha.strftime('%d/%m/%Y %H:%M')}</p>
<p>Método de pago: {venta.metodo_pago}</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<thead><tr style="background:#f3f4f6">
<th style="padding:8px;text-align:left">Producto</th>
<th style="padding:8px;text-align:center">Cant</th>
<th style="padding:8px;text-align:right">Subtotal</th>
</tr></thead>
<tbody>{filas}</tbody>
</table>
<p style="font-size:18px;font-weight:bold;text-align:right;border-top:2px solid #000;padding-top:8px">
Total: {simbolo}{venta.total:,.2f}
</p>
<p style="color:#6b7280;font-size:12px;margin-top:20px">Gracias por su compra</p>
</div>
</body>
</html>"""


def html_pago_artesano(artesano: str, periodo: str, monto: float, negocio: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="background:#059669;color:white;padding:20px;border-radius:10px 10px 0 0;text-align:center">
<h2 style="margin:0">{negocio}</h2>
</div>
<div style="border:1px solid #ddd;border-top:0;padding:20px;border-radius:0 0 10px 10px">
<p><strong>Notificación de pago</strong></p>
<p>Artesano: {artesano}</p>
<p>Período: {periodo}</p>
<p>Monto pagado: ₡{monto:,.2f}</p>
<p style="color:#6b7280;font-size:12px;margin-top:20px">Gracias por su trabajo</p>
</div>
</body>
</html>"""
