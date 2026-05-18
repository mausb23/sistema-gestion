import { useState } from "react";

const links = [
  { label: "Dashboard", icon: "📊", section: "dashboard" },
  { label: "Productos", icon: "📦", section: "productos" },
  { label: "Ventas", icon: "🧾", section: "ventas" },
  { label: "Inventario", icon: "📋", section: "inventario" },
  { label: "Artesanos", icon: "👷", section: "artesanos" },
  { label: "Liquidaciones", icon: "💰", section: "liquidaciones" },
  { label: "Caja", icon: "🏦", section: "caja" },
  { label: "Reporte Inventario", icon: "📑", section: "reporte-inventario" },
  { label: "Configuración", icon: "⚙️", section: "config" },
];

export default function Sidebar({ current, onChange }) {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Gestión de Ventas</h1>
      </div>
      <nav className="flex-1 p-2">
        {links.map((l) => (
          <button
            key={l.section}
            onClick={() => onChange(l.section)}
            className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 transition ${
              current === l.section
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
