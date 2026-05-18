from sqlalchemy import Column, Integer, String, Boolean, Index
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    rol = Column(String(20), default="vendedor")
    activo = Column(Boolean, default=True, index=True)

    __table_args__ = (
        Index("idx_usuarios_activo", "activo"),
    )
