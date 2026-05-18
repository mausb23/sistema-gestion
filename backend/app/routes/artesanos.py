from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.artesano import Artesano

router = APIRouter(prefix="/api/artesanos", tags=["artesanos"])


class ArtesanoCreate(BaseModel):
    codigo: str = ""
    nombre: str
    telefono: str = ""
    email: str = ""
    comunidad_id: Optional[int] = None


@router.get("")
def listar(busqueda: str = "", pagina: int = 1, por_pagina: int = 120, db: Session = Depends(get_db)):
    q = db.query(Artesano).filter(Artesano.activo == True)
    if busqueda:
        filtro = f"%{busqueda}%"
        q = q.filter(or_(Artesano.nombre.ilike(filtro), Artesano.codigo.ilike(filtro)))
    total = q.count()
    artesanos = q.order_by(Artesano.nombre).offset((pagina - 1) * por_pagina).limit(por_pagina).all()
    return {
        "artesanos": artesanos,
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "paginas": max(1, (total + por_pagina - 1) // por_pagina),
    }


@router.post("")
def crear(data: ArtesanoCreate, db: Session = Depends(get_db)):
    a = Artesano(**data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{artesano_id}")
def actualizar(artesano_id: int, data: ArtesanoCreate, db: Session = Depends(get_db)):
    a = db.get(Artesano, artesano_id)
    if not a:
        return {"error": "Artesano no encontrado"}
    for key, val in data.model_dump().items():
        setattr(a, key, val)
    db.commit()
    return a


@router.delete("/{artesano_id}")
def eliminar(artesano_id: int, db: Session = Depends(get_db)):
    a = db.get(Artesano, artesano_id)
    if not a:
        return {"error": "Artesano no encontrado"}
    a.activo = False
    db.commit()
    return {"ok": True}
