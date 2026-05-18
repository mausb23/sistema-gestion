from sqlalchemy import Column, Integer, String, Index
from app.database import Base


class Configuracion(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), unique=True, nullable=False, index=True)
    valor = Column(String(500), default="")
