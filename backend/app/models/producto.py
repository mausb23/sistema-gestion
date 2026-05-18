from sqlalchemy import Column, Integer, String, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(500), default="")
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True, index=True)
    artesano_id = Column(Integer, ForeignKey("artesanos.id"), nullable=True, index=True)
    precio = Column(Float, default=0)
    costo = Column(Float, default=0)
    moneda = Column(String(10), default="CRC")
    stock = Column(Float, default=0)
    activo = Column(Integer, default=1, index=True)

    categoria = relationship("Categoria", lazy="selectin")
    artesano = relationship("Artesano", lazy="selectin")

    __table_args__ = (
        Index("idx_productos_activo_stock", "activo", "stock"),
    )
