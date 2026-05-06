from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.caja import CierreCaja, MovimientoCaja
from app.models.venta import Venta
from app.models.configuracion import Configuracion

router = APIRouter(prefix="/api/caja", tags=["caja"])


class AperturaCreate(BaseModel):
    usuario_id: int
    monto_inicial_crc: float = 0
    monto_inicial_usd: float = 0


class MovimientoCajaCreate(BaseModel):
    cierre_id: int
    tipo: str
    monto: float
    descripcion: str = ""


class CierreCreate(BaseModel):
    conteo_crc: float = 0
    conteo_usd: float = 0
    datafono: float = 0


def ventas_del_dia(db: Session, apertura: datetime) -> dict:
    hoy = apertura.replace(hour=0, minute=0, second=0, microsecond=0)
    manana = hoy.replace(day=hoy.day + 1) if hoy.day < 28 else datetime(hoy.year, hoy.month + 1, 1)
    q = db.query(Venta).filter(
        Venta.estado == "completada",
        Venta.fecha >= apertura,
    )
    ventas = q.all()
    crc = sum(v.total for v in ventas if v.moneda == "CRC")
    usd = sum(v.total for v in ventas if v.moneda == "USD")
    return {"crc": crc, "usd": usd}


def obtener_tc(db: Session) -> float:
    tc = db.query(Configuracion).filter(Configuracion.clave == "tipo_cambio_compra").first()
    return float(tc.valor) if tc else 450


@router.get("/estado")
def estado_caja(db: Session = Depends(get_db)):
    caja = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if not caja:
        return {"abierta": False}
    ingresos = sum(m.monto for m in caja.movimientos if m.tipo == "ingreso")
    egresos = sum(m.monto for m in caja.movimientos if m.tipo == "egreso")
    v = ventas_del_dia(db, caja.fecha_apertura)
    esperado_crc = caja.monto_inicial_crc + v["crc"] + ingresos - egresos
    esperado_usd = caja.monto_inicial_usd + v["usd"]
    return {
        "abierta": True,
        "id": caja.id,
        "usuario": caja.usuario.nombre if caja.usuario else "",
        "fecha_apertura": caja.fecha_apertura,
        "monto_inicial_crc": caja.monto_inicial_crc,
        "monto_inicial_usd": caja.monto_inicial_usd,
        "ventas_crc": v["crc"],
        "ventas_usd": v["usd"],
        "ingresos": ingresos,
        "egresos": egresos,
        "esperado_crc": esperado_crc,
        "esperado_usd": esperado_usd,
        "conteo_crc": caja.conteo_crc,
        "conteo_usd": caja.conteo_usd,
        "datafono": caja.datafono,
        "diferencia_crc": caja.diferencia_crc,
        "diferencia_usd": caja.diferencia_usd,
        "movimientos": caja.movimientos,
    }


@router.post("/abrir")
def abrir_caja(data: AperturaCreate, db: Session = Depends(get_db)):
    abierta = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if abierta:
        return {"error": "Ya hay una caja abierta"}
    c = CierreCaja(
        usuario_id=data.usuario_id,
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
    ingresos = sum(m.monto for m in caja.movimientos if m.tipo in ("ingreso", "venta"))
    egresos = sum(m.monto for m in caja.movimientos if m.tipo == "egreso")
    v = ventas_del_dia(db, caja.fecha_apertura)
    esperado_crc = caja.monto_inicial_crc + v["crc"] + ingresos - egresos
    esperado_usd = caja.monto_inicial_usd + v["usd"]
    tc = obtener_tc(db)
    efectivo_total = (data.conteo_crc - caja.monto_inicial_crc) + (data.conteo_usd - caja.monto_inicial_usd) * tc + data.datafono
    caja.conteo_crc = data.conteo_crc
    caja.conteo_usd = data.conteo_usd
    caja.datafono = data.datafono
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


@router.get("/historial")
def historial(db: Session = Depends(get_db)):
    return db.query(CierreCaja).order_by(CierreCaja.fecha_apertura.desc()).limit(50).all()
