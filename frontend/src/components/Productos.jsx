import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [artesanos, setArtesanos] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ codigo: "", nombre: "", descripcion: "", categoria_id: "", artesano_id: "", precio: "", costo: "", moneda: "CRC", stock: "", stock_minimo: "" });
  const debounceRef = useRef(null);
  const perPage = 50;

  function calcularPrecio(costo) {
    const c = parseFloat(costo);
    if (isNaN(c) || c <= 0) return "";
    if (c <= 10000) return (c * 1.7).toFixed(2);
    if (c <= 20000) return (c * 1.6).toFixed(2);
    if (c <= 35000) return (c + 12500).toFixed(2);
    if (c <= 55000) return (c + 17500).toFixed(2);
    return (c + 22500).toFixed(2);
  }

  useEffect(() => {
    setCategorias(api.get("/categorias"));
    api.get("/artesanos?por_pagina=9999").then(r => setArtesanos(r.artesanos));
  }, []);

  useEffect(() => {
    cargar(1);
  }, [search]);

  useEffect(() => {
    cargar(page);
  }, [page]);

  async function cargar(p) {
    const params = `?page=${p}&per_page=${perPage}${search ? `&busqueda=${encodeURIComponent(search)}` : ""}`;
    const res = await api.get(`/productos${params}`);
    setProductos(res.items || []);
    setTotal(res.total || 0);
  }

  function handleSearch(e) {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
    }, 300);
  }

  async function guardar() {
    const payload = { ...form, categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null, artesano_id: form.artesano_id ? parseInt(form.artesano_id) : null, precio: parseFloat(form.precio) || 0, costo: parseFloat(form.costo) || 0, stock: parseFloat(form.stock) || 0, stock_minimo: parseFloat(form.stock_minimo) || 0 };
    if (editando) {
      await api.put(`/productos/${editando.id}`, payload);
    } else {
      await api.post("/productos", payload);
    }
    resetForm();
    setShowForm(false);
    cargar(page);
  }

  function editar(p) {
    setForm({ codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion || "", categoria_id: p.categoria_id || "", artesano_id: p.artesano_id || "", precio: p.precio, costo: p.costo, moneda: p.moneda, stock: p.stock, stock_minimo: p.stock_minimo });
    setEditando(p);
    setShowForm(true);
  }

  function resetForm() {
    setForm({ codigo: "", nombre: "", descripcion: "", categoria_id: "", artesano_id: "", precio: "", costo: "", moneda: "CRC", stock: "", stock_minimo: "" });
    setEditando(null);
  }

  async function eliminar(id) {
    if (confirm("¿Eliminar producto?")) {
      await api.delete(`/productos/${id}`);
      cargar(page);
    }
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Productos</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">+ Nuevo</button>
      </div>

      <input type="text" placeholder="Buscar por nombre o código..." value={search} onChange={handleSearch} className="w-full p-3 border rounded-xl mb-4" />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{editando ? "Editar" : "Nuevo"} producto</h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="p-2 border rounded-lg" />
              <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="p-2 border rounded-lg" />
              <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="p-2 border rounded-lg col-span-2" />
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} className="p-2 border rounded-lg">
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={form.artesano_id} onChange={(e) => setForm({ ...form, artesano_id: e.target.value })} className="p-2 border rounded-lg">
                <option value="">Sin artesano</option>
                {artesanos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="p-2 border rounded-lg">
                <option value="CRC">CRC (₡)</option>
                <option value="USD">USD ($)</option>
              </select>
              <input placeholder="Precio" type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className="p-2 border rounded-lg" />
              <input placeholder="Costo" type="number" step="0.01" value={form.costo} onChange={(e) => { const c = e.target.value; setForm({ ...form, costo: c, precio: calcularPrecio(c) || form.precio }); }} className="p-2 border rounded-lg" />
              <input placeholder="Stock" type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="p-2 border rounded-lg" />
              <input placeholder="Stock mínimo" type="number" step="0.01" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} className="p-2 border rounded-lg" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-xl">Cancelar</button>
              <button onClick={guardar} className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">{editando ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Artesano</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Costo</th>
              <th className="p-3">Stock</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono">{p.codigo}</td>
                <td className="p-3">{p.nombre}</td>
                <td className="p-3">{p.categoria?.nombre || "-"}</td>
                <td className="p-3">{p.artesano?.nombre || "-"}</td>
                <td className="p-3 font-medium">₡{money(p.precio)}</td>
                <td className="p-3 text-gray-500">₡{money(p.costo)}</td>
                <td className={`p-3 font-medium ${p.stock <= p.stock_minimo ? "text-red-600" : ""}`}>{p.stock}</td>
                <td className="p-3">
                  <button onClick={() => editar(p)} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => eliminar(p.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-400">Sin productos</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">{total} productos — Pág. {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40">← Anterior</button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40">Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  );
}
