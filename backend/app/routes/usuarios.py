from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.usuario import Usuario

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


class UsuarioCreate(BaseModel):
    nombre: str
    rol: str = "vendedor"


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    rol: str
    activo: bool

    class Config:
        from_attributes = True


@router.get("")
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()


@router.post("")
def crear_usuario(data: UsuarioCreate, db: Session = Depends(get_db)):
    u = Usuario(**data.model_dump())
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.put("/{usuario_id}")
def actualizar_usuario(usuario_id: int, data: UsuarioCreate, db: Session = Depends(get_db)):
    u = db.query(Usuario).get(usuario_id)
    if not u:
        return {"error": "Usuario no encontrado"}
    u.nombre = data.nombre
    u.rol = data.rol
    db.commit()
    return u


@router.delete("/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    u = db.query(Usuario).get(usuario_id)
    if not u:
        return {"error": "Usuario no encontrado"}
    u.activo = False
    db.commit()
    return {"ok": True}
