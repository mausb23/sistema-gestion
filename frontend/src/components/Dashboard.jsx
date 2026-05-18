import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [resumenPagos, setResumenPagos] = useState({});
  const [artesanos, setArtesanos] = useState({ activos: [], rezagados: [], inactivos: [] });

  useEffect(() => {
    api.get("/reportes/resumen").then(setData);
    api.get("/ventas/hoy").then((r) => { setVentasHoy(r.ventas || []); setResumenPagos(r.resumen_pagos || {}); });
    api.get("/reportes/artesanos-estado").then(setArtesanos);
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
          {Object.keys(resumenPagos).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
              {Object.entries(resumenPagos).map(([metodo, monto]) => {
                const label = metodo.includes("+")
                  ? metodo.split("+").map(m => ({ efectivo: "Efectivo", efectivo_dolares: "USD", sinpe: "SINPE", tarjeta: "Tarjeta" }[m] || m)).join("+")
                  : ({ efectivo: "Efectivo", efectivo_dolares: "USD", sinpe: "SINPE", tarjeta: "Tarjeta" }[metodo] || metodo);
                return (
                <span key={metodo} className="text-xs bg-blue-50 px-2 py-0.5 rounded-full text-blue-700">
                  {label}: ₡{money(monto)}
                </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Productos activos</p>
          <p className="text-3xl font-bold text-green-600">{data?.total_productos || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Artesanos activos</p>
          <p className="text-3xl font-bold text-emerald-600">{artesanos.total_activos || 0}</p>
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
          <h3 className="font-semibold mb-4">Estado de artesanos</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-700">Activos</span>
                <span className="text-xs text-gray-400">{artesanos.total_activos || 0} artesanos</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {artesanos.activos.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm border-b border-gray-100 pb-1">
                    <span className="text-emerald-600">{a.codigo ? `${a.codigo} - ` : ""}{a.nombre}</span>
                    <span className="text-gray-400 text-xs">stock: {a.total_stock}</span>
                  </div>
                ))}
                {artesanos.activos.length === 0 && <p className="text-xs text-gray-400">Ninguno</p>}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-yellow-700">Ventas rezagadas</span>
                <span className="text-xs text-gray-400">{artesanos.total_rezagados || 0} artesanos</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {artesanos.rezagados.map((a) => (
                  <div key={a.id} className="text-sm border-b border-gray-100 pb-1">
                    <span className="text-yellow-600">{a.codigo ? `${a.codigo} - ` : ""}{a.nombre}</span>
                  </div>
                ))}
                {artesanos.rezagados.length === 0 && <p className="text-xs text-gray-400">Ninguno</p>}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-500">Inactivos</span>
                <span className="text-xs text-gray-400">{artesanos.total_inactivos || 0} artesanos</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {artesanos.inactivos.map((a) => (
                  <div key={a.id} className="text-sm border-b border-gray-100 pb-1">
                    <span className="text-gray-500">{a.codigo ? `${a.codigo} - ` : ""}{a.nombre}</span>
                  </div>
                ))}
                {artesanos.inactivos.length === 0 && <p className="text-xs text-gray-400">Ninguno</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
