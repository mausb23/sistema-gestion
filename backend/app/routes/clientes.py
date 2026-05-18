from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.cliente import Cliente

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


class ClienteCreate(BaseModel):
    nombre: str
    telefono: str = ""
    email: str = ""
    direccion: str = ""


@router.get("")
def listar(busqueda: str = "", db: Session = Depends(get_db)):
    q = db.query(Cliente)
    if busqueda:
        q = q.filter(Cliente.nombre.ilike(f"%{busqueda}%"))
    return q.order_by(Cliente.nombre).all()


@router.post("")
def crear(data: ClienteCreate, db: Session = Depends(get_db)):
    c = Cliente(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{cliente_id}")
def actualizar(cliente_id: int, data: ClienteCreate, db: Session = Depends(get_db)):
    c = db.query(Cliente).get(cliente_id)
    if not c:
        return {"error": "Cliente no encontrado"}
    for key, val in data.model_dump().items():
        setattr(c, key, val)
    db.commit()
    return c


@router.delete("/{cliente_id}")
def eliminar(cliente_id: int, db: Session = Depends(get_db)):
    c = db.query(Cliente).get(cliente_id)
    if not c:
        return {"error": "Cliente no encontrado"}
    db.delete(c)
    db.commit()
    return {"ok": True}
