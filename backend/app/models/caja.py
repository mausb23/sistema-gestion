from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class CierreCaja(Base):
    __tablename__ = "cierres_caja"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_apertura = Column(DateTime, default=datetime.now)
    fecha_cierre = Column(DateTime, nullable=True)
    monto_inicial_crc = Column(Float, default=0)
    monto_inicial_usd = Column(Float, default=0)
    conteo_crc = Column(Float, nullable=True)
    conteo_usd = Column(Float, nullable=True)
    datafono = Column(Float, nullable=True)
    diferencia_crc = Column(Float, nullable=True)
    diferencia_usd = Column(Float, nullable=True)
    estado = Column(String(20), default="abierta")

    usuario = relationship("Usuario", lazy="joined")
    movimientos = relationship("MovimientoCaja", back_populates="cierre", lazy="joined", cascade="all, delete-orphan")


class MovimientoCaja(Base):
    __tablename__ = "movimientos_caja"

    id = Column(Integer, primary_key=True, index=True)
    cierre_id = Column(Integer, ForeignKey("cierres_caja.id"), nullable=False)
    tipo = Column(String(20), nullable=False)
    monto = Column(Float, default=0)
    descripcion = Column(String(255), default="")
    fecha = Column(DateTime, default=datetime.now)

    cierre = relationship("CierreCaja", back_populates="movimientos")
