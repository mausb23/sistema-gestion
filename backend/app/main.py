import sys
import os
import webbrowser
import threading
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, engine, Base
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
)

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


@app.on_event("startup")
def on_startup():
    init_db()
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
