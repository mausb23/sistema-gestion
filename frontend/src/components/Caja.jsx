import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";
import { money } from "../lib/format";

const CRC_DENOMS = [
  { label: "₡5", value: 5, tipo: "Moneda" },
  { label: "₡10", value: 10, tipo: "Moneda" },
  { label: "₡25", value: 25, tipo: "Moneda" },
  { label: "₡50", value: 50, tipo: "Moneda" },
  { label: "₡100", value: 100, tipo: "Moneda" },
  { label: "₡500", value: 500, tipo: "Moneda" },
  { label: "₡1,000", value: 1000, tipo: "Billete" },
  { label: "₡2,000", value: 2000, tipo: "Billete" },
  { label: "₡5,000", value: 5000, tipo: "Billete" },
  { label: "₡10,000", value: 10000, tipo: "Billete" },
  { label: "₡20,000", value: 20000, tipo: "Billete" },
];

const USD_DENOMS = [
  { label: "$1", value: 1 },
  { label: "$5", value: 5 },
  { label: "$10", value: 10 },
  { label: "$20", value: 20 },
  { label: "$50", value: 50 },
  { label: "$100", value: 100 },
];

function vaciarConteo() {
  const c = {};
  for (const d of CRC_DENOMS) c[`crc_${d.value}`] = "";
  for (const d of USD_DENOMS) c[`usd_${d.value}`] = "";
  c.datafono = "";
  return c;
}

function calcTotalCrc(conteo) {
  let total = 0;
  for (const d of CRC_DENOMS) {
    const cant = parseInt(conteo[`crc_${d.value}`]) || 0;
    total += cant * d.value;
  }
  return total;
}

function calcTotalUsd(conteo) {
  let total = 0;
  for (const d of USD_DENOMS) {
    const cant = parseInt(conteo[`usd_${d.value}`]) || 0;
    total += cant * d.value;
  }
  return total;
}

export default function Caja() {
  const [estado, setEstado] = useState(null);
  const [conteoAp, setConteoAp] = useState(vaciarConteo());
  const [conteoCierre, setConteoCierre] = useState(vaciarConteo());
  const [movForm, setMovForm] = useState({ tipo: "ingreso", monto: "", descripcion: "" });
  const [historial, setHistorial] = useState([]);
  const [showCierre, setShowCierre] = useState(false);
  const [error, setError] = useState("");
  const usuario = store.getUsuario();

  useEffect(() => {
    cargarEstado();
    api.get("/caja/historial").then(setHistorial);
  }, []);

  async function cargarEstado() {
    setEstado(await api.get("/caja/estado"));
  }

  async function abrir() {
    if (!usuario) return;
    await api.post("/caja/abrir", {
      usuario_id: usuario.id,
      monto_inicial_crc: calcTotalCrc(conteoAp),
      monto_inicial_usd: calcTotalUsd(conteoAp),
    });
    setConteoAp(vaciarConteo());
    cargarEstado();
  }

  async function cerrar() {
    const res = await api.post("/caja/cerrar", {
      conteo_crc: calcTotalCrc(conteoCierre),
      conteo_usd: calcTotalUsd(conteoCierre),
      datafono: parseFloat(conteoCierre.datafono) || 0,
    });
    if (res.error) { setError(res.error); return; }
    setConteoCierre(vaciarConteo());
    setShowCierre(false);
    setError("");
    cargarEstado();
    api.get("/caja/historial").then(setHistorial);
  }

  async function registrarMov() {
    if (!movForm.monto || !estado?.id) return;
    await api.post("/caja/movimiento", {
      cierre_id: estado.id,
      tipo: movForm.tipo,
      monto: parseFloat(movForm.monto),
      descripcion: movForm.descripcion,
    });
    setMovForm({ tipo: "ingreso", monto: "", descripcion: "" });
    cargarEstado();
  }

  function renderDenominaciones(conteo, setConteo, prefix, denoms, moneda) {
    const total = denoms === CRC_DENOMS ? calcTotalCrc(conteo) : calcTotalUsd(conteo);
    const grupos = {};
    for (const d of denoms) {
      const g = d.tipo || "Billete";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(d);
    }
    return (
      <div className="mb-4">
        <h4 className="font-semibold text-sm mb-2">{moneda}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {denoms.map((d) => {
            const key = `${prefix}_${d.value}`;
            return (
              <div key={key} className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2">
                <span className="text-sm font-medium w-16">{d.label}</span>
                <span className="text-xs text-gray-400 w-12">x</span>
                <input
                  type="number" min="0"
                  className="w-16 p-1 border rounded text-sm text-center"
                  value={conteo[key]}
                  onChange={(e) => setConteo({ ...conteo, [key]: e.target.value })}
                />
              </div>
            );
          })}
        </div>
        <p className="text-right font-bold mt-2 text-lg">
          Total {moneda}: {prefix === "crc" ? "₡" : "$"}{money(total)}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Caja</h2>

      {!estado?.abierta ? (
        <div className="bg-white p-6 rounded-xl shadow max-w-2xl mx-auto">
          <h3 className="font-semibold text-lg mb-4">Abrir caja</h3>
          <p className="text-sm text-gray-500 mb-4">Contar billetes y monedas en caja al iniciar el día</p>

          {renderDenominaciones(conteoAp, setConteoAp, "crc", CRC_DENOMS, "Colones")}
          {renderDenominaciones(conteoAp, setConteoAp, "usd", USD_DENOMS, "Dólares")}

          <button onClick={abrir} className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 font-semibold mt-4">Abrir caja</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Inicial CRC</p><p className="text-xl font-bold">₡{money(estado.monto_inicial_crc)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Inicial USD</p><p className="text-xl font-bold">${money(estado.monto_inicial_usd)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Ventas CRC hoy</p><p className="text-xl font-bold text-blue-600">₡{money(estado.ventas_crc)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Ventas USD hoy</p><p className="text-xl font-bold text-blue-600">${money(estado.ventas_usd)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Esperado CRC</p><p className="text-xl font-bold text-green-700">₡{money(estado.esperado_crc)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Esperado USD</p><p className="text-xl font-bold text-green-700">${money(estado.esperado_usd)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Otros ingresos</p><p className="text-xl font-bold text-green-600">₡{money(estado.ingresos || 0)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Egresos</p><p className="text-xl font-bold text-red-600">₡{money(estado.egresos || 0)}</p></div>
          </div>

          {!showCierre ? (
            <button onClick={() => setShowCierre(true)} className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-semibold mb-6">Cerrar caja</button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Cierre de caja</h3>
              {error && <p className="text-red-600 mb-3">{error}</p>}
              <p className="text-sm text-gray-500 mb-4">Contar billetes y monedas actuales en caja, y registrar cierre del datáfono</p>

              {renderDenominaciones(conteoCierre, setConteoCierre, "crc", CRC_DENOMS, "Colones")}
              {renderDenominaciones(conteoCierre, setConteoCierre, "usd", USD_DENOMS, "Dólares")}

              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2">Datáfono (tarjetas)</h4>
                <input type="number" step="0.01" placeholder="₡0" value={conteoCierre.datafono} onChange={(e) => setConteoCierre({ ...conteoCierre, datafono: e.target.value })} className="w-full p-2 border rounded-lg max-w-xs" />
              </div>

              {calcTotalCrc(conteoCierre) > 0 && (
                <p className={`text-sm mb-4 ${calcTotalCrc(conteoCierre) - estado.esperado_crc === 0 ? "text-green-600" : "text-red-600"}`}>
                  Diferencia CRC: {calcTotalCrc(conteoCierre) >= estado.esperado_crc ? "+" : ""}{money(calcTotalCrc(conteoCierre) - estado.esperado_crc)}
                </p>
              )}
              {calcTotalUsd(conteoCierre) > 0 && (
                <p className={`text-sm mb-4 ${calcTotalUsd(conteoCierre) - estado.esperado_usd === 0 ? "text-green-600" : "text-red-600"}`}>
                  Diferencia USD: {calcTotalUsd(conteoCierre) >= estado.esperado_usd ? "+" : ""}{money(calcTotalUsd(conteoCierre) - estado.esperado_usd)}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setShowCierre(false); setError(""); }} className="flex-1 py-2 border rounded-xl">Cancelar</button>
                <button onClick={cerrar} className="flex-1 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold">Confirmar cierre</button>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h3 className="font-semibold mb-3">Registrar movimiento</h3>
            <div className="flex gap-3">
              <select value={movForm.tipo} onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value })} className="p-2 border rounded-lg">
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
              <input type="number" step="0.01" placeholder="Monto" value={movForm.monto} onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })} className="p-2 border rounded-lg flex-1" />
              <input placeholder="Descripción" value={movForm.descripcion} onChange={(e) => setMovForm({ ...movForm, descripcion: e.target.value })} className="p-2 border rounded-lg flex-1" />
              <button onClick={registrarMov} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700">+</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Movimientos de esta caja</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Tipo</th><th className="pb-2">Monto</th><th className="pb-2">Descripción</th><th className="pb-2">Hora</th></tr></thead>
              <tbody>
                {estado.movimientos?.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="py-2"><span className={`px-2 py-1 rounded-full text-xs ${m.tipo === "egreso" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{m.tipo}</span></td>
                    <td className="py-2 font-medium">₡{money(m.monto)}</td>
                    <td className="py-2">{m.descripcion || "-"}</td>
                    <td className="py-2 text-gray-500">{new Date(m.fecha).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow p-4 mt-6">
        <h3 className="font-semibold mb-3">Historial de cierres</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Apertura</th><th className="pb-2">Cierre</th><th className="pb-2">Usuario</th><th className="pb-2">Inicial CRC</th><th className="pb-2">Inicial USD</th><th className="pb-2">Final CRC</th><th className="pb-2">Final USD</th><th className="pb-2">Datafono</th><th className="pb-2">Dif. CRC</th><th className="pb-2">Dif. USD</th></tr></thead>
          <tbody>
            {historial.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{new Date(c.fecha_apertura).toLocaleString()}</td>
                <td className="py-2">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString() : "-"}</td>
                <td className="py-2">{c.usuario?.nombre || "-"}</td>
                <td className="py-2">₡{money(c.monto_inicial_crc)}</td>
                <td className="py-2">${money(c.monto_inicial_usd)}</td>
                <td className="py-2">{c.conteo_crc != null ? `₡${money(c.conteo_crc)}` : "-"}</td>
                <td className="py-2">{c.conteo_usd != null ? `$${money(c.conteo_usd)}` : "-"}</td>
                <td className="py-2">{c.datafono != null ? `₡${money(c.datafono)}` : "-"}</td>
                <td className={`py-2 font-medium ${c.diferencia_crc > 0 ? "text-green-600" : c.diferencia_crc < 0 ? "text-red-600" : ""}`}>{c.diferencia_crc != null ? money(c.diferencia_crc) : "-"}</td>
                <td className={`py-2 font-medium ${c.diferencia_usd > 0 ? "text-green-600" : c.diferencia_usd < 0 ? "text-red-600" : ""}`}>{c.diferencia_usd != null ? money(c.diferencia_usd) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
