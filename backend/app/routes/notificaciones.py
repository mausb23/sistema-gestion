from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.venta import Venta
from app.models.configuracion import Configuracion
from app.services.email import enviar_email, html_recibo

router = APIRouter(prefix="/api/notificaciones", tags=["notificaciones"])


@router.post("/enviar-recibo/{venta_id}")
def enviar_recibo(venta_id: int, destinatario: str = "", db: Session = Depends(get_db)):
    venta = db.query(Venta).get(venta_id)
    if not venta:
        return {"error": "Venta no encontrada"}

    email = destinatario.strip()
    if not email and venta.cliente and venta.cliente.email:
        email = venta.cliente.email
    if not email:
        return {"error": "No hay correo del cliente"}

    negocio = "Mi Negocio"
    c = db.query(Configuracion).filter(Configuracion.clave == "nombre_negocio").first()
    if c:
        negocio = c.valor

    items = [i for i in venta.items]
    html = html_recibo(venta, items, negocio)
    resultado = enviar_email(email, f"Recibo de compra #{venta.id} - {negocio}", html)
    return resultado
