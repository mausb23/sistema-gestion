from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AhorroArtesano(Base):
    __tablename__ = "ahorros_artesano"

    id = Column(Integer, primary_key=True, index=True)
    artesano_id = Column(Integer, ForeignKey("artesanos.id"), nullable=False)
    periodo = Column(String(7), nullable=False)
    monto_ahorrado = Column(Float, default=0)
    monto_pagado = Column(Float, default=0)
    fecha_pago = Column(DateTime, nullable=True)

    artesano = relationship("Artesano", lazy="joined")
