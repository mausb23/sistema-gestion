from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class PagoArtesano(Base):
    __tablename__ = "pagos_artesano"

    id = Column(Integer, primary_key=True, index=True)
    artesano_id = Column(Integer, ForeignKey("artesanos.id"), nullable=False)
    periodo = Column(String(7), nullable=False)
    monto = Column(Float, default=0)
    fecha_pago = Column(DateTime, default=datetime.now)
    notas = Column(String(500), default="")

    artesano = relationship("Artesano", lazy="joined")
