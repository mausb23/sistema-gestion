from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.comunidad import Comunidad

router = APIRouter(prefix="/api/comunidades", tags=["comunidades"])


@router.get("")
def listar(db: Session = Depends(get_db)):
    return db.query(Comunidad).order_by(Comunidad.codigo).all()
