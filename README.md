# Gestión Ventas

Sistema de gestión de ventas para pequeños negocios artesanales en Costa Rica. Aplicación web monolítica empaquetada como ejecutable de Windows.

## Funcionalidades

- **Punto de Venta (POS)**: Escaneo por código de barras o ingreso manual, múltiples métodos de pago (Efectivo colones, Efectivo Dólares, Tarjeta, SINPE Móvil), conversión automática USD con TC del BCCR
- **Productos e Inventario**: Gestión con códigos (comunidad-artesano-producto), categorías, costos, precios, artesano asociado y control de stock
- **Caja**: Apertura con conteo de billetes/monedas en CRC y USD, registro de ingresos/egresos, cierre con conteo físico + datáfono, cálculo de diferencias vs esperado
- **Artesanos**: Gestión con código único, comunidad, territorio y cultura (39 comunidades indígenas costarricenses)
- **Liquidaciones**: Cálculo mensual con deducciones (-1% venta, -2% renta, -2% tienda = 95% neto), registro de pagos
- **Reportes**: Inventario por artesano, ventas por día, productos más vendidos, resumen diario, exportación a Excel
- **Tipo de Cambio**: Scraping automático del BCCR cada 2 horas (tasa de compra/venta BNCR)
- **Multi-usuario**: Selección simple de usuario (sin contraseña)

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.14, FastAPI 0.115, SQLAlchemy 2.35, SQLite |
| Frontend | Astro 5, React 18, Tailwind CSS 3.4 |
| Scraping | requests + BeautifulSoup (BCCR) |
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

Inicia el servidor en `http://localhost:8000`. Al arrancar, scrapea el tipo de cambio del BCCR y lo actualiza cada 2 horas.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Inicia el servidor en `http://localhost:4321` con proxy a la API.

### Build

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
│   │   ├── main.py              # Punto de entrada FastAPI + scrapers
│   │   ├── config.py            # Configuración (DB, host, puerto)
│   │   ├── database.py          # Motor SQLAlchemy y sesión
│   │   ├── models/              # 10 modelos SQLAlchemy
│   │   ├── routes/              # 12 módulos REST
│   │   └── services/            # Tipo de cambio (scraping BCCR)
│   ├── static/                  # Frontend compilado (output Astro)
│   └── run.py                   # Script de desarrollo
├── frontend/
│   ├── src/
│   │   ├── components/          # 11 componentes React
│   │   ├── lib/                 # Utilidades (api.js, store.js, format.js)
│   │   └── layouts/             # Layout Astro
│   └── astro.config.mjs
└── scripts/
    ├── build.bat                # Build Windows
    ├── build.sh                 # Build Unix
    ├── migrar_inventario.py     # Migración de productos desde Excel
    └── migrar_caja_chica.py     # Migración de ventas desde Excel
```
