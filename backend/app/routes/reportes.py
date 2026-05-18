from io import BytesIO
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fpdf import FPDF
from app.database import get_db
from app.models.venta import Venta, VentaItem
from app.models.producto import Producto
from app.models.artesano import Artesano

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


@router.get("/ventas-por-dia")
def ventas_por_dia(desde: str = "", hasta: str = "", db: Session = Depends(get_db)):
    hoy = date.today()
    inicio = datetime.fromisoformat(desde) if desde else datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
    fin = datetime.fromisoformat(hasta) if hasta else datetime.now()
    rows = (
        db.query(func.date(Venta.fecha).label("dia"), func.sum(Venta.total).label("total"), func.count(Venta.id).label("cantidad"))
        .filter(Venta.fecha >= inicio, Venta.fecha <= fin, Venta.estado == "completada")
        .group_by(func.date(Venta.fecha))
        .order_by("dia")
        .all()
    )
    return [{"dia": r.dia, "total": float(r.total), "cantidad": r.cantidad} for r in rows]


@router.get("/productos-mas-vendidos")
def productos_mas_vendidos(limite: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(
            Producto.nombre,
            func.sum(VentaItem.cantidad).label("cantidad"),
            func.sum(VentaItem.subtotal).label("total"),
        )
        .join(VentaItem, VentaItem.producto_id == Producto.id)
        .join(Venta, Venta.id == VentaItem.venta_id)
        .filter(Venta.estado == "completada")
        .group_by(Producto.id)
        .order_by(func.sum(VentaItem.cantidad).desc())
        .limit(limite)
        .all()
    )
    return [{"nombre": r.nombre, "cantidad": float(r.cantidad), "total": float(r.total)} for r in rows]


@router.get("/artesanos-estado")
def artesanos_estado(db: Session = Depends(get_db)):
    hace_6m = datetime.now() - timedelta(days=180)

    artesanos = db.query(Artesano).filter(Artesano.activo == True).all()
    ids = [a.id for a in artesanos]
    if not ids:
        return {"activos": [], "rezagados": [], "inactivos": [], "total_activos": 0, "total_rezagados": 0, "total_inactivos": 0}

    productos_por_artesano = {id: [] for id in ids}
    for p in db.query(Producto).filter(Producto.artesano_id.in_(ids), Producto.activo == 1).all():
        productos_por_artesano[p.artesano_id].append(p)

    artesanos_con_venta = set()
    for (aid,) in db.query(Producto.artesano_id).join(VentaItem, VentaItem.producto_id == Producto.id).join(Venta, Venta.id == VentaItem.venta_id).filter(
        Producto.artesano_id.in_(ids),
        Venta.fecha >= hace_6m,
        Venta.estado == "completada",
    ).distinct().all():
        artesanos_con_venta.add(aid)

    activos = []
    rezagados = []
    inactivos = []

    for a in artesanos:
        productos = productos_por_artesano.get(a.id, [])
        tiene_stock = any(p.stock > 0 for p in productos)
        total_stock = sum(p.stock for p in productos)
        tiene_venta = a.id in artesanos_con_venta

        if tiene_venta and tiene_stock:
            activos.append({"id": a.id, "codigo": a.codigo, "nombre": a.nombre, "total_stock": total_stock})
        elif tiene_venta and not tiene_stock:
            rezagados.append({"id": a.id, "codigo": a.codigo, "nombre": a.nombre})
        else:
            inactivos.append({"id": a.id, "codigo": a.codigo, "nombre": a.nombre})

    return {
        "activos": activos,
        "rezagados": rezagados,
        "inactivos": inactivos,
        "total_activos": len(activos),
        "total_rezagados": len(rezagados),
        "total_inactivos": len(inactivos),
    }


@router.get("/resumen")
def resumen(db: Session = Depends(get_db)):
    hoy = date.today()
    inicio_hoy = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
    fin_hoy = inicio_hoy + timedelta(days=1)

    ayer = hoy - timedelta(days=1)
    inicio_ayer = datetime(ayer.year, ayer.month, ayer.day, 0, 0, 0)
    fin_ayer = inicio_ayer + timedelta(days=1)

    def ventas_entre(inicio, fin):
        r = db.query(func.sum(Venta.total), func.count(Venta.id)).filter(
            Venta.fecha >= inicio, Venta.fecha < fin, Venta.estado == "completada"
        ).first()
        return float(r[0] or 0), r[1] or 0

    ventas_hoy_monto, ventas_hoy_cant = ventas_entre(inicio_hoy, fin_hoy)
    ventas_ayer_monto, ventas_ayer_cant = ventas_entre(inicio_ayer, fin_ayer)

    total_productos = db.query(func.count(Producto.id)).filter(Producto.activo == 1).scalar()

    return {
        "ventas_hoy": ventas_hoy_monto,
        "ventas_hoy_cantidad": ventas_hoy_cant,
        "ventas_ayer": ventas_ayer_monto,
        "ventas_ayer_cantidad": ventas_ayer_cant,
        "total_productos": total_productos or 0,
    }


FONT_REGULAR = "/usr/share/fonts/TTF/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"


def _pdf_init():
    pdf = FPDF()
    pdf.add_font("DejaVu", "", FONT_REGULAR, uni=True)
    pdf.add_font("DejaVu", "B", FONT_BOLD, uni=True)
    return pdf


def _formatear(n):
    try:
        return f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "0,00"


@router.get("/inventario-artesanos/{artesano_id}/pdf")
def exportar_pdf_artesano(artesano_id: int, db: Session = Depends(get_db)):
    a = db.query(Artesano).filter(Artesano.id == artesano_id, Artesano.activo == True).first()
    if not a:
        return {"error": "Artesano no encontrado"}

    productos = db.query(Producto).filter(
        Producto.artesano_id == a.id, Producto.activo == 1
    ).order_by(Producto.codigo).all()

    pdf = _pdf_init()
    pdf.add_page()
    pdf.set_font("DejaVu", "B", 14)
    titulo = f"{a.codigo} - {a.nombre}" if a.codigo else a.nombre
    pdf.multi_cell(0, 8, titulo)
    pdf.set_font("DejaVu", "", 9)
    if a.comunidad:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5, f"Comunidad: {a.comunidad.nombre} {a.comunidad.cultura or ''}".strip())
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 5, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    pdf.ln(4)

    cols = [22, 64, 16, 24, 24]
    headers_pdf = ["Codigo", "Producto", "Stock", "Precio", "Costo"]
    pdf.set_font("DejaVu", "B", 8)
    pdf.set_fill_color(220, 220, 220)
    for i, h in enumerate(headers_pdf):
        pdf.cell(cols[i], 6, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("DejaVu", "", 7)
    for p in productos:
        pdf.cell(cols[0], 5, p.codigo, border=1, align="C")
        pdf.cell(cols[1], 5, p.nombre[:48], border=1)
        pdf.cell(cols[2], 5, str(p.stock), border=1, align="C")
        pdf.cell(cols[3], 5, f"₡{_formatear(p.precio)}", border=1, align="R")
        pdf.cell(cols[4], 5, f"₡{_formatear(p.costo)}", border=1, align="R")
        pdf.ln()

    buf = BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=inventario_{a.codigo or a.id}.pdf"},
    )


@router.get("/inventario-artesanos/pdf")
def exportar_pdf_inventario(db: Session = Depends(get_db)):
    artesanos = db.query(Artesano).filter(Artesano.activo == True).order_by(Artesano.nombre).all()
    ids = [a.id for a in artesanos]

    total_productos = db.query(func.count(Producto.id)).filter(Producto.activo == 1).scalar() or 0
    sin_stock = db.query(func.count(Producto.id)).filter(Producto.activo == 1, Producto.stock <= 0).scalar() or 0

    productos_por_artesano = {id: [] for id in ids}
    if ids:
        for p in db.query(Producto).filter(
            Producto.artesano_id.in_(ids), Producto.activo == 1
        ).order_by(Producto.codigo).all():
            productos_por_artesano.setdefault(p.artesano_id, []).append(p)

    pdf = _pdf_init()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_font("DejaVu", "B", 16)
    pdf.cell(0, 10, "Reporte de Inventario por Artesano", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(0, 6, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_font("DejaVu", "B", 11)
    pdf.cell(0, 7, f"Resumen: {len(artesanos)} artesanos  |  {total_productos} productos  |  {sin_stock} sin stock", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    cols = [22, 62, 16, 26, 26]

    for a in artesanos:
        nombre = f"{a.codigo} - {a.nombre}" if a.codigo else a.nombre
        comunidad = f"{a.comunidad.nombre} {a.comunidad.cultura or ''}".strip() if a.comunidad else ""

        productos = productos_por_artesano.get(a.id, [])

        if not productos:
            continue

        if pdf.get_y() > 230:
            pdf.add_page()

        pdf.set_font("DejaVu", "B", 10)
        pdf.set_fill_color(240, 240, 240)
        pdf.multi_cell(0, 7, f"  {nombre}", fill=True)
        if comunidad:
            pdf.set_font("DejaVu", "", 8)
            pdf.set_text_color(100, 100, 100)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(0, 5, f"  {comunidad}")
            pdf.set_text_color(0, 0, 0)

        pdf.set_font("DejaVu", "B", 8)
        pdf.set_fill_color(220, 220, 220)
        headers_pdf = ["Codigo", "Producto", "Stock", "Precio", "Costo"]
        for i, h in enumerate(headers_pdf):
            pdf.cell(cols[i], 6, h, border=1, fill=True, align="C")
        pdf.ln()

        pdf.set_font("DejaVu", "", 7)
        for p in productos:
            pdf.cell(cols[0], 5, p.codigo, border=1, align="C")
            pdf.cell(cols[1], 5, p.nombre[:48], border=1)
            pdf.cell(cols[2], 5, str(p.stock), border=1, align="C")
            pdf.cell(cols[3], 5, f"₡{_formatear(p.precio)}", border=1, align="R")
            pdf.cell(cols[4], 5, f"₡{_formatear(p.costo)}", border=1, align="R")
            pdf.ln()

        pdf.ln(3)

    buf = BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=inventario_artesanos.pdf"},
    )


@router.get("/inventario-artesanos")
def inventario_artesanos(
    artesano_id: int = None,
    busqueda: str = "",
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(120, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Artesano).filter(Artesano.activo == True)
    if artesano_id:
        q = q.filter(Artesano.id == artesano_id)
    if busqueda:
        filtro = f"%{busqueda}%"
        q = q.filter(or_(Artesano.nombre.ilike(filtro), Artesano.codigo.ilike(filtro)))

    total = q.count()
    artesanos = q.order_by(Artesano.nombre).offset((pagina - 1) * por_pagina).limit(por_pagina).all()

    ids = [a.id for a in artesanos]
    productos_por_artesano = {id: [] for id in ids}
    if ids:
        for p in db.query(Producto).filter(
            Producto.artesano_id.in_(ids),
            Producto.activo == 1,
        ).order_by(Producto.codigo).all():
            productos_por_artesano.setdefault(p.artesano_id, []).append(p)

    resultado = []
    for a in artesanos:
        productos = productos_por_artesano.get(a.id, [])

        en_stock = sum(1 for p in productos if p.stock > 0)
        sin_stock = sum(1 for p in productos if p.stock <= 0)

        resultado.append({
            "id": a.id,
            "codigo": a.codigo or "",
            "nombre": a.nombre,
            "telefono": a.telefono or "",
            "comunidad": a.comunidad.nombre if a.comunidad else "",
            "cultura": a.comunidad.cultura if a.comunidad else "",
            "total_productos": len(productos),
            "en_stock": en_stock,
            "sin_stock": sin_stock,
            "productos": [
                {"codigo": p.codigo, "nombre": p.nombre, "stock": p.stock, "precio": p.precio, "costo": p.costo}
                for p in productos
            ],
        })

    total_productos = db.query(func.count(Producto.id)).filter(Producto.activo == 1).scalar() or 0
    sin_stock = db.query(func.count(Producto.id)).filter(Producto.activo == 1, Producto.stock <= 0).scalar() or 0

    return {
        "items": resultado,
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "paginas": max(1, (total + por_pagina - 1) // por_pagina),
        "resumen": {
            "artesanos": total,
            "total_productos": total_productos,
            "sin_stock": sin_stock,
        },
    }
