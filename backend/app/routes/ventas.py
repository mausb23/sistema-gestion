from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from fastapi.responses import StreamingResponse
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from app.database import get_db
from app.models.venta import Venta, VentaItem
from app.models.producto import Producto
from app.models.inventario import MovimientoInventario
from app.models.configuracion import Configuracion

router = APIRouter(prefix="/api/ventas", tags=["ventas"])


class ItemInput(BaseModel):
    producto_id: int
    cantidad: float
    precio_unitario: float


class VentaCreate(BaseModel):
    usuario_id: int
    cliente_id: Optional[int] = None
    moneda: str = "CRC"
    metodo_pago: str = "efectivo"
    items: List[ItemInput]


@router.get("")
def listar(fecha_desde: Optional[str] = None, fecha_hasta: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Venta)
    if fecha_desde:
        q = q.filter(Venta.fecha >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        q = q.filter(Venta.fecha <= datetime.fromisoformat(fecha_hasta))
    return q.order_by(Venta.fecha.desc()).all()


@router.get("/hoy")
def ventas_hoy(db: Session = Depends(get_db)):
    hoy = date.today()
    inicio = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
    fin = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)
    q = db.query(Venta).filter(Venta.fecha >= inicio, Venta.fecha <= fin)
    ventas = q.order_by(Venta.fecha.desc()).all()
    total = sum(v.total for v in ventas)
    return {"ventas": ventas, "total": total, "cantidad": len(ventas)}


@router.post("")
def crear(data: VentaCreate, db: Session = Depends(get_db)):
    total = sum(item.cantidad * item.precio_unitario for item in data.items)
    venta = Venta(
        usuario_id=data.usuario_id,
        cliente_id=data.cliente_id,
        moneda=data.moneda,
        metodo_pago=data.metodo_pago,
        total=total,
    )
    db.add(venta)
    db.flush()

    for item in data.items:
        vi = VentaItem(
            venta_id=venta.id,
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=item.cantidad * item.precio_unitario,
        )
        db.add(vi)

        producto = db.query(Producto).get(item.producto_id)
        if producto:
            stock_anterior = producto.stock
            producto.stock -= item.cantidad
            db.add(MovimientoInventario(
                producto_id=item.producto_id,
                tipo="salida",
                cantidad=item.cantidad,
                stock_resultante=producto.stock,
                motivo=f"Venta #{venta.id}",
                usuario_id=data.usuario_id,
            ))

    db.commit()
    db.refresh(venta)
    return venta


@router.delete("/{venta_id}")
def eliminar(venta_id: int, db: Session = Depends(get_db)):
    v = db.query(Venta).get(venta_id)
    if not v:
        return {"error": "Venta no encontrada"}
    for item in v.items:
        producto = db.query(Producto).get(item.producto_id)
        if producto:
            producto.stock += item.cantidad
    v.estado = "anulada"
    db.commit()
    return {"ok": True}


@router.get("/exportar-excel")
def exportar_excel(fecha_desde: Optional[str] = None, fecha_hasta: Optional[str] = None, db: Session = Depends(get_db)):
    tc = db.query(Configuracion).filter(Configuracion.clave == "tipo_cambio_compra").first()
    tc_compra = float(tc.valor) if tc else 450

    q = db.query(Venta).filter(Venta.estado == "completada").order_by(Venta.fecha)
    if fecha_desde:
        q = q.filter(Venta.fecha >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        q = q.filter(Venta.fecha <= datetime.fromisoformat(fecha_hasta))
    ventas = q.all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Ventas"

    headers = ["Fecha", "Artículo", "Cantidad", "Costo Unitario", "Nombre Artesano",
               "Número Comunidad", "Monto Total", "Método de Pago", "Dólares recibidos", "Detalles y comentarios"]

    bold = Font(bold=True, size=11)
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border

    fila = 2
    for v in ventas:
        for item in v.items:
            p = item.producto
            comunidad = p.artesano.comunidad if p and p.artesano else None
            comunidad_numero = f"{comunidad.codigo} - {comunidad.nombre}" if comunidad else ""
            metodo = v.metodo_pago
            if metodo == "efectivo_dolares":
                metodo = "Efectivo Dólares"
            elif metodo == "sinpe":
                metodo = "SINPE Móvil"
            dolares = round(item.subtotal / tc_compra, 2) if v.moneda == "USD" else ""
            ws.cell(row=fila, column=1, value=v.fecha.strftime("%d/%m/%Y %H:%M")).border = thin_border
            ws.cell(row=fila, column=2, value=p.nombre if p else "").border = thin_border
            ws.cell(row=fila, column=3, value=item.cantidad).border = thin_border
            ws.cell(row=fila, column=4, value=p.costo if p else 0).border = thin_border
            ws.cell(row=fila, column=5, value=p.artesano.nombre if p and p.artesano else "").border = thin_border
            ws.cell(row=fila, column=6, value=comunidad_numero).border = thin_border
            ws.cell(row=fila, column=7, value=round(item.subtotal, 2)).border = thin_border
            ws.cell(row=fila, column=8, value=metodo).border = thin_border
            ws.cell(row=fila, column=9, value=dolares).border = thin_border
            ws.cell(row=fila, column=10, value="").border = thin_border
            fila += 1

    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 10
    ws.column_dimensions["D"].width = 15
    ws.column_dimensions["E"].width = 25
    ws.column_dimensions["F"].width = 25
    ws.column_dimensions["G"].width = 15
    ws.column_dimensions["H"].width = 20
    ws.column_dimensions["I"].width = 18
    ws.column_dimensions["J"].width = 25

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=ventas.xlsx"})
