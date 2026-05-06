from sqlalchemy import Column, Integer, String
from app.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    telefono = Column(String(50), default="")
    email = Column(String(200), default="")
    direccion = Column(String(500), default="")
