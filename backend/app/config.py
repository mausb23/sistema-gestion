import os
import sys
from pathlib import Path

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).parent.resolve()
    RESOURCE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).resolve().parent.parent
    RESOURCE_DIR = BASE_DIR

DB_PATH = BASE_DIR / "database.sqlite"
STATIC_DIR = RESOURCE_DIR / "static"

DATABASE_URL = f"sqlite:///{DB_PATH}"
HOST = "0.0.0.0"
PORT = 8000
