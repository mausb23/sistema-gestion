import logging
from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.configuracion import Configuracion
from app.services.respaldo import (
    crear_respaldo,
    listar_respaldos,
    descargar_respaldo,
    restaurar_respaldo,
    cargar_respaldo_desde_bytes,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/backup", tags=["backup"])


class BackupConfigUpdate(BaseModel):
    intervalo_horas: int = 4
    max_copias: int = 30


@router.post("/crear")
def api_crear():
    return crear_respaldo()


@router.get("/listar")
def api_listar():
    return listar_respaldos()


@router.get("/descargar/{archivo}")
def api_descargar(archivo: str):
    res = descargar_respaldo(archivo)
    if isinstance(res, dict):
        return res
    return FileResponse(res, media_type="application/gzip", filename=archivo)


@router.post("/restaurar/{archivo}")
def api_restaurar(archivo: str):
    return restaurar_respaldo(archivo)


@router.post("/cargar")
async def api_cargar(archivo: UploadFile):
    if not archivo.filename or not archivo.filename.endswith(".gz"):
        return {"error": "El archivo debe ser .gz (respaldo comprimido)"}
    contenido = await archivo.read()
    return cargar_respaldo_desde_bytes(contenido)


@router.get("/config")
def obtener_config_backup(db: Session = Depends(get_db)):
    def get(k, default):
        c = db.query(Configuracion).filter(Configuracion.clave == k).first()
        return c.valor if c else default
    return {
        "intervalo_horas": int(get("backup_interval_horas", "4")),
        "max_copias": int(get("backup_max_copias", "30")),
    }


@router.put("/config")
def actualizar_config_backup(data: BackupConfigUpdate, db: Session = Depends(get_db)):
    for clave, valor in [("backup_interval_horas", str(data.intervalo_horas)), ("backup_max_copias", str(data.max_copias))]:
        c = db.query(Configuracion).filter(Configuracion.clave == clave).first()
        if not c:
            c = Configuracion(clave=clave, valor=valor)
            db.add(c)
        else:
            c.valor = valor
    db.commit()
    return {"ok": True}
