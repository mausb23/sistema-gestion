# Gestión Ventas

Sistema de gestión de ventas para pequeños negocios artesanales en Costa Rica. Aplicación web monolítica empaquetada como ejecutable de Windows.

## Funcionalidades

- **Punto de Venta (POS)**: Crear ventas con selección de productos, múltiples métodos de pago
- **Productos e Inventario**: Gestión con códigos, categorías, costos, precios y control de stock
- **Caja**: Apertura y cierre de caja, registro de ingresos/egresos
- **Artesanos**: Gestión de artesanos proveedores
- **Liquidaciones**: Cálculo mensual basado en costos de productos vendidos
- **Reportes**: Ventas por día, productos más vendidos, resumen diario
- **Multi-usuario**: Selección simple de usuario (sin contraseña)

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.14, FastAPI 0.115, SQLAlchemy 2.35, SQLite |
| Frontend | Astro 5, React 18, Tailwind CSS 3.4 |
| Empaquetado | PyInstaller (.exe único) |

## Requisitos

- Python 3.14+
- Node.js 20+
- npm 10+

## Desarrollo

### Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Inicia el servidor en `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Inicia el servidor en `http://localhost:4321` con proxy a la API.

## Build

```bash
scripts\build.bat   # Windows
scripts/build.sh    # Unix
```

Genera un ejecutable único en `backend/dist/gestion-ventas.exe`.

## Estructura del Proyecto

```
gestion-ventas/
├── backend/
│   ├── app/
│   │   ├── main.py              # Punto de entrada FastAPI
│   │   ├── config.py            # Configuración (DB, host, puerto)
│   │   ├── database.py          # Motor SQLAlchemy y sesión
│   │   ├── models/              # Modelos SQLAlchemy
│   │   ├── routes/              # Rutas REST (11 módulos)
│   │   └── services/            # (reservado)
│   ├── static/                  # Frontend compilado (output Astro)
│   └── run.py                   # Script de desarrollo
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   ├── lib/                 # Utilidades (api.js, store.js)
│   │   └── layouts/             # Layout Astro
│   └── astro.config.mjs
└── scripts/
    ├── build.bat                # Build Windows
    └── build.sh                 # Build Unix
```
