from sqlalchemy import Column, Integer, String
from app.database import Base


class Comunidad(Base):
    __tablename__ = "comunidades"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(10), nullable=False)
    nombre = Column(String(200), nullable=False)
    territorio = Column(String(200), default="")
    cultura = Column(String(200), default="")
