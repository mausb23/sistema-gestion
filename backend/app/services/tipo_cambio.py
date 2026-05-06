import re
import requests
from bs4 import BeautifulSoup

URL = "https://gee.bccr.fi.cr/IndicadoresEconomicos/Cuadros/frmConsultaTCVentanilla.aspx"
BANCO = "Banco Nacional de Costa Rica"


def parsear_numero(valor: str) -> float:
    return float(valor.strip().replace(".", "").replace(",", "."))


def obtener_tipo_cambio() -> dict | None:
    try:
        resp = requests.get(URL, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        tabla = soup.find("table", id="DG")
        if not tabla:
            return None

        for fila in tabla.find_all("tr"):
            celdas = fila.find_all("td")
            if any(BANCO in td.get_text() for td in celdas):
                compra = parsear_numero(celdas[2].get_text(strip=True))
                venta = parsear_numero(celdas[3].get_text(strip=True))
                return {"compra": compra, "venta": venta}
        return None
    except Exception:
        return None
