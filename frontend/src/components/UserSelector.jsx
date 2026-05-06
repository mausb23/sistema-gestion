import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";

export default function UserSelector({ onLogin }) {
  const [usuarios, setUsuarios] = useState([]);
  const [selected, setSelected] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [recordar, setRecordar] = useState(true);

  useEffect(() => {
    api.get("/usuarios").then(setUsuarios);
  }, []);

  async function handleEntrar() {
    if (showNew && nuevoNombre.trim()) {
      const u = await api.post("/usuarios", { nombre: nuevoNombre.trim() });
      if (recordar) store.setUsuario(u);
      onLogin(u);
      return;
    }
    if (selected) {
      const u = usuarios.find((u) => u.id === parseInt(selected));
      if (u) {
        if (recordar) store.setUsuario(u);
        onLogin(u);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-900">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Gestión de Ventas</h1>
        <p className="text-gray-500 text-center mb-6">Selecciona tu nombre para entrar</p>

        {!showNew ? (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full p-3 border rounded-xl mb-4 text-lg"
            >
              <option value="">-- Seleccionar --</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNew(true)}
              className="text-blue-600 text-sm mb-4 hover:underline block"
            >
              + Nuevo usuario
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="w-full p-3 border rounded-xl mb-4 text-lg"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleEntrar()}
            />
            <button
              onClick={() => setShowNew(false)}
              className="text-gray-500 text-sm mb-4 hover:underline block"
            >
              ← Volver
            </button>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <input
            type="checkbox"
            checked={recordar}
            onChange={(e) => setRecordar(e.target.checked)}
          />
          Recordar en esta PC
        </label>

        <button
          onClick={handleEntrar}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
