from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class PagoArtesano(Base):
    __tablename__ = "pagos_artesano"

    id = Column(Integer, primary_key=True, index=True)
    artesano_id = Column(Integer, ForeignKey("artesanos.id"), nullable=False, index=True)
    periodo = Column(String(7), nullable=False, index=True)
    monto = Column(Float, default=0)
    fecha_pago = Column(DateTime, default=datetime.now)
    notas = Column(String(500), default="")

    artesano = relationship("Artesano", lazy="selectin")

    __table_args__ = (
        Index("idx_pagos_artesano_periodo", "artesano_id", "periodo"),
    )
