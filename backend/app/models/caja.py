import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base


class CierreCaja(Base):
    __tablename__ = "cierres_caja"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario_cierre_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    usuarios_apertura = Column(Text, nullable=True)
    usuarios_cierre = Column(Text, nullable=True)
    fecha_apertura = Column(DateTime, default=datetime.now, index=True)
    fecha_cierre = Column(DateTime, nullable=True)
    monto_inicial_crc = Column(Float, default=0)
    monto_inicial_usd = Column(Float, default=0)
    conteo_crc = Column(Float, nullable=True)
    conteo_usd = Column(Float, nullable=True)
    datafono = Column(Float, nullable=True)
    diferencia_crc = Column(Float, nullable=True)
    diferencia_usd = Column(Float, nullable=True)
    estado = Column(String(20), default="abierta", index=True)
    comentarios = Column(Text, nullable=True)

    movimientos = relationship("MovimientoCaja", back_populates="cierre", lazy="selectin", cascade="all, delete-orphan")

    @property
    def apertura_usuarios(self):
        if self.usuarios_apertura:
            try:
                return json.loads(self.usuarios_apertura)
            except (json.JSONDecodeError, TypeError):
                return [self.usuario_id]
        return [self.usuario_id]

    @property
    def cierre_usuarios(self):
        if self.usuarios_cierre:
            try:
                return json.loads(self.usuarios_cierre)
            except (json.JSONDecodeError, TypeError):
                return [self.usuario_cierre_id] if self.usuario_cierre_id else []
        return [self.usuario_cierre_id] if self.usuario_cierre_id else []

    __table_args__ = (
        Index("idx_cierres_estado_fecha", "estado", "fecha_apertura"),
    )


class MovimientoCaja(Base):
    __tablename__ = "movimientos_caja"

    id = Column(Integer, primary_key=True, index=True)
    cierre_id = Column(Integer, ForeignKey("cierres_caja.id"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)
    monto = Column(Float, default=0)
    moneda = Column(String(10), default="CRC")
    descripcion = Column(String(255), default="")
    fecha = Column(DateTime, default=datetime.now)

    cierre = relationship("CierreCaja", back_populates="movimientos")
