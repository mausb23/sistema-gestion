import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";

export default function Configuracion() {
  const [config, setConfig] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [editConfig, setEditConfig] = useState({});

  const usuario = store.getUsuario();

  useEffect(() => {
    api.get("/config").then((c) => { setConfig(c); setEditConfig(c); });
    api.get("/usuarios").then(setUsuarios);
    api.get("/categorias").then(setCategorias);
  }, []);

  async function guardarConfig(clave, valor) {
    await api.put(`/config/${clave}`, { valor });
  }

  async function agregarUsuario() {
    if (!nuevoUsuario.trim()) return;
    const u = await api.post("/usuarios", { nombre: nuevoUsuario.trim() });
    setUsuarios([...usuarios, u]);
    setNuevoUsuario("");
  }

  async function eliminarUsuario(id) {
    await api.delete(`/usuarios/${id}`);
    setUsuarios(usuarios.filter((u) => u.id !== id));
  }

  async function agregarCategoria() {
    if (!nuevaCategoria.trim()) return;
    const c = await api.post("/categorias", { nombre: nuevaCategoria.trim() });
    setCategorias([...categorias, c]);
    setNuevaCategoria("");
  }

  async function eliminarCategoria(id) {
    await api.delete(`/categorias/${id}`);
    setCategorias(categorias.filter((c) => c.id !== id));
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Configuración</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Negocio</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Nombre del negocio</label>
              <input value={editConfig.nombre_negocio || ""} onChange={(e) => setEditConfig({ ...editConfig, nombre_negocio: e.target.value })} onBlur={() => guardarConfig("nombre_negocio", editConfig.nombre_negocio)} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Moneda por defecto</label>
              <select value={editConfig.moneda_defecto || "CRC"} onChange={(e) => { setEditConfig({ ...editConfig, moneda_defecto: e.target.value }); guardarConfig("moneda_defecto", e.target.value); }} className="w-full p-2 border rounded-lg">
                <option value="CRC">CRC (₡) - Colón costarricense</option>
                <option value="USD">USD ($) - Dólar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Símbolo de moneda</label>
              <input value={editConfig.simbolo_moneda || "$"} onChange={(e) => setEditConfig({ ...editConfig, simbolo_moneda: e.target.value })} onBlur={() => guardarConfig("simbolo_moneda", editConfig.simbolo_moneda)} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Usuarios</h3>
          <div className="space-y-2 mb-4">
            {usuarios.map((u) => (
              <div key={u.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-medium">{u.nombre}</span>
                  <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-100">{u.rol}</span>
                </div>
                <button onClick={() => eliminarUsuario(u.id)} className="text-red-600 text-sm hover:underline">Eliminar</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input placeholder="Nuevo usuario" value={nuevoUsuario} onChange={(e) => setNuevoUsuario(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarUsuario()} className="flex-1 p-2 border rounded-lg" />
            <button onClick={agregarUsuario} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700">+</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Categorías</h3>
          <div className="space-y-2 mb-4">
            {categorias.map((c) => (
              <div key={c.id} className="flex justify-between items-center border-b pb-2">
                <span>{c.nombre}</span>
                <button onClick={() => eliminarCategoria(c.id)} className="text-red-600 text-sm hover:underline">Eliminar</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input placeholder="Nueva categoría" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarCategoria()} className="flex-1 p-2 border rounded-lg" />
            <button onClick={agregarCategoria} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
