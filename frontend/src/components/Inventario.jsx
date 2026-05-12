import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [totalProd, setTotalProd] = useState(0);
  const [pageProd, setPageProd] = useState(1);
  const [movimientos, setMovimientos] = useState([]);
  const [totalMov, setTotalMov] = useState(0);
  const [pageMov, setPageMov] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ producto_id: "", producto_busqueda: "", tipo: "entrada", cantidad: "", motivo: "" });
  const [showProdDrop, setShowProdDrop] = useState(false);
  const [opcionesProducto, setOpcionesProducto] = useState([]);
  const usuario = store.getUsuario();
  const perPage = 50;

  useEffect(() => {
    cargarProductos();
    cargarMovimientos();
  }, []);

  useEffect(() => { cargarProductos(); }, [pageProd]);
  useEffect(() => { cargarMovimientos(); }, [pageMov]);

  async function cargarProductos() {
    const res = await api.get(`/productos?page=${pageProd}&per_page=${perPage}`);
    setProductos(res.items || []);
    setTotalProd(res.total || 0);
  }

  async function cargarMovimientos() {
    const res = await api.get(`/inventario/movimientos?page=${pageMov}&per_page=${perPage}`);
    setMovimientos(res.items || []);
    setTotalMov(res.total || 0);
  }

  async function buscarProductosDrop(q) {
    if (!q.trim()) { setOpcionesProducto([]); return; }
    const res = await api.get(`/productos?busqueda=${encodeURIComponent(q)}&per_page=10&solo_activos=true`);
    setOpcionesProducto(res.items || []);
  }

  async function guardar() {
    if (!form.producto_id || !form.cantidad) return;
    await api.post("/inventario/movimientos", {
      producto_id: parseInt(form.producto_id),
      tipo: form.tipo,
      cantidad: parseFloat(form.cantidad),
      motivo: form.motivo,
      usuario_id: usuario?.id || 0,
    });
    setForm({ producto_id: "", producto_busqueda: "", tipo: "entrada", cantidad: "", motivo: "" });
    setShowForm(false);
    cargarProductos();
    cargarMovimientos();
  }

  const totalPagesProd = Math.ceil(totalProd / perPage);
  const totalPagesMov = Math.ceil(totalMov / perPage);

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
            <div className="relative mb-3">
              <input
                placeholder="Buscar producto por nombre o código..."
                value={form.producto_busqueda}
                onChange={(e) => { const v = e.target.value; setForm({ ...form, producto_busqueda: v, producto_id: "" }); buscarProductosDrop(v); setShowProdDrop(true); }}
                onFocus={() => { if (form.producto_busqueda) setShowProdDrop(true); }}
                className="w-full p-2 border rounded-lg"
              />
              {showProdDrop && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                  {opcionesProducto.map((p) => (
                    <button key={p.id} type="button" onClick={() => { setForm({ ...form, producto_id: p.id, producto_busqueda: `${p.nombre} (${p.codigo})` }); setShowProdDrop(false); }} className="w-full text-left p-2 hover:bg-blue-50 text-sm border-b flex justify-between">
                      <span>{p.nombre}</span>
                      <span className="text-gray-400 text-xs">stock: {p.stock}</span>
                    </button>
                  ))}
                  {opcionesProducto.length === 0 && form.producto_busqueda && <p className="p-2 text-gray-400 text-sm">Sin resultados</p>}
                </div>
              )}
            </div>
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
            {productos.length === 0 && <p className="text-gray-400 text-center py-4">Sin productos</p>}
          </div>
          {totalPagesProd > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-gray-400">{totalProd} total</span>
              <div className="flex gap-2">
                <button disabled={pageProd <= 1} onClick={() => setPageProd(pageProd - 1)} className="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">←</button>
                <span className="text-xs text-gray-500">{pageProd}/{totalPagesProd}</span>
                <button disabled={pageProd >= totalPagesProd} onClick={() => setPageProd(pageProd + 1)} className="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">→</button>
              </div>
            </div>
          )}
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
          {totalPagesMov > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-gray-400">{totalMov} total</span>
              <div className="flex gap-2">
                <button disabled={pageMov <= 1} onClick={() => setPageMov(pageMov - 1)} className="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">←</button>
                <span className="text-xs text-gray-500">{pageMov}/{totalPagesMov}</span>
                <button disabled={pageMov >= totalPagesMov} onClick={() => setPageMov(pageMov + 1)} className="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
