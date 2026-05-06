# Diseño Arquitectónico

## Arquitectura General

Aplicación web monolítica con frontend SPA y backend REST API, empaquetada como aplicación de escritorio autónoma.

```
┌─────────────────────────────────────────────┐
│                 PyInstaller                  │
│  ┌───────────────────────────────────────┐  │
│  │           FastAPI (puerto 8000)        │  │
│  │  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │  REST API    │  │  Static Files  │  │  │
│  │  │  /api/*      │  │  / (SPA)       │  │  │
│  │  └─────────────┘  └────────────────┘  │  │
│  │        │                    ▲          │  │
│  │        ▼                    │          │  │
│  │  ┌─────────────┐            │          │  │
│  │  │   SQLite    │            │          │  │
│  │  └─────────────┘            │          │  │
│  │  ┌───────────────────┐      │          │  │
│  │  │  Scraper BCCR     │──────┘          │  │
│  │  │  (c/2 h)          │                 │  │
│  │  └───────────────────┘                 │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Decisiones Arquitectónicas

### Monolito con SPA
- **Por qué**: El objetivo es un solo `.exe` autónomo. Separar frontend y backend en procesos distintos complica el empaquetado.
- **Cómo funciona**: FastAPI sirve tanto la API REST como los archivos estáticos del SPA. En desarrollo, Astro corre en un puerto separado con proxy.

### Sin autenticación
- **Por qué**: El sistema opera en entornos locales/confiables (taller, tienda pequeña). La selección de usuario es solo para registrar quién realizó cada operación.
- **Trade-off**: No apto para despliegue en redes no confiables sin agregar autenticación.

### SQLite como base de datos
- **Por qué**: Cero configuración, no requiere servidor, el archivo es portátil con el `.exe`.
- **Trade-off**: No escala a múltiples usuarios concurrentes pesados. Adecuado para el volumen de una tienda artesanal.

### `lazy="joined"` en todas las relaciones
- **Por qué**: Simplifica el código al evitar carga perezosa y problemas N+1.
- **Trade-off**: Puede generar JOINs innecesarios en consultas que no necesitan ciertas relaciones.

### Scraping del tipo de cambio
- **Por qué**: El BCCR no ofrece API pública. La tasa de compra/venta del BNCR se obtiene scraping la página de indicadores económicos.
- **Frecuencia**: Cada 2 horas en un hilo daemon. También se scrapea al iniciar el servidor.
- **Fuente**: `https://gee.bccr.fi.cr/IndicadoresEconomicos/Cuadros/frmConsultaTCVentanilla.aspx`

## Modelo de Datos

```
comunidades ──< artesanos
usuarios ──< ventas
usuarios ──< movimientos_inventario
usuarios ──< cierres_caja
cierres_caja ──< movimientos_caja
clientes ──< ventas
categorias ──< productos
artesanos ──< productos
artesanos ──< pagos_artesano
productos ──< venta_items
productos ──< movimientos_inventario
ventas ──< venta_items
configuracion (tabla clave-valor independiente)
```

### Convención de Códigos

Los códigos de producto siguen el formato `CC-AAA-PPP`:
- `CC` = código de comunidad (01–39)
- `AAA` = número de artesano dentro de la comunidad
- `PPP` = número de producto del artesano

Ejemplo: `01-001-001` = Comunidad 01 (Térraba), Artesano 001, Producto 001.

### Caja (doble moneda)

El módulo de caja maneja dos monedas simultáneamente:

| Apertura | Durante el día | Cierre |
|----------|---------------|--------|
| Conteo físico CRC | Ventas CRC | Conteo físico CRC |
| Conteo físico USD | Ventas USD | Conteo físico USD |
| | Ingresos/Egresos | Datáfono |
| | | Diferencia CRC |
| | | Diferencia USD |

El "Esperado" se calcula como: `inicial + ventas + ingresos - egresos`.

### Liquidaciones (deducciones)

El neto a pagar al artesano se calcula:

```
neto = vendido - (vendido × 1%) - (vendido × 2%) - (vendido × 2%)
     = vendido × 0.95
```

| Concepto | Porcentaje |
|----------|-----------|
| Venta | 1% |
| Impuesto de renta | 2% |
| Tienda (CHM) | 2% |
| Neto al artesano | 95% |

### Estrategia de Borrado

| Entidad | Tipo | Campo |
|---------|------|-------|
| usuario | Soft delete | `activo` (Boolean) |
| producto | Soft delete | `activo` (Integer 0/1) |
| artesano | Soft delete | `activo` (Boolean) |
| comunidad | Hard delete | — |
| categoria | Hard delete | — |
| cliente | Hard delete | — |
| pago_artesano | Hard delete | — |
| venta | Anulación | `estado="anulada"` |

## API

12 módulos de rutas bajo `/api/`:

| Módulo | Endpoints | Propósito |
|--------|-----------|-----------|
| usuarios | CRUD | Gestión de usuarios del sistema |
| categorias | CRUD | Categorías de productos |
| productos | CRUD + filtros | Catálogo de productos |
| clientes | CRUD + búsqueda | Clientes |
| ventas | CRUD + hoy + anular + exportar-excel | Punto de venta e historial |
| inventario | movimientos + stock-bajo | Control de inventario |
| caja | estado, abrir, cerrar, movimiento | Gestión de caja (doble moneda) |
| reportes | ventas-por-día, más-vendidos, resumen, inventario-artesanos | Reportes y dashboard |
| config | GET, PUT (clave→valor), actualizar-tc | Configuración de la aplicación |
| comunidades | GET listar | Comunidades indígenas |
| artesanos | CRUD | Artesanos proveedores |
| liquidaciones | resumen, pagos, historial | Liquidaciones a artesanos |

## Frontend

### Enrutamiento
No se usa React Router. El estado `section` en `App.jsx` determina qué componente se renderiza. El sidebar notifica cambios vía callback `onChange`.

### Componentes
```
App.jsx
├── UserSelector.jsx       (selección/creación de usuario)
├── Sidebar.jsx            (navegación lateral)
├── Dashboard.jsx          (KPIs y resumen)
├── Productos.jsx          (CRUD productos, sort por código/nombre)
├── Ventas.jsx             (POS con escáner + historial + Excel)
├── Inventario.jsx         (movimientos + stock, sort por código/nombre)
├── Caja.jsx               (conteo por denominaciones CRC/USD)
├── Configuracion.jsx      (config, usuarios, categorías)
├── Artesanos.jsx          (CRUD artesanos, sort por código/nombre)
├── Liquidaciones.jsx      (liquidaciones con deducciones)
└── ReporteInventario.jsx  (inventario por artesano)
```

### Formato de moneda
`frontend/src/lib/format.js` — función `money(n)`:
- Separa miles con `.` y decimales con `,`
- Ejemplo: `money(12345.50)` → `"12.345,50"`

### Flujo de Datos
1. `UserSelector` obtiene usuarios de `GET /api/usuarios` al montar
2. Usuario seleccionado se guarda en `localStorage` vía `store.js`
3. Cada sección obtiene sus datos con `useEffect` + `api.js`
4. Mutaciones (POST/PUT/DELETE) disparan recargas de datos

## Empaquetado (PyInstaller)

### Build Pipeline
```
scripts/build.bat
1. npm install
2. npm run build (Astro → backend/static/)
3. pip install -r requirements.txt
4. pyinstaller app/main.py --onefile --name gestion-ventas
   → backend/dist/gestion-ventas.exe
```

### Consideraciones PyInstaller
- `config.py` usa `sys.executable` y `sys._MEIPASS` para resolver rutas en ejecutable congelado
- Los archivos estáticos se incluyen con `--add-data` (en `build.bat`)

## Seguridad

- **CORS**: Permitido desde cualquier origen (`"*"`) — necesario para desarrollo con puertos separados
- **SQLite**: Sin autenticación de base de datos
- **API**: Sin autenticación en endpoints
- **Recomendación**: Este diseño asume un entorno de red local confiable. No exponer a Internet sin agregar autenticación y HTTPS.

## Limitaciones Conocidas

1. Sin tests automatizados
2. Lógica de negocio mezclada con manejo de rutas
3. Sin migraciones de base de datos (SQLite se crea desde cero con `Base.metadata.create_all`)
4. Sin paginación en listados (carga todos los registros)
5. Sin manejo de concurrencia/transacciones más allá de lo básico de SQLAlchemy
