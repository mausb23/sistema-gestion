from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)
    cantidad = Column(Float, default=0)
    stock_resultante = Column(Float, default=0)
    motivo = Column(String(255), default="")
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha = Column(DateTime, default=datetime.now, index=True)

    producto = relationship("Producto", lazy="selectin")
    usuario = relationship("Usuario", lazy="selectin")

    __table_args__ = (
        Index("idx_mov_inv_producto_fecha", "producto_id", "fecha"),
    )
