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

### Sin capa de servicios
- **Por qué**: Proyecto pequeño donde la lógica de negocio es simple. Las rutas contienen tanto validación como lógica.
- **Nota**: Los directorios `services/` y `schemas/` existen vacíos, sugiriendo una futura refactorización.

## Modelo de Datos

```
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

### Estrategia de Borrado

| Entidad | Tipo | Campo |
|---------|------|-------|
| usuario | Soft delete | `activo` (Boolean) |
| producto | Soft delete | `activo` (Integer 0/1) |
| artesano | Soft delete | `activo` (Boolean) |
| categoria | Hard delete | — |
| cliente | Hard delete | — |
| pago_artesano | Hard delete | — |
| venta | Anulación | `estado="anulada"` |

## API

11 módulos de rutas bajo `/api/`:

| Módulo | Endpoints | Propósito |
|--------|-----------|-----------|
| usuarios | CRUD | Gestión de usuarios del sistema |
| categorias | CRUD | Categorías de productos |
| productos | CRUD + filtros | Catálogo de productos |
| clientes | CRUD + búsqueda | Clientes |
| ventas | CRUD + hoy + anular | Punto de venta e historial |
| inventario | movimientos + stock-bajo | Control de inventario |
| caja | estado, abrir, cerrar, movimiento | Gestión de caja |
| reportes | ventas-por-día, más-vendidos, resumen | Reportes y dashboard |
| config | GET, PUT (clave→valor) | Configuración de la aplicación |
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
├── Productos.jsx          (CRUD productos)
├── Ventas.jsx             (POS + historial)
├── Inventario.jsx         (movimientos + stock)
├── Caja.jsx               (apertura/cierre/movimientos)
├── Configuracion.jsx      (config, usuarios, categorías)
├── Artesanos.jsx          (CRUD artesanos)
└── Liquidaciones.jsx      (liquidaciones y pagos)
```

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
