from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Artesano(Base):
    __tablename__ = "artesanos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), nullable=True)
    nombre = Column(String(200), nullable=False)
    telefono = Column(String(50), default="")
    email = Column(String(200), default="")
    comunidad_id = Column(Integer, ForeignKey("comunidades.id"), nullable=True, index=True)
    activo = Column(Boolean, default=True, index=True)

    comunidad = relationship("Comunidad", lazy="selectin")
