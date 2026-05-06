from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.caja import CierreCaja, MovimientoCaja

router = APIRouter(prefix="/api/caja", tags=["caja"])


class AperturaCreate(BaseModel):
    usuario_id: int
    monto_inicial: float = 0


class MovimientoCajaCreate(BaseModel):
    cierre_id: int
    tipo: str
    monto: float
    descripcion: str = ""


@router.get("/estado")
def estado_caja(db: Session = Depends(get_db)):
    caja = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if not caja:
        return {"abierta": False}
    ingresos = sum(m.monto for m in caja.movimientos if m.tipo == "ingreso")
    egresos = sum(m.monto for m in caja.movimientos if m.tipo == "egreso")
    ventas = sum(m.monto for m in caja.movimientos if m.tipo == "venta")
    return {
        "abierta": True,
        "id": caja.id,
        "usuario": caja.usuario.nombre if caja.usuario else "",
        "fecha_apertura": caja.fecha_apertura,
        "monto_inicial": caja.monto_inicial,
        "ingresos": ingresos,
        "egresos": egresos,
        "ventas": ventas,
        "saldo_actual": caja.monto_inicial + ingresos + ventas - egresos,
    }


@router.post("/abrir")
def abrir_caja(data: AperturaCreate, db: Session = Depends(get_db)):
    abierta = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if abierta:
        return {"error": "Ya hay una caja abierta"}
    c = CierreCaja(usuario_id=data.usuario_id, monto_inicial=data.monto_inicial)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.post("/cerrar")
def cerrar_caja(db: Session = Depends(get_db)):
    caja = db.query(CierreCaja).filter(CierreCaja.estado == "abierta").first()
    if not caja:
        return {"error": "No hay caja abierta"}
    ingresos = sum(m.monto for m in caja.movimientos if m.tipo in ("ingreso", "venta"))
    egresos = sum(m.monto for m in caja.movimientos if m.tipo == "egreso")
    caja.monto_final = caja.monto_inicial + ingresos - egresos
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
