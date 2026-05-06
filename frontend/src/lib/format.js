export function money(n) {
  if (n == null || isNaN(n)) return "0,00";
  const [int, dec] = n.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}
