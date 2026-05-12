import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);

  useEffect(() => {
    api.get("/reportes/resumen").then(setData);
    api.get("/ventas/hoy").then((r) => setVentasHoy(r.ventas || []));
    api.get("/inventario/stock-bajo?per_page=100").then((r) => setStockBajo(r.items || r || []));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Ventas hoy</p>
          <p className="text-3xl font-bold text-blue-600">
            ₡{money(data ? data.ventas_hoy : 0)}
          </p>
          <p className="text-sm text-gray-400">{data?.ventas_hoy_cantidad || 0} ventas</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Productos activos</p>
          <p className="text-3xl font-bold text-green-600">{data?.total_productos || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Stock bajo</p>
          <p className="text-3xl font-bold text-red-600">{data?.stock_bajo || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Ventas hoy (cant.)</p>
          <p className="text-3xl font-bold text-purple-600">{data?.ventas_hoy_cantidad || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Últimas ventas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Hora</th>
                  <th className="pb-2">Usuario</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Pago</th>
                </tr>
              </thead>
              <tbody>
                {ventasHoy.slice(0, 10).map((v) => (
                  <tr key={v.id} className="border-b border-gray-100">
                    <td className="py-2">{new Date(v.fecha).toLocaleTimeString()}</td>
                    <td className="py-2">{v.usuario?.nombre || "-"}</td>
                    <td className="py-2 font-medium">₡{money(v.total)}</td>
                    <td className="py-2 capitalize">{v.metodo_pago === "efectivo_dolares" ? "Efectivo Dólares" : v.metodo_pago === "sinpe" ? "SINPE Móvil" : v.metodo_pago}</td>
                  </tr>
                ))}
                {ventasHoy.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin ventas hoy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Productos con stock bajo</h3>
          <div className="space-y-3">
            {stockBajo.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-sm text-gray-500">Código: {p.codigo}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-bold">{p.stock}</p>
                  <p className="text-xs text-gray-400">mín: {p.stock_minimo}</p>
                </div>
              </div>
            ))}
            {stockBajo.length === 0 && (
              <p className="text-gray-400 text-center py-4">Todo en orden</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
