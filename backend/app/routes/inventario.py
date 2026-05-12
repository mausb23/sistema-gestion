from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.producto import Producto
from app.models.inventario import MovimientoInventario

router = APIRouter(prefix="/api/inventario", tags=["inventario"])


class MovimientoCreate(BaseModel):
    producto_id: int
    tipo: str
    cantidad: float
    motivo: str = ""
    usuario_id: int = 0


@router.get("/movimientos")
def listar_movimientos(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(MovimientoInventario)
    total = q.count()
    items = q.order_by(MovimientoInventario.fecha.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.post("/movimientos")
def crear_movimiento(data: MovimientoCreate, db: Session = Depends(get_db)):
    p = db.query(Producto).get(data.producto_id)
    if not p:
        return {"error": "Producto no encontrado"}

    stock_anterior = p.stock
    if data.tipo == "entrada":
        p.stock += data.cantidad
    elif data.tipo == "salida":
        p.stock -= data.cantidad
    elif data.tipo == "ajuste":
        p.stock = data.cantidad

    m = MovimientoInventario(
        producto_id=data.producto_id,
        tipo=data.tipo,
        cantidad=data.cantidad,
        stock_resultante=p.stock,
        motivo=data.motivo,
        usuario_id=data.usuario_id,
    )
    db.add(m)
    db.commit()
    return m


@router.get("/stock-bajo")
def stock_bajo(
    busqueda: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Producto).filter(
        Producto.activo == 1,
        Producto.stock <= Producto.stock_minimo,
    )
    if busqueda:
        q = q.filter(
            Producto.nombre.ilike(f"%{busqueda}%")
            | Producto.codigo.ilike(f"%{busqueda}%")
        )
    total = q.count()
    items = q.order_by(Producto.nombre).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}
