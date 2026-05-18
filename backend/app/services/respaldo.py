import gzip
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path

from app.config import BASE_DIR

logger = logging.getLogger(__name__)

DEFAULT_DIR = BASE_DIR / "respaldos"
DEFAULT_MAX = 30


def _backup_dir() -> Path:
    from app.database import SessionLocal
    from app.models.configuracion import Configuracion
    db = SessionLocal()
    try:
        c = db.query(Configuracion).filter(Configuracion.clave == "backup_dir").first()
        if c and c.valor:
            p = Path(c.valor)
            if p.is_absolute():
                return p
            return BASE_DIR / p
    finally:
        db.close()
    return DEFAULT_DIR


def _max_copias() -> int:
    from app.database import SessionLocal
    from app.models.configuracion import Configuracion
    db = SessionLocal()
    try:
        c = db.query(Configuracion).filter(Configuracion.clave == "backup_max_copias").first()
        return max(1, int(c.valor)) if c and c.valor else DEFAULT_MAX
    finally:
        db.close()


def crear_respaldo() -> dict:
    bdir = _backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    gz_path = bdir / f"backup_{ts}.sqlite.gz"

    db_path = BASE_DIR / "database.sqlite"
    if not db_path.exists():
        return {"error": "No se encontró la base de datos"}

    try:
        with open(db_path, "rb") as f_in:
            with gzip.open(gz_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
        logger.info("Respaldo creado: %s", gz_path)
    except Exception as e:
        logger.error("Error al crear respaldo: %s", e)
        return {"error": str(e)}

    _limpiar(_max_copias())
    return {"ok": True, "archivo": gz_path.name, "tamano": gz_path.stat().st_size}


def listar_respaldos() -> list:
    bdir = _backup_dir()
    if not bdir.exists():
        return []
    archivos = sorted(bdir.glob("backup_*.sqlite.gz"), reverse=True)
    result = []
    for f in archivos:
        ts_str = f.stem.replace("backup_", "").replace(".sqlite", "")
        try:
            ts = datetime.strptime(ts_str, "%Y-%m-%d_%H%M%S")
        except ValueError:
            ts = datetime.fromtimestamp(f.stat().st_mtime)
        result.append({
            "archivo": f.name,
            "fecha": ts.isoformat(),
            "tamano": f.stat().st_size,
        })
    return result


def descargar_respaldo(archivo: str) -> tuple | dict:
    bdir = _backup_dir()
    fpath = bdir / archivo
    if not fpath.exists() or not fpath.name.startswith("backup_") or not fpath.suffixes == [".sqlite", ".gz"]:
        return {"error": "Archivo no encontrado"}
    return fpath


def restaurar_respaldo(archivo: str) -> dict:
    bdir = _backup_dir()
    gz_path = bdir / archivo
    if not gz_path.exists():
        return {"error": "Respaldo no encontrado"}

    db_path = BASE_DIR / "database.sqlite"
    backup_path = db_path.with_suffix(".sqlite.backup")

    # backup actual antes de restaurar
    if db_path.exists():
        shutil.copy2(db_path, backup_path)
        logger.info("Respaldo previo guardado como %s", backup_path)

    try:
        with gzip.open(gz_path, "rb") as f_in:
            with open(db_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
        logger.info("Base restaurada desde %s", gz_path)
        return {"ok": True}
    except Exception as e:
        # restaurar el anterior si falla
        if backup_path.exists():
            shutil.copy2(backup_path, db_path)
        logger.error("Error al restaurar: %s", e)
        return {"error": str(e)}


def cargar_respaldo_desde_bytes(contenido: bytes) -> dict:
    bdir = _backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)
    db_path = BASE_DIR / "database.sqlite"
    backup_path = db_path.with_suffix(".sqlite.backup")

    ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    archivo_gz = bdir / f"backup_subido_{ts}.sqlite.gz"

    try:
        with gzip.open(archivo_gz, "wb") as f:
            f.write(contenido)
    except Exception:
        archivo_gz = None

    if db_path.exists():
        shutil.copy2(db_path, backup_path)
        logger.info("Respaldo previo guardado como %s", backup_path)

    try:
        data = gzip.decompress(contenido)
        with open(db_path, "wb") as f:
            f.write(data)
        logger.info("Base reemplazada desde archivo subido")
        return {"ok": True, "archivo": archivo_gz.name if archivo_gz else None}
    except Exception as e:
        if backup_path.exists():
            shutil.copy2(backup_path, db_path)
        logger.error("Error al cargar respaldo: %s", e)
        return {"error": str(e)}


def _limpiar(max_copias: int):
    bdir = _backup_dir()
    archivos = sorted(bdir.glob("backup_*.sqlite.gz"), reverse=True)
    for f in archivos[max_copias:]:
        f.unlink()
        logger.info("Respaldo antiguo eliminado: %s", f.name)
