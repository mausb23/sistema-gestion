from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base


class Artesano(Base):
    __tablename__ = "artesanos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    telefono = Column(String(50), default="")
    email = Column(String(200), default="")
    activo = Column(Boolean, default=True)
