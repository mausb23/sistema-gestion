import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";

function abrirWhatsApp(telefono, texto) {
  const pais = "506";
  const num = (telefono || "").replace(/\D/g, "");
  const full = num.startsWith(pais) ? num : pais + num;
  window.open(`https://wa.me/${full}?text=${encodeURIComponent(texto)}`, "_blank");
}

export default function Liquidaciones() {
  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [periodo, setPeriodo] = useState(periodoActual);
  const [data, setData] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [artesanos, setArtesanos] = useState([]);
  const [pagoForm, setPagoForm] = useState({ artesano_id: "", monto: "" });
  const [ahorroPagoForm, setAhorroPagoForm] = useState({ artesano_id: "", monto: "" });
  const [tab, setTab] = useState("liquidaciones");

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

  async function pagarAhorro(artesanoId, monto) {
    if (!artesanoId || !monto) return;
    await api.post(`/liquidaciones/ahorros/pagar?artesano_id=${artesanoId}&periodo=${periodo}&monto=${monto}`);
    setAhorroPagoForm({ artesano_id: "", monto: "" });
    api.get(`/liquidaciones/resumen?periodo=${periodo}`).then(setData);
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

      <div className="flex gap-1 mb-6 border-b">
        <button onClick={() => setTab("liquidaciones")} className={`px-6 py-2 text-sm font-semibold rounded-t-lg ${tab === "liquidaciones" ? "bg-white border border-b-0 border-gray-200 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Liquidaciones</button>
        <button onClick={() => setTab("ahorros")} className={`px-6 py-2 text-sm font-semibold rounded-t-lg ${tab === "ahorros" ? "bg-white border border-b-0 border-gray-200 text-yellow-600" : "text-gray-500 hover:text-gray-700"}`}>Ahorros</button>
      </div>

      {data && tab === "liquidaciones" && (
        <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total vendido</p>
            <p className="text-2xl font-bold text-blue-600">₡{money(data.total_vendido)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Neto a pagar (95%)</p>
            <p className="text-2xl font-bold text-purple-600">₡{money(data.total_neto)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total pagado</p>
            <p className="text-2xl font-bold text-green-600">₡{money(data.total_pagado)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total pendiente</p>
            <p className="text-2xl font-bold text-red-600">₡{money(data.total_pendiente)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h3 className="font-semibold mb-4">Liquidaciones del período</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Artesano</th>
                <th className="pb-2">Vendido</th>
                <th className="pb-2 text-red-500">-1% Venta</th>
                <th className="pb-2 text-red-500">-2% Renta</th>
                <th className="pb-2 text-red-500">-2% Tienda</th>
                <th className="pb-2">Neto</th>
                <th className="pb-2">Pagado</th>
                <th className="pb-2">Pendiente</th>
                <th className="pb-2"></th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {data?.liquidaciones.map((l) => {
                const art = artesanos.find((a) => a.id === l.artesano_id);
                return (
                <tr key={l.artesano_id} className="border-b">
                  <td className="py-2 font-medium">{l.artesano}</td>
                  <td className="py-2">₡{money(l.monto_vendido)}</td>
                  <td className="py-2 text-red-500">-₡{money(l.deduccion_venta)}</td>
                  <td className="py-2 text-red-500">-₡{money(l.deduccion_renta)}</td>
                  <td className="py-2 text-red-500">-₡{money(l.deduccion_tienda)}</td>
                  <td className="py-2 font-medium text-purple-600">₡{money(l.neto)}</td>
                  <td className="py-2 text-green-600">₡{money(l.monto_pagado)}</td>
                  <td className={`py-2 font-medium ${l.pendiente > 0 ? "text-red-600" : "text-green-600"}`}>
                    ₡{money(l.pendiente)}
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
                  <td className="py-2">
                    {art?.telefono && (
                      <button
                        onClick={() => abrirWhatsApp(art.telefono, `Hola ${l.artesano}, le informamos que tiene un saldo pendiente de ₡${money(l.pendiente)} por el período ${periodo}. Por favor contáctenos para coordinar el pago.`)}
                        className="text-green-600 hover:text-green-800 text-xs font-semibold px-2 py-1 rounded border border-green-300 hover:bg-green-50"
                        title="Notificar por WhatsApp"
                      >
                        WhatsApp
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
              {(!data?.liquidaciones || data.liquidaciones.length === 0) && (
                <tr><td colSpan={9} className="py-4 text-center text-gray-400">Sin movimientos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <option key={a.id} value={a.id}>{a.codigo ? `${a.codigo} - ` : ""}{a.nombre}</option>
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
              <div key={p.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <div>
                  <p className="font-medium">{p.artesano?.nombre || "-"}</p>
                  <p className="text-xs text-gray-500">{new Date(p.fecha_pago).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-600">₡{money(p.monto)}</span>
                  <button
                    onClick={() => abrirWhatsApp(p.artesano?.telefono, `Hola ${p.artesano?.nombre || ""}, le informamos que se ha registrado un pago de ₡${money(p.monto)} correspondiente al período ${p.periodo}. Gracias por su trabajo.`)}
                    className="text-green-600 hover:text-green-800 text-xs font-semibold px-2 py-1 rounded border border-green-300 hover:bg-green-50"
                    title="Enviar por WhatsApp"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
            ))}
            {pagos.length === 0 && <p className="text-gray-400 text-center py-4">Sin pagos este período</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-4">Resumen de deducciones</h3>
          <p className="text-sm text-gray-600 mb-4">Porcentajes aplicados sobre el total vendido:</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span>Venta (1%)</span>
              <span className="text-red-500">-₡{money(data?.total_vendido ? data.total_vendido * 0.01 : 0)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span>Impuesto de renta (2%)</span>
              <span className="text-red-500">-₡{money(data?.total_vendido ? data.total_vendido * 0.02 : 0)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span>Tienda (2%)</span>
              <span className="text-red-500">-₡{money(data?.total_vendido ? data.total_vendido * 0.02 : 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold">
              <span>Neto total (95%)</span>
              <span className="text-purple-600">₡{money(data?.total_neto || 0)}</span>
            </div>
          </div>
        </div>
      </div>
        </> )}
      {data && tab === "ahorros" && (
        <>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-400">
            <p className="text-gray-500 text-sm">Ahorros totales (5%)</p>
            <p className="text-2xl font-bold text-yellow-600">₡{money(data.total_ahorro || 0)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-emerald-400">
            <p className="text-gray-500 text-sm">Ahorros pagados</p>
            <p className="text-2xl font-bold text-emerald-600">₡{money(data.total_ahorro_pagado || 0)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <h3 className="font-semibold mb-4">Ahorros por artesano (5% de las ventas) — se pagan al final del año</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Artesano</th>
                  <th className="pb-2">Comunidad</th>
                  <th className="pb-2">Ahorrado</th>
                  <th className="pb-2">Pagado</th>
                  <th className="pb-2">Pendiente</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.liquidaciones.filter((l) => l.ahorro > 0).map((l) => {
                  const art = artesanos.find((a) => a.id === l.artesano_id);
                  return (
                  <tr key={l.artesano_id} className="border-b">
                    <td className="py-2 font-medium">{l.artesano}</td>
                    <td className="py-2 text-sm text-gray-500">{art?.comunidad?.nombre || "-"}</td>
                    <td className="py-2">₡{money(l.ahorro)}</td>
                    <td className="py-2 text-green-600">₡{money(l.ahorro_pagado || 0)}</td>
                    <td className={`py-2 font-medium ${(l.ahorro - (l.ahorro_pagado || 0)) > 0 ? "text-yellow-600" : "text-green-600"}`}>
                      ₡{money(l.ahorro - (l.ahorro_pagado || 0))}
                    </td>
                    <td className="py-2">
                      {(l.ahorro - (l.ahorro_pagado || 0)) > 0 && (
                        <button
                          onClick={() => pagarAhorro(l.artesano_id, (l.ahorro - (l.ahorro_pagado || 0)).toFixed(2))}
                          className="text-yellow-600 text-xs hover:underline"
                        >
                          Pagar ahorro
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {(!data?.liquidaciones || data.liquidaciones.filter((l) => l.ahorro > 0).length === 0) && (
                  <tr><td colSpan={6} className="py-4 text-center text-gray-400">Sin ahorros este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-4">Resumen de ahorros por período</h3>
          <p className="text-sm text-gray-600 mb-4">El 5% de cada venta se aparta como ahorro para el artesano y se paga al final del año.</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span>Total vendido del período</span>
              <span className="text-blue-600 font-medium">₡{money(data?.total_vendido || 0)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span>Ahorro (5%)</span>
              <span className="text-yellow-600 font-medium">₡{money(data?.total_ahorro || 0)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span>Ya pagado</span>
              <span className="text-emerald-600 font-medium">₡{money(data?.total_ahorro_pagado || 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold">
              <span>Pendiente de pago</span>
              <span className="text-yellow-600">₡{money((data?.total_ahorro || 0) - (data?.total_ahorro_pagado || 0))}</span>
            </div>
          </div>
        </div>
        </> )}
    </div>
  );
}
