import { useState, useEffect } from "react";
import { store } from "../lib/store";
import UserSelector from "./UserSelector";
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Productos from "./Productos";
import Ventas from "./Ventas";
import Inventario from "./Inventario";
import Caja from "./Caja";
import Configuracion from "./Configuracion";
import Artesanos from "./Artesanos";
import Liquidaciones from "./Liquidaciones";
import ReporteInventario from "./ReporteInventario";

const sections = {
  dashboard: Dashboard,
  productos: Productos,
  ventas: Ventas,
  inventario: Inventario,
  caja: Caja,
  config: Configuracion,
  artesanos: Artesanos,
  liquidaciones: Liquidaciones,
  "reporte-inventario": ReporteInventario,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("dashboard");

  useEffect(() => {
    const saved = store.getUsuario();
    if (saved) {
      setUser(saved);
    }
  }, []);

  if (!user) {
    return <UserSelector onLogin={(u) => setUser(u)} />;
  }

  const Section = sections[section] || Dashboard;

  return (
    <div className="flex min-h-screen">
      <Sidebar current={section} onChange={setSection} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{user.nombre}</span>
            <button
              onClick={() => {
                store.clearUsuario();
                setUser(null);
              }}
              className="text-red-600 hover:underline"
            >
              Cambiar usuario
            </button>
          </div>
        </div>
        <Section onNavigate={setSection} />
      </main>
    </div>
  );
}
