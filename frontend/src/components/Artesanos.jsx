import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Artesanos() {
  const [artesanos, setArtesanos] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ codigo: "", nombre: "", telefono: "", email: "", comunidad_id: "" });
  const [sortCampo, setSortCampo] = useState("codigo");
  const [sortDir, setSortDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { cargar(); cargarComunidades(); }, []);
  useEffect(() => { cargar(); }, [busqueda, pagina]);

  async function cargar() {
    const params = new URLSearchParams({ busqueda, pagina, por_pagina: 120 });
    const res = await api.get(`/artesanos?${params}`);
    setArtesanos(res.artesanos);
    setTotal(res.total);
    setPagina(res.pagina);
    setPaginas(res.paginas);
  }

  async function cargarComunidades() {
    setComunidades(await api.get("/comunidades"));
  }

  function resetForm() {
    setForm({ codigo: "", nombre: "", telefono: "", email: "", comunidad_id: "" });
    setEditando(null);
  }

  async function guardar() {
    const payload = { ...form, codigo: form.codigo || undefined, comunidad_id: form.comunidad_id ? parseInt(form.comunidad_id) : null };
    if (editando) {
      await api.put(`/artesanos/${editando.id}`, payload);
    } else {
      await api.post("/artesanos", payload);
    }
    resetForm();
    setShowForm(false);
    cargar();
  }

  function editar(a) {
    setForm({ codigo: a.codigo || "", nombre: a.nombre, telefono: a.telefono || "", email: a.email || "", comunidad_id: a.comunidad_id || "" });
    setEditando(a);
    setShowForm(true);
  }

  async function eliminar(id) {
    if (confirm("¿Eliminar artesano?")) {
      await api.delete(`/artesanos/${id}`);
      cargar();
    }
  }

  function toggleSort(campo) {
    if (sortCampo === campo) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCampo(campo); setSortDir("asc"); }
  }

  function handleBusqueda(e) {
    setBusqueda(e.target.value);
    setPagina(1);
  }

  const ordenados = [...artesanos].sort((a, b) => {
    const va = ((sortCampo === "codigo" ? a.codigo : a.nombre) || "").toString().toLowerCase();
    const vb = ((sortCampo === "codigo" ? b.codigo : b.nombre) || "").toString().toLowerCase();
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Artesanos</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{total} artesanos</span>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">+ Nuevo</button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por código o nombre..."
          value={busqueda}
          onChange={handleBusqueda}
          className="w-full max-w-md p-2 border rounded-lg"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{editando ? "Editar" : "Nuevo"} artesano</h3>
            <input placeholder="Código (ej: 01-001)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="w-full p-2 border rounded-lg mb-3" />
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full p-2 border rounded-lg mb-3" />
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full p-2 border rounded-lg mb-3" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full p-2 border rounded-lg mb-3" />
            <select value={form.comunidad_id} onChange={(e) => setForm({ ...form, comunidad_id: e.target.value })} className="w-full p-2 border rounded-lg mb-4">
              <option value="">Sin comunidad</option>
              {comunidades.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
              ))}
            </select>
            <div className="flex gap-3">
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
              <th className="p-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("codigo")}>
                Código {sortCampo === "codigo" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th className="p-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("nombre")}>
                Nombre {sortCampo === "nombre" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th className="p-3">Comunidad</th><th className="p-3">Cultura</th><th className="p-3">Teléfono</th><th className="p-3">Email</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {ordenados.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-blue-600">{a.codigo || "-"}</td>
                <td className="p-3 font-medium">{a.nombre}</td>
                <td className="p-3">{a.comunidad?.nombre || "-"}</td>
                <td className="p-3">{a.comunidad?.cultura || "-"}</td>
                <td className="p-3">{a.telefono || "-"}</td>
                <td className="p-3">{a.email || "-"}</td>
                <td className="p-3">
                  <button onClick={() => editar(a)} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => eliminar(a.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
            {artesanos.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400">Sin artesanos registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPagina(Math.max(1, pagina - 1))}
            disabled={pagina === 1}
            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100"
          >
            ←
          </button>
          {Array.from({ length: paginas }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPagina(p)}
              className={`px-3 py-1 border rounded-lg text-sm ${p === pagina ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPagina(Math.min(paginas, pagina + 1))}
            disabled={pagina === paginas}
            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
