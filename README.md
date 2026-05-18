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

- Python 3.12+ (probado en 3.12–3.14)
- Node.js 20+
- npm 10+

### Dependencias de sistema Ubuntu

```bash
sudo apt install -y python3-gi gir1.2-webkit2-4.1 libusb-1.0-0-dev fonts-dejavu-core
```

- `python3-gi` + `gir1.2-webkit2-4.1` — necesarios para `pywebview` (ventana nativa)
- `libusb-1.0-0-dev` — necesario para `python-escpos` (impresora térmica USB)
- `fonts-dejavu-core` — necesario para generar PDFs con caracteres especiales (ñ, ₡)

Si no se instalan, el sistema funciona igual pero cae a modo navegador en vez de ventana nativa.

## Desarrollo

### Backend

En sistemas con pip bloqueado (PEP 668), se recomienda usar un **entorno virtual**:

```bash
# Crear el entorno virtual (solo la primera vez)
python3 -m venv .venv

# Activar según tu shell:
source .venv/bin/activate        # bash/zsh
source .venv/bin/activate.fish    # fish

# Instalar dependencias
pip install -r backend/requirements.txt

# Ejecutar el servidor
python backend/run.py
```

Sin activar el virtualenv, podés usar las rutas directamente:

```bash
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/python backend/run.py
```

Al activar el virtualenv, `python` y `pip` apuntan a los del entorno aislado. Para salir: `deactivate`.

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
scripts/build_ubuntu.sh  # Ubuntu (instala dependencias de sistema automáticamente)
```

Genera un ejecutable único en `backend/dist/gestion-ventas`.

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
