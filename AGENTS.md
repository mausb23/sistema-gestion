# AGENTS.md — AI Assistant Guidelines

## Project Overview

**gestion-ventas** is a self-contained sales management system for small artisan/craft businesses in Costa Rica. It is a monolithic web app: FastAPI backend + React SPA frontend (built via Astro), packaged as a single Windows `.exe` via PyInstaller.

## Tech Stack

- **Backend**: Python 3.14, FastAPI 0.115, SQLAlchemy 2.35, SQLite
- **Frontend**: Astro 5, React 18, Tailwind CSS 3.4
- **Scraping**: requests + BeautifulSoup (tipo de cambio BCCR)
- **Packaging**: PyInstaller (single-file .exe)

## Code Conventions

- **Language**: All code, comments, UI labels, and commit messages in **Spanish**
- **Currency**: CRC (Costa Rican Colón) — formatted as `1.234,56` (`.` miles, `,` decimales)
- **File extensions**: Backend is `.py`, frontend is `.jsx` (plain JS, no TypeScript)
- **Database**: SQLAlchemy models with `lazy="joined"` on all relationships
- **API**: REST endpoints under `/api/`, inline Pydantic schemas in route files
- **Frontend routing**: Simple `section` state in `App.jsx` (no React Router)
- **Formatting**: `frontend/src/lib/format.js` — `money()` function for currency display
- **API client**: `frontend/src/lib/api.js` — thin `fetch()` wrapper

## Modelos

### Comunidad
- `codigo` (String, "01"–"39"), `nombre`, `territorio`, `cultura`
- 39 comunidades indígenas costarricenses pre-cargadas al iniciar

### Artesano
- `codigo` (String, formato "01-001"), `nombre`, `comunidad_id`
- Código se compone de: `codigo_comunidad-numero_artesano`

### Producto
- `codigo` (String, formato "01-001-001" = comunidad-artesano-producto)
- `artesano_id` → Artesano, `categoria_id` → Categoria

### CierreCaja
- Doble moneda: `monto_inicial_crc/usd`, `conteo_crc/usd`, `diferencia_crc/usd`
- `datafono` — monto del datáfono al cierre

## Database Conventions

- **Soft deletes**: `usuarios.activo` (Boolean), `productos.activo` (Integer 0/1), `artesanos.activo` (Boolean)
- **Hard deletes**: categorias, clientes, pagos_artesano
- **Cascade deletes**: `Venta.items`, `CierreCaja.movimientos` use `cascade="all, delete-orphan"`
- **configuracion**: Simple key-value table for app settings

## Common Workflows

### Development
```bash
# Backend
cd backend && pip install -r requirements.txt && python run.py

# Frontend
cd frontend && npm install && npm run dev
```

### Building
```bash
scripts\build.bat   # Windows
scripts\build.sh    # Unix
```

### Migración de datos desde Excel
```bash
cd backend
python ../scripts/migrar_inventario.py   # Productos y artesanos
python ../scripts/migrar_caja_chica.py   # Ventas
```

## Response Format

When responding to queries:
- Reference files with `file_path:line_number` syntax
- Keep responses concise and direct
- Minimize output tokens — avoid preamble, postamble, and code explanations unless asked
- Use GitHub-flavored markdown

## Documentation Maintenance

Keep `README.md`, `DESIGN.md`, and `AGENTS.md` updated whenever a pertinent change is made — new features, dependency bumps, API changes, schema changes, or architectural decisions. Update the relevant section(s) as part of the same PR/commit as the code change.

## Prohibited Actions

- Do NOT add comments to code unless asked
- Do NOT suggest or add authentication/password systems without explicit request
- Do NOT add emojis to files unless asked
- Do NOT create documentation files (`.md`) unless explicitly requested
- Do NOT run destructive git operations unless explicitly requested
- Do NOT commit changes unless explicitly asked
- Do NOT add TypeScript types to `.jsx` files unless asked
