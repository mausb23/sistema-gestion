import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Liquidaciones() {
  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [periodo, setPeriodo] = useState(periodoActual);
  const [data, setData] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [artesanos, setArtesanos] = useState([]);
  const [pagoForm, setPagoForm] = useState({ artesano_id: "", monto: "" });

  useEffect(() => {
    api.get("/artesanos").then(setArtesanos);
  }, []);

  useEffect(() => {
    if (periodo) {
      api.get(`/liquidaciones/resumen?periodo=${periodo}`).then(setData);
      api.get(`/liquidaciones/pagos?periodo=${periodo}`).then(setPagos);
    }
  }, [periodo]);

  async function registrarPago() {
    if (!pagoForm.artesano_id || !pagoForm.monto) return;
    await api.post("/liquidaciones/pagos", {
      artesano_id: parseInt(pagoForm.artesano_id),
      periodo: periodo,
      monto: parseFloat(pagoForm.monto),
    });
    setPagoForm({ artesano_id: "", monto: "" });
    api.get(`/liquidaciones/resumen?periodo=${periodo}`).then(setData);
    api.get(`/liquidaciones/pagos?periodo=${periodo}`).then(setPagos);
  }

  function cambiarMes(delta) {
    const [y, m] = periodo.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setPeriodo(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Liquidaciones a Artesanos</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => cambiarMes(-1)} className="px-3 py-1 border rounded-lg hover:bg-gray-100">←</button>
          <span className="font-semibold text-lg">{periodo}</span>
          <button onClick={() => cambiarMes(1)} className="px-3 py-1 border rounded-lg hover:bg-gray-100">→</button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total vendido</p>
            <p className="text-2xl font-bold text-blue-600">₡{data.total_vendido.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total pagado</p>
            <p className="text-2xl font-bold text-green-600">₡{data.total_pagado.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total pendiente</p>
            <p className="text-2xl font-bold text-red-600">₡{data.total_pendiente.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-4">Liquidaciones del período</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Artesano</th>
                  <th className="pb-2">Vendido</th>
                  <th className="pb-2">Pagado</th>
                  <th className="pb-2">Pendiente</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.liquidaciones.map((l) => (
                  <tr key={l.artesano_id} className="border-b">
                    <td className="py-2 font-medium">{l.artesano}</td>
                    <td className="py-2">₡{l.monto_vendido.toFixed(2)}</td>
                    <td className="py-2 text-green-600">₡{l.monto_pagado.toFixed(2)}</td>
                    <td className={`py-2 font-medium ${l.pendiente > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₡{l.pendiente.toFixed(2)}
                    </td>
                    <td className="py-2">
                      {l.pendiente > 0 && (
                        <button
                          onClick={() => setPagoForm({ artesano_id: l.artesano_id, monto: l.pendiente.toFixed(2) })}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data?.liquidaciones || data.liquidaciones.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">Sin movimientos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-4">Registrar pago</h3>
          <div className="space-y-3">
            <select
              value={pagoForm.artesano_id}
              onChange={(e) => setPagoForm({ ...pagoForm, artesano_id: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Seleccionar artesano</option>
              {artesanos.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
            <input
              type="number" step="0.01" placeholder="Monto a pagar"
              value={pagoForm.monto}
              onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
            <button
              onClick={registrarPago}
              disabled={!pagoForm.artesano_id || !pagoForm.monto}
              className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 font-semibold"
            >
              Registrar pago
            </button>
          </div>

          <h3 className="font-semibold mt-6 mb-3">Pagos registrados</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pagos.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2 text-sm">
                <div>
                  <p className="font-medium">{p.artesano?.nombre || "-"}</p>
                  <p className="text-xs text-gray-500">{new Date(p.fecha_pago).toLocaleString()}</p>
                </div>
                <span className="font-bold text-green-600">₡{p.monto.toFixed(2)}</span>
              </div>
            ))}
            {pagos.length === 0 && <p className="text-gray-400 text-center py-4">Sin pagos este período</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
