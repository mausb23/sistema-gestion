from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.artesano import Artesano

router = APIRouter(prefix="/api/artesanos", tags=["artesanos"])


class ArtesanoCreate(BaseModel):
    nombre: str
    telefono: str = ""
    email: str = ""


@router.get("")
def listar(busqueda: str = "", db: Session = Depends(get_db)):
    q = db.query(Artesano).filter(Artesano.activo == True)
    if busqueda:
        q = q.filter(Artesano.nombre.ilike(f"%{busqueda}%"))
    return q.order_by(Artesano.nombre).all()


@router.post("")
def crear(data: ArtesanoCreate, db: Session = Depends(get_db)):
    a = Artesano(**data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{artesano_id}")
def actualizar(artesano_id: int, data: ArtesanoCreate, db: Session = Depends(get_db)):
    a = db.query(Artesano).get(artesano_id)
    if not a:
        return {"error": "Artesano no encontrado"}
    for key, val in data.model_dump().items():
        setattr(a, key, val)
    db.commit()
    return a


@router.delete("/{artesano_id}")
def eliminar(artesano_id: int, db: Session = Depends(get_db)):
    a = db.query(Artesano).get(artesano_id)
    if not a:
        return {"error": "Artesano no encontrado"}
    a.activo = False
    db.commit()
    return {"ok": True}
