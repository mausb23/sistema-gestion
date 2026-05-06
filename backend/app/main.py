import sys
import os
import webbrowser
import threading
import time
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, engine, Base, SessionLocal
from app.config import STATIC_DIR, HOST, PORT
from app.routes import (
    usuarios,
    categorias,
    productos,
    clientes,
    ventas,
    inventario,
    caja,
    reportes,
    config,
    artesanos,
    liquidaciones,
    comunidades,
)
from app.services.tipo_cambio import obtener_tipo_cambio
from app.models.configuracion import Configuracion

app = FastAPI(title="Gestión de Ventas", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(categorias.router)
app.include_router(productos.router)
app.include_router(clientes.router)
app.include_router(ventas.router)
app.include_router(inventario.router)
app.include_router(caja.router)
app.include_router(reportes.router)
app.include_router(config.router)
app.include_router(artesanos.router)
app.include_router(liquidaciones.router)
app.include_router(comunidades.router)


def guardar_tipo_cambio(tc: dict):
    db = SessionLocal()
    try:
        for clave, valor in [("tipo_cambio_compra", tc["compra"]), ("tipo_cambio_venta", tc["venta"])]:
            c = db.query(Configuracion).filter(Configuracion.clave == clave).first()
            v = str(valor)
            if not c:
                c = Configuracion(clave=clave, valor=v)
                db.add(c)
            else:
                c.valor = v
        db.commit()
    finally:
        db.close()


def scrapeo_periodico():
    while True:
        try:
            tc = obtener_tipo_cambio()
            if tc:
                guardar_tipo_cambio(tc)
        except Exception:
            pass
        time.sleep(7200)


def seed_comunidades():
    db = SessionLocal()
    try:
        if db.query(Configuracion).count() > 0 and db.query(Configuracion).filter(Configuracion.clave == "comunidades_sembradas").first():
            return
        data = [
            ("01", "Térraba", "Térrabá", "Bröran"),
            ("02", "Quitirrisí", "Quitirrisí", "Huetar"),
            ("03", "Boruca", "Boruca", "Brunka"),
            ("04", "San Vicente", "San Vicente de Nicoya", "Chorotega"),
            ("05", "Abrojos", "Abrojo Montezuma", "Ngöbe – Buglé"),
            ("06", "Comte Burica", "Comte Burica", "Ngöbe – Buglé"),
            ("07", "AMAB – Brunka", "Boruca", "Brunka"),
            ("08", "Rey Curré", "Rey Curré- Yimba Cajc", "Brunka"),
            ("09", "Camino Ngobe", "Varios territorios", "Ngöbe – Buglé"),
            ("10", "Alto Río Claro", "Comte Burica", "Ngöbe – Buglé"),
            ("11", "Bajo Chirripó", "Bajo Chirripó", "Cabécar"),
            ("12", "Urbina", "N/A", "N/A"),
            ("13", "Altamira", "Comte Burica", "Ngöbe – Buglé"),
            ("14", "El Sol", "Guatuso", "Maleku"),
            ("15", "Matambú", "Matambú", "Chorotega"),
            ("16", "Progreso", "Comte Burica", "Ngöbe – Buglé"),
            ("17", "Kashabri", "Talamanca Bribri", "Bribri"),
            ("18", "Watsi", "Talamanca Bribri", "Bribri"),
            ("19", "Salitre", "Salitre", "Bribri"),
            ("20", "La Troja", "(No indicado)", "Ngöbe – Buglé"),
            ("21", "Alí García", "Talamanca Bribri", "Bribri"),
            ("22", "Ahorro AMAB", "Boruca", "Brunka"),
            ("23", "Jironday", "Varios territorios", "Varias Culturas"),
            ("24", "Ahorro Julieta", "Quitirrisí", "Huetar"),
            ("25", "Ahorro Dominga Laz", "Rey Curré- Yimba Cajc", "Brunka"),
            ("26", "Ahorro El Sol", "Guatuso", "Maleku"),
            ("27", "Chietón Moren", "Varios territorios", "Varias Culturas"),
            ("28", "Margarita", "Guatuso", "Maleku"),
            ("29", "Tongibe", "Guatuso", "Maleku"),
            ("30", "Ngobe Bugle", "N/A", "Ngöbe – Buglé"),
            ("31", "Mleruk (La Pera)", "Talamanca Bribri", "Bribri"),
            ("32", "Guanacaste – Ujarrás", "Ujarrás", "Cabécar"),
            ("33", "Boruca Liceo", "Boruca", "Brunka"),
            ("34", "Talamanca Cabécar", "Talamanca Cabécar", "Cabécar"),
            ("35", "Zeledón – Bajo Chir", "(No indicado)", "Cabécar"),
            ("36", "Alto Chirripó", "(No indicado)", "Cabécar"),
            ("37", "Yorkín - Talamanca", "(No indicado)", "Bribri"),
            ("38", "Amubri – Talamanca", "(No indicado)", "Bribri"),
            ("39", "Altos de - Talamanca", "(No indicado)", "Bribri"),
        ]
        from app.models.comunidad import Comunidad
        for codigo, nombre, territorio, cultura in data:
            db.add(Comunidad(codigo=codigo, nombre=nombre, territorio=territorio, cultura=cultura))
        c = Configuracion(clave="comunidades_sembradas", valor="1")
        db.add(c)
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    init_db()
    seed_comunidades()
    try:
        tc = obtener_tipo_cambio()
        if tc:
            guardar_tipo_cambio(tc)
    except Exception:
        pass
    hilo = threading.Thread(target=scrapeo_periodico, daemon=True)
    hilo.start()
    if STATIC_DIR.exists() and any(STATIC_DIR.iterdir()):
        app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


@app.get("/api/health")
def health():
    return {"status": "ok"}


def open_browser():
    webbrowser.open(f"http://localhost:{PORT}")


def main():
    import uvicorn
    threading.Timer(1.5, open_browser).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
