from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.configuracion import Configuracion
from app.services.tipo_cambio import obtener_tipo_cambio

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    valor: str


VALORES_DEFECTO = {
    "nombre_negocio": "Mi Negocio",
    "moneda_defecto": "CRC",
    "simbolo_moneda": "₡",
    "tipo_cambio_compra": "450.00",
    "tipo_cambio_venta": "464.00",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_password": "",
    "smtp_from": "",
}


@router.get("")
def obtener_config(db: Session = Depends(get_db)):
    configs = db.query(Configuracion).all()
    result = {}
    for c in configs:
        result[c.clave] = c.valor
    for k, v in VALORES_DEFECTO.items():
        if k not in result:
            result[k] = v
    return result


@router.put("/{clave}")
def actualizar_config(clave: str, data: ConfigUpdate, db: Session = Depends(get_db)):
    c = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    if not c:
        c = Configuracion(clave=clave, valor=data.valor)
        db.add(c)
    else:
        c.valor = data.valor
    db.commit()
    return {"ok": True}


@router.post("/actualizar-tc")
def actualizar_tipo_cambio(db: Session = Depends(get_db)):
    tc = obtener_tipo_cambio()
    if not tc:
        return {"error": "No se pudo obtener el tipo de cambio"}
    for clave, valor in [("tipo_cambio_compra", tc["compra"]), ("tipo_cambio_venta", tc["venta"])]:
        c = db.query(Configuracion).filter(Configuracion.clave == clave).first()
        v = str(valor)
        if not c:
            c = Configuracion(clave=clave, valor=v)
            db.add(c)
        else:
            c.valor = v
    db.commit()
    return {"ok": True, "compra": tc["compra"], "venta": tc["venta"]}
