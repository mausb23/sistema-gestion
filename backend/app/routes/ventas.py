from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.venta import Venta, VentaItem
from app.models.producto import Producto
from app.models.inventario import MovimientoInventario

router = APIRouter(prefix="/api/ventas", tags=["ventas"])


class ItemInput(BaseModel):
    producto_id: int
    cantidad: float
    precio_unitario: float


class VentaCreate(BaseModel):
    usuario_id: int
    cliente_id: Optional[int] = None
    moneda: str = "MXN"
    metodo_pago: str = "efectivo"
    items: List[ItemInput]


@router.get("")
def listar(fecha_desde: Optional[str] = None, fecha_hasta: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Venta)
    if fecha_desde:
        q = q.filter(Venta.fecha >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        q = q.filter(Venta.fecha <= datetime.fromisoformat(fecha_hasta))
    return q.order_by(Venta.fecha.desc()).all()


@router.get("/hoy")
def ventas_hoy(db: Session = Depends(get_db)):
    hoy = date.today()
    inicio = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
    fin = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)
    q = db.query(Venta).filter(Venta.fecha >= inicio, Venta.fecha <= fin)
    ventas = q.order_by(Venta.fecha.desc()).all()
    total = sum(v.total for v in ventas)
    return {"ventas": ventas, "total": total, "cantidad": len(ventas)}


@router.post("")
def crear(data: VentaCreate, db: Session = Depends(get_db)):
    total = sum(item.cantidad * item.precio_unitario for item in data.items)
    venta = Venta(
        usuario_id=data.usuario_id,
        cliente_id=data.cliente_id,
        moneda=data.moneda,
        metodo_pago=data.metodo_pago,
        total=total,
    )
    db.add(venta)
    db.flush()

    for item in data.items:
        vi = VentaItem(
            venta_id=venta.id,
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=item.cantidad * item.precio_unitario,
        )
        db.add(vi)

        producto = db.query(Producto).get(item.producto_id)
        if producto:
            stock_anterior = producto.stock
            producto.stock -= item.cantidad
            db.add(MovimientoInventario(
                producto_id=item.producto_id,
                tipo="salida",
                cantidad=item.cantidad,
                stock_resultante=producto.stock,
                motivo=f"Venta #{venta.id}",
                usuario_id=data.usuario_id,
            ))

    db.commit()
    db.refresh(venta)
    return venta


@router.delete("/{venta_id}")
def eliminar(venta_id: int, db: Session = Depends(get_db)):
    v = db.query(Venta).get(venta_id)
    if not v:
        return {"error": "Venta no encontrada"}
    for item in v.items:
        producto = db.query(Producto).get(item.producto_id)
        if producto:
            producto.stock += item.cantidad
    v.estado = "anulada"
    db.commit()
    return {"ok": True}
