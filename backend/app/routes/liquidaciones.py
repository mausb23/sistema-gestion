from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.artesano import Artesano
from app.models.producto import Producto
from app.models.venta import Venta, VentaItem
from app.models.pago_artesano import PagoArtesano

router = APIRouter(prefix="/api/liquidaciones", tags=["liquidaciones"])


class PagoCreate(BaseModel):
    artesano_id: int
    periodo: str
    monto: float
    notas: str = ""


@router.get("/resumen")
def resumen(periodo: Optional[str] = None, db: Session = Depends(get_db)):
    if not periodo:
        hoy = datetime.now()
        periodo = f"{hoy.year}-{hoy.month:02d}"

    year, month = map(int, periodo.split("-"))
    inicio = datetime(year, month, 1, 0, 0, 0)
    if month == 12:
        fin = datetime(year + 1, 1, 1, 0, 0, 0)
    else:
        fin = datetime(year, month + 1, 1, 0, 0, 0)

    ventas = (
        db.query(VentaItem)
        .join(Venta)
        .join(Producto)
        .filter(Venta.fecha >= inicio, Venta.fecha < fin, Venta.estado == "completada")
        .all()
    )

    ventas_por_artesano = {}
    for item in ventas:
        artesano_id = item.producto.artesano_id
        if not artesano_id:
            continue
        if artesano_id not in ventas_por_artesano:
            ventas_por_artesano[artesano_id] = {"vendido": 0, "costo": 0}
        ventas_por_artesano[artesano_id]["vendido"] += item.subtotal
        ventas_por_artesano[artesano_id]["costo"] += item.cantidad * item.producto.costo

    pagos = (
        db.query(
            PagoArtesano.artesano_id,
            func.sum(PagoArtesano.monto).label("total_pagado"),
        )
        .filter(PagoArtesano.periodo == periodo)
        .group_by(PagoArtesano.artesano_id)
        .all()
    )
    pagos_dict = {p.artesano_id: float(p.total_pagado) for p in pagos}

    artesanos = db.query(Artesano).filter(Artesano.activo == True).all()
    resultado = []
    for a in artesanos:
        v = ventas_por_artesano.get(a.id, {"vendido": 0, "costo": 0})
        vendido = round(v["vendido"], 2)
        costo = round(v["costo"], 2)
        deduccion_venta = round(vendido * 0.01, 2)
        deduccion_renta = round(vendido * 0.02, 2)
        deduccion_tienda = round(vendido * 0.02, 2)
        neto = round(vendido - deduccion_venta - deduccion_renta - deduccion_tienda, 2)
        pagado = pagos_dict.get(a.id, 0)
        if vendido > 0 or pagado > 0:
            resultado.append({
                "artesano_id": a.id,
                "artesano": a.nombre,
                "monto_vendido": vendido,
                "deduccion_venta": deduccion_venta,
                "deduccion_renta": deduccion_renta,
                "deduccion_tienda": deduccion_tienda,
                "neto": neto,
                "monto_pagado": round(pagado, 2),
                "pendiente": round(neto - pagado, 2),
            })

    return {
        "periodo": periodo,
        "liquidaciones": resultado,
        "total_vendido": round(sum(r["monto_vendido"] for r in resultado), 2),
        "total_neto": round(sum(r["neto"] for r in resultado), 2),
        "total_pagado": round(sum(r["monto_pagado"] for r in resultado), 2),
        "total_pendiente": round(sum(r["pendiente"] for r in resultado), 2),
    }


@router.get("/pagos")
def listar_pagos(periodo: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(PagoArtesano)
    if periodo:
        q = q.filter(PagoArtesano.periodo == periodo)
    return q.order_by(PagoArtesano.fecha_pago.desc()).all()


@router.post("/pagos")
def crear_pago(data: PagoCreate, db: Session = Depends(get_db)):
    p = PagoArtesano(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/pagos/{pago_id}")
def eliminar_pago(pago_id: int, db: Session = Depends(get_db)):
    p = db.query(PagoArtesano).get(pago_id)
    if not p:
        return {"error": "Pago no encontrado"}
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.get("/historial")
def historial_artesano(artesano_id: int, db: Session = Depends(get_db)):
    pagos = db.query(PagoArtesano).filter(
        PagoArtesano.artesano_id == artesano_id
    ).order_by(PagoArtesano.fecha_pago.desc()).all()

    periodos_con_pago = set(p.periodo for p in pagos)
    todos_los_periodos = sorted(periodos_con_pago, reverse=True)

    resultado = []
    for periodo in todos_los_periodos:
        year, month = map(int, periodo.split("-"))
        inicio = datetime(year, month, 1)
        fin = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        ventas = (
            db.query(func.sum(VentaItem.cantidad * Producto.costo))
            .join(Producto)
            .join(Venta)
            .filter(
                VentaItem.producto_id == Producto.id,
                Producto.artesano_id == artesano_id,
                Venta.fecha >= inicio,
                Venta.fecha < fin,
                Venta.estado == "completada",
            )
            .scalar() or 0
        )

        pagado = sum(p.monto for p in pagos if p.periodo == periodo)

        resultado.append({
            "periodo": periodo,
            "monto_vendido": round(float(ventas), 2),
            "monto_pagado": round(pagado, 2),
            "pendiente": round(float(ventas) - pagado, 2),
        })

    return resultado
