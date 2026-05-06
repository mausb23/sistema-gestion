from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.producto import Producto

router = APIRouter(prefix="/api/productos", tags=["productos"])


class ProductoCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: str = ""
    categoria_id: Optional[int] = None
    artesano_id: Optional[int] = None
    precio: float = 0
    costo: float = 0
    moneda: str = "CRC"
    stock: float = 0
    stock_minimo: float = 0


@router.get("")
def listar(
    busqueda: str = "",
    categoria_id: Optional[int] = None,
    solo_activos: bool = True,
    db: Session = Depends(get_db),
):
    q = db.query(Producto)
    if solo_activos:
        q = q.filter(Producto.activo == 1)
    if categoria_id:
        q = q.filter(Producto.categoria_id == categoria_id)
    if busqueda:
        q = q.filter(
            Producto.nombre.ilike(f"%{busqueda}%")
            | Producto.codigo.ilike(f"%{busqueda}%")
        )
    return q.order_by(Producto.nombre).all()


@router.get("/{producto_id}")
def obtener(producto_id: int, db: Session = Depends(get_db)):
    p = db.query(Producto).get(producto_id)
    if not p:
        return {"error": "Producto no encontrado"}
    return p


@router.post("")
def crear(data: ProductoCreate, db: Session = Depends(get_db)):
    p = Producto(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{producto_id}")
def actualizar(producto_id: int, data: ProductoCreate, db: Session = Depends(get_db)):
    p = db.query(Producto).get(producto_id)
    if not p:
        return {"error": "Producto no encontrado"}
    for key, val in data.model_dump().items():
        setattr(p, key, val)
    db.commit()
    return p


@router.delete("/{producto_id}")
def eliminar(producto_id: int, db: Session = Depends(get_db)):
    p = db.query(Producto).get(producto_id)
    if not p:
        return {"error": "Producto no encontrado"}
    p.activo = 0
    db.commit()
    return {"ok": True}
