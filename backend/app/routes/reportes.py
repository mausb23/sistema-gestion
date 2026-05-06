from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.venta import Venta, VentaItem
from app.models.producto import Producto
from app.models.artesano import Artesano

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


@router.get("/inventario-artesanos")
def inventario_artesanos(artesano_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Artesano).filter(Artesano.activo == True)
    if artesano_id:
        q = q.filter(Artesano.id == artesano_id)
    artesanos = q.order_by(Artesano.nombre).all()

    resultado = []
    for a in artesanos:
        productos = db.query(Producto).filter(
            Producto.artesano_id == a.id,
            Producto.activo == 1,
        ).order_by(Producto.codigo).all()

        en_stock = sum(1 for p in productos if p.stock > 0)
        sin_stock = sum(1 for p in productos if p.stock <= 0)

        resultado.append({
            "id": a.id,
            "codigo": a.codigo or "",
            "nombre": a.nombre,
            "comunidad": a.comunidad.nombre if a.comunidad else "",
            "cultura": a.comunidad.cultura if a.comunidad else "",
            "total_productos": len(productos),
            "en_stock": en_stock,
            "sin_stock": sin_stock,
            "productos": [
                {
                    "codigo": p.codigo,
                    "nombre": p.nombre,
                    "stock": p.stock,
                    "precio": p.precio,
                    "costo": p.costo,
                }
                for p in productos
            ],
        })

    return resultado
