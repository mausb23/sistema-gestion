import json
from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.caja import CierreCaja, MovimientoCaja
from app.models.usuario import Usuario
from app.models.venta import Venta
from app.models.configuracion import Configuracion

router = APIRouter(prefix="/api/caja", tags=["caja"])


class AperturaCreate(BaseModel):
    usuarios_apertura: List[int]
    monto_inicial_crc: float = 0
    monto_inicial_usd: float = 0


class MovimientoCajaCreate(BaseModel):
    cierre_id: int
    tipo: str
    monto: float
    moneda: str = "CRC"
    descripcion: str = ""


class CierreCreate(BaseModel):
    conteo_crc: float = 0
    conteo_usd: float = 0
    datafono: float = 0
    usuarios_cierre: List[int] = []
    comentarios: Optional[str] = None


def ventas_del_dia(db: Session, apertura: datetime) -> dict:
    crc = db.query(func.coalesce(func.sum(Venta.total), 0)).filter(
        Venta.estado == "completada",
        Venta.fecha >= apertura,
        Venta.moneda == "CRC",
    ).scalar()
    usd = db.query(func.coalesce(func.sum(Venta.total), 0)).filter(
        Venta.estado == "completada",
        Venta.fecha >= apertura,
        Venta.moneda == "USD",
    ).scalar()
    return {"crc": float(crc), "usd": float(usd)}


def obtener_tc(db: Session) -> float:
    tc = db.query(Configuracion).filter(Configuracion.clave == "tipo_cambio_compra").first()
    return float(tc.valor) if tc else 450


def _sum_movs(movimientos, tipo, moneda=None):
    total = 0
    for m in movimientos:
        if m.tipo != tipo:
            continue
        if moneda and m.moneda != moneda:
            continue
        total += m.monto
    return total


def _nombres_usuarios(db: Session, ids: List[int]) -> List[str]:
    if not ids:
        return []
    usuarios = db.query(Usuario).filter(Usuario.id.in_(ids), Usuario.activo == True).all()
    mapa = {u.id: u.nombre for u in usuarios}
    return [mapa.get(uid, f"#{uid}") for uid in ids]


@router.get("/estado")
def estado_caja(db: Session = Depends(get_db)):
    caja = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if not caja:
        return {"abierta": False}
    ingresos_crc = _sum_movs(caja.movimientos, "ingreso", "CRC")
    ingresos_usd = _sum_movs(caja.movimientos, "ingreso", "USD")
    egresos_crc = _sum_movs(caja.movimientos, "egreso", "CRC")
    egresos_usd = _sum_movs(caja.movimientos, "egreso", "USD")
    depositos_crc = _sum_movs(caja.movimientos, "deposito", "CRC")
    depositos_usd = _sum_movs(caja.movimientos, "deposito", "USD")
    v = ventas_del_dia(db, caja.fecha_apertura)
    esperado_crc = caja.monto_inicial_crc + v["crc"] + ingresos_crc - egresos_crc - depositos_crc
    esperado_usd = caja.monto_inicial_usd + v["usd"] + ingresos_usd - egresos_usd - depositos_usd
    ids_ap = caja.apertura_usuarios
    return {
        "abierta": True,
        "id": caja.id,
        "usuarios_apertura": ids_ap,
        "usuarios_apertura_nombres": _nombres_usuarios(db, ids_ap),
        "fecha_apertura": caja.fecha_apertura,
        "monto_inicial_crc": caja.monto_inicial_crc,
        "monto_inicial_usd": caja.monto_inicial_usd,
        "ventas_crc": v["crc"],
        "ventas_usd": v["usd"],
        "ingresos_crc": ingresos_crc,
        "ingresos_usd": ingresos_usd,
        "egresos_crc": egresos_crc,
        "egresos_usd": egresos_usd,
        "depositos_crc": depositos_crc,
        "depositos_usd": depositos_usd,
        "esperado_crc": esperado_crc,
        "esperado_usd": esperado_usd,
        "conteo_crc": caja.conteo_crc,
        "conteo_usd": caja.conteo_usd,
        "datafono": caja.datafono,
        "diferencia_crc": caja.diferencia_crc,
        "diferencia_usd": caja.diferencia_usd,
        "comentarios": caja.comentarios,
        "movimientos": caja.movimientos,
    }


@router.post("/abrir")
def abrir_caja(data: AperturaCreate, db: Session = Depends(get_db)):
    abierta = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if abierta:
        return {"error": "Ya hay una caja abierta"}
    c = CierreCaja(
        usuario_id=data.usuarios_apertura[0] if data.usuarios_apertura else 1,
        usuarios_apertura=json.dumps(data.usuarios_apertura),
        monto_inicial_crc=data.monto_inicial_crc,
        monto_inicial_usd=data.monto_inicial_usd,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.post("/cerrar")
def cerrar_caja(data: CierreCreate, db: Session = Depends(get_db)):
    caja = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if not caja:
        return {"error": "No hay caja abierta"}
    ingresos_crc = _sum_movs(caja.movimientos, "ingreso", "CRC")
    egresos_crc = _sum_movs(caja.movimientos, "egreso", "CRC")
    depositos_crc = _sum_movs(caja.movimientos, "deposito", "CRC")
    depositos_usd = _sum_movs(caja.movimientos, "deposito", "USD")
    v = ventas_del_dia(db, caja.fecha_apertura)
    esperado_crc = caja.monto_inicial_crc + v["crc"] + ingresos_crc - egresos_crc - depositos_crc
    esperado_usd = caja.monto_inicial_usd + v["usd"] - depositos_usd
    caja.conteo_crc = data.conteo_crc
    caja.conteo_usd = data.conteo_usd
    caja.datafono = data.datafono
    if data.usuarios_cierre:
        caja.usuario_cierre_id = data.usuarios_cierre[0]
        caja.usuarios_cierre = json.dumps(data.usuarios_cierre)
    caja.comentarios = data.comentarios
    caja.diferencia_crc = round(data.conteo_crc - esperado_crc, 2)
    caja.diferencia_usd = round(data.conteo_usd - esperado_usd, 2)
    caja.fecha_cierre = datetime.now()
    caja.estado = "cerrada"
    db.commit()
    return caja


@router.post("/movimiento")
def registrar_movimiento(data: MovimientoCajaCreate, db: Session = Depends(get_db)):
    m = MovimientoCaja(**data.model_dump())
    db.add(m)
    db.commit()
    return m


def _serializar_historial(c, db):
    ids_ap = c.apertura_usuarios
    ids_cr = c.cierre_usuarios if c.fecha_cierre else []
    return {
        "id": c.id,
        "fecha_apertura": c.fecha_apertura,
        "fecha_cierre": c.fecha_cierre,
        "usuarios_apertura": ids_ap,
        "usuarios_apertura_nombres": _nombres_usuarios(db, ids_ap),
        "usuarios_cierre": ids_cr,
        "usuarios_cierre_nombres": _nombres_usuarios(db, ids_cr),
        "monto_inicial_crc": c.monto_inicial_crc,
        "monto_inicial_usd": c.monto_inicial_usd,
        "conteo_crc": c.conteo_crc,
        "conteo_usd": c.conteo_usd,
        "datafono": c.datafono,
        "diferencia_crc": c.diferencia_crc,
        "diferencia_usd": c.diferencia_usd,
        "comentarios": c.comentarios,
    }


@router.get("/historial")
def historial(db: Session = Depends(get_db)):
    cierres = db.query(CierreCaja).order_by(CierreCaja.fecha_apertura.desc()).limit(50).all()
    return [_serializar_historial(c, db) for c in cierres]
