from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
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
def listar_movimientos(db: Session = Depends(get_db)):
    return db.query(MovimientoInventario).order_by(MovimientoInventario.fecha.desc()).limit(100).all()


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
def stock_bajo(db: Session = Depends(get_db)):
    return db.query(Producto).filter(
        Producto.activo == 1,
        Producto.stock <= Producto.stock_minimo,
    ).all()
