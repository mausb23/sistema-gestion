from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    fecha = Column(DateTime, default=datetime.now)
    total = Column(Float, default=0)
    moneda = Column(String(10), default="CRC")
    metodo_pago = Column(String(50), default="efectivo")
    pagos_detalle = Column(Text, nullable=True)
    estado = Column(String(20), default="completada")

    usuario = relationship("Usuario", lazy="joined")
    cliente = relationship("Cliente", lazy="joined")
    items = relationship("VentaItem", back_populates="venta", lazy="joined", cascade="all, delete-orphan")


class VentaItem(Base):
    __tablename__ = "venta_items"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Float, default=1)
    precio_unitario = Column(Float, default=0)
    subtotal = Column(Float, default=0)

    venta = relationship("Venta", back_populates="items")
    producto = relationship("Producto", lazy="joined")
