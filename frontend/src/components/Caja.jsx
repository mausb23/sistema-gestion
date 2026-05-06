import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";

export default function Caja() {
  const [estado, setEstado] = useState(null);
  const [montoInicial, setMontoInicial] = useState("");
  const [movForm, setMovForm] = useState({ tipo: "ingreso", monto: "", descripcion: "" });
  const [historial, setHistorial] = useState([]);
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
    await api.post("/caja/abrir", { usuario_id: usuario.id, monto_inicial: parseFloat(montoInicial) || 0 });
    setMontoInicial("");
    cargarEstado();
  }

  async function cerrar() {
    await api.post("/caja/cerrar");
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Caja</h2>

      {!estado?.abierta ? (
        <div className="bg-white p-6 rounded-xl shadow max-w-md">
          <h3 className="font-semibold mb-4">Abrir caja</h3>
          <input type="number" step="0.01" placeholder="Monto inicial" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} className="w-full p-2 border rounded-lg mb-4" />
          <button onClick={abrir} className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700">Abrir caja</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Inicial</p><p className="text-xl font-bold">${estado.monto_inicial.toFixed(2)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Ventas</p><p className="text-xl font-bold text-blue-600">${(estado.ventas || 0).toFixed(2)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Otros ingresos</p><p className="text-xl font-bold text-green-600">${(estado.ingresos || 0).toFixed(2)}</p></div>
            <div className="bg-white p-4 rounded-xl shadow"><p className="text-gray-500 text-sm">Egresos</p><p className="text-xl font-bold text-red-600">${(estado.egresos || 0).toFixed(2)}</p></div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl mb-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600">Saldo actual</p>
              <p className="text-3xl font-bold text-blue-700">${(estado.saldo_actual || 0).toFixed(2)}</p>
            </div>
            <button onClick={cerrar} className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-semibold">Cerrar caja</button>
          </div>

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
                    <td className="py-2 font-medium">${m.monto.toFixed(2)}</td>
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
          <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Apertura</th><th className="pb-2">Cierre</th><th className="pb-2">Usuario</th><th className="pb-2">Inicial</th><th className="pb-2">Final</th><th className="pb-2">Estado</th></tr></thead>
          <tbody>
            {historial.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{new Date(c.fecha_apertura).toLocaleString()}</td>
                <td className="py-2">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString() : "-"}</td>
                <td className="py-2">{c.usuario?.nombre || "-"}</td>
                <td className="py-2">${c.monto_inicial.toFixed(2)}</td>
                <td className="py-2">{c.monto_final != null ? `$${c.monto_final.toFixed(2)}` : "-"}</td>
                <td className="py-2"><span className={`px-2 py-1 rounded-full text-xs ${c.estado === "abierta" ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{c.estado}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
