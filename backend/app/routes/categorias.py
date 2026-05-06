from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.categoria import Categoria

router = APIRouter(prefix="/api/categorias", tags=["categorias"])


class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: str = ""


@router.get("")
def listar(db: Session = Depends(get_db)):
    return db.query(Categoria).order_by(Categoria.nombre).all()


@router.post("")
def crear(data: CategoriaCreate, db: Session = Depends(get_db)):
    c = Categoria(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{categoria_id}")
def actualizar(categoria_id: int, data: CategoriaCreate, db: Session = Depends(get_db)):
    c = db.query(Categoria).get(categoria_id)
    if not c:
        return {"error": "Categoría no encontrada"}
    c.nombre = data.nombre
    c.descripcion = data.descripcion
    db.commit()
    return c


@router.delete("/{categoria_id}")
def eliminar(categoria_id: int, db: Session = Depends(get_db)):
    c = db.query(Categoria).get(categoria_id)
    if not c:
        return {"error": "Categoría no encontrada"}
    db.delete(c)
    db.commit()
    return {"ok": True}
