from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.venta import Venta, VentaItem
from app.models.producto import Producto

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


@router.get("/ventas-por-dia")
def ventas_por_dia(desde: str = "", hasta: str = "", db: Session = Depends(get_db)):
    hoy = date.today()
    inicio = datetime.fromisoformat(desde) if desde else datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
    fin = datetime.fromisoformat(hasta) if hasta else datetime.now()
    rows = (
        db.query(func.date(Venta.fecha).label("dia"), func.sum(Venta.total).label("total"), func.count(Venta.id).label("cantidad"))
        .filter(Venta.fecha >= inicio, Venta.fecha <= fin, Venta.estado == "completada")
        .group_by(func.date(Venta.fecha))
        .order_by("dia")
        .all()
    )
    return [{"dia": r.dia, "total": float(r.total), "cantidad": r.cantidad} for r in rows]


@router.get("/productos-mas-vendidos")
def productos_mas_vendidos(limite: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(
            Producto.nombre,
            func.sum(VentaItem.cantidad).label("cantidad"),
            func.sum(VentaItem.subtotal).label("total"),
        )
        .join(VentaItem, VentaItem.producto_id == Producto.id)
        .join(Venta, Venta.id == VentaItem.venta_id)
        .filter(Venta.estado == "completada")
        .group_by(Producto.id)
        .order_by(func.sum(VentaItem.cantidad).desc())
        .limit(limite)
        .all()
    )
    return [{"nombre": r.nombre, "cantidad": float(r.cantidad), "total": float(r.total)} for r in rows]


@router.get("/resumen")
def resumen(db: Session = Depends(get_db)):
    hoy = date.today()
    inicio = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
    fin = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)

    ventas_hoy = db.query(func.sum(Venta.total), func.count(Venta.id)).filter(
        Venta.fecha >= inicio, Venta.fecha <= fin, Venta.estado == "completada"
    ).first()

    total_productos = db.query(func.count(Producto.id)).filter(Producto.activo == 1).scalar()
    stock_bajo = db.query(func.count(Producto.id)).filter(
        Producto.activo == 1, Producto.stock <= Producto.stock_minimo
    ).scalar()

    return {
        "ventas_hoy": float(ventas_hoy[0] or 0),
        "ventas_hoy_cantidad": ventas_hoy[1] or 0,
        "total_productos": total_productos or 0,
        "stock_bajo": stock_bajo or 0,
    }
