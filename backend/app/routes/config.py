from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.configuracion import Configuracion

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    valor: str


VALORES_DEFECTO = {
    "nombre_negocio": "Mi Negocio",
    "moneda_defecto": "CRC",
    "simbolo_moneda": "₡",
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
