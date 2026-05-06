import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ producto_id: "", tipo: "entrada", cantidad: "", motivo: "" });
  const usuario = store.getUsuario();

  useEffect(() => {
    api.get("/productos").then(setProductos);
    api.get("/inventario/movimientos").then(setMovimientos);
  }, []);

  async function guardar() {
    if (!form.producto_id || !form.cantidad) return;
    await api.post("/inventario/movimientos", {
      producto_id: parseInt(form.producto_id),
      tipo: form.tipo,
      cantidad: parseFloat(form.cantidad),
      motivo: form.motivo,
      usuario_id: usuario?.id || 0,
    });
    setForm({ producto_id: "", tipo: "entrada", cantidad: "", motivo: "" });
    setShowForm(false);
    api.get("/productos").then(setProductos);
    api.get("/inventario/movimientos").then(setMovimientos);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Inventario</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">+ Movimiento</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Nuevo movimiento</h3>
            <select value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })} className="w-full p-2 border rounded-lg mb-3">
              <option value="">Seleccionar producto</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock})</option>)}
            </select>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full p-2 border rounded-lg mb-3">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
            <input type="number" step="0.01" placeholder="Cantidad" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="w-full p-2 border rounded-lg mb-3" />
            <input placeholder="Motivo" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="w-full p-2 border rounded-lg mb-4" />
            <button onClick={guardar} className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700">Registrar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3">Stock actual</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {productos.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.codigo}</p>
                </div>
                <div className={`font-bold ${p.stock <= p.stock_minimo ? "text-red-600" : "text-green-600"}`}>
                  {p.stock}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3">Últimos movimientos</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {movimientos.map((m) => (
              <div key={m.id} className="flex justify-between items-center border-b pb-2 text-sm">
                <div>
                  <p className="font-medium">{m.producto?.nombre || "-"}</p>
                  <p className="text-xs text-gray-500">{m.motivo} · {new Date(m.fecha).toLocaleString()}</p>
                </div>
                <div className={`font-bold ${m.tipo === "entrada" ? "text-green-600" : m.tipo === "salida" ? "text-red-600" : "text-yellow-600"}`}>
                  {m.tipo === "entrada" ? "+" : m.tipo === "salida" ? "-" : "="}{m.cantidad}
                  <span className="text-gray-400 ml-1">→ {m.stock_resultante}</span>
                </div>
              </div>
            ))}
            {movimientos.length === 0 && <p className="text-gray-400 text-center py-4">Sin movimientos</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
