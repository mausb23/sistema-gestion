from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    fecha = Column(DateTime, default=datetime.now, index=True)
    total = Column(Float, default=0)
    moneda = Column(String(10), default="CRC")
    metodo_pago = Column(String(50), default="efectivo")
    pagos_detalle = Column(Text, nullable=True)
    estado = Column(String(20), default="completada", index=True)

    usuario = relationship("Usuario", lazy="selectin")
    cliente = relationship("Cliente", lazy="selectin")
    items = relationship("VentaItem", back_populates="venta", lazy="selectin", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_ventas_fecha_estado", "fecha", "estado"),
        Index("idx_ventas_fecha_moneda", "fecha", "moneda"),
    )


class VentaItem(Base):
    __tablename__ = "venta_items"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False, index=True)
    cantidad = Column(Float, default=1)
    precio_unitario = Column(Float, default=0)
    subtotal = Column(Float, default=0)

    venta = relationship("Venta", back_populates="items")
    producto = relationship("Producto", lazy="selectin")
