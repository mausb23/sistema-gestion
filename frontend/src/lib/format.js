export function money(n) {
  if (n == null || isNaN(n)) return "0,00";
  const [int, dec] = n.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}

const ETIQUETAS_METODO = {
  efectivo: "Colones",
  efectivo_dolares: "Dólares",
  tarjeta: "Tarjeta",
  sinpe: "SINPE Móvil",
};

export function etiquetaMetodoPago(metodo) {
  if (!metodo) return "";
  if (metodo.includes("+")) {
    return metodo.split("+").map((m) => ETIQUETAS_METODO[m] || m).join("+");
  }
  return ETIQUETAS_METODO[metodo] || metodo;
}
