import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";

export default function ReporteInventario() {
  const [items, setItems] = useState([]);
  const [resumen, setResumen] = useState({ artesanos: 0, total_productos: 0, sin_stock: 0 });
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [abierto, setAbierto] = useState(null);

  function cargar() {
    const params = new URLSearchParams({ busqueda, pagina, por_pagina: 120 });
    api.get(`/reportes/inventario-artesanos?${params}`).then(r => {
      setItems(r.items || []);
      setResumen(r.resumen || { artesanos: 0, total_productos: 0, sin_stock: 0 });
      setPagina(r.pagina);
      setPaginas(r.paginas);
    });
  }

  useEffect(() => { cargar(); }, [busqueda, pagina]);

  function handleBusqueda(e) {
    setBusqueda(e.target.value);
    setPagina(1);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reporte de Inventario por Artesano</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/reportes/inventario-artesanos/pdf";
              a.download = "inventario_artesanos.pdf";
              a.click();
            }}
            className="px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
          >
            PDF
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `Inventario por artesano:\n${resumen.artesanos} artesanos\n${resumen.total_productos} productos\n${resumen.sin_stock} sin stock`
              );
              alert("Resumen copiado al portapapeles");
            }}
            className="px-4 py-1.5 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700"
          >
            Copiar resumen
          </button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-600 mb-6">
        <p className="font-semibold mb-2">Resumen general</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-500">Artesanos:</span>
            <span className="font-bold ml-2">{resumen.artesanos}</span>
          </div>
          <div>
            <span className="text-gray-500">Total productos:</span>
            <span className="font-bold ml-2">{resumen.total_productos}</span>
          </div>
          <div>
            <span className="text-gray-500">Productos sin stock:</span>
            <span className="font-bold ml-2 text-red-600">{resumen.sin_stock}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar artesano por código o nombre..."
          value={busqueda}
          onChange={handleBusqueda}
          className="w-full max-w-md p-2 border rounded-lg"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No hay datos</p>
      ) : (
        <div className="space-y-4">
          {items.map((a) => {
            const tieneTel = a.telefono?.replace(/\D/g, "").length >= 8;
            return (
            <div key={a.id} className="bg-white rounded-xl shadow">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => setAbierto(abierto === a.id ? null : a.id)}
                  className="text-left flex-1 hover:bg-gray-50 rounded-xl"
                >
                  <div>
                    <h3 className="font-bold text-lg">
                      {a.codigo ? `${a.codigo} - ` : ""}{a.nombre}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {a.comunidad}{a.cultura ? ` · ${a.cultura}` : ""} |
                      Total: {a.total_productos} prod. |
                      <span className="text-green-600 ml-1">{a.en_stock} en stock</span>
                      <span className="text-red-600 ml-1">{a.sin_stock} sin stock</span>
                    </p>
                  </div>
                </button>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => {
                      const aEl = document.createElement("a");
                      aEl.href = `/api/reportes/inventario-artesanos/${a.id}/pdf`;
                      aEl.download = `inventario_${a.codigo || a.id}.pdf`;
                      aEl.click();
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                    title="Descargar PDF"
                  >
                    PDF
                  </button>
                  {tieneTel ? (
                    <button
                      onClick={() => {
                        const pais = "506";
                        const num = a.telefono.replace(/\D/g, "");
                        const full = num.startsWith(pais) ? num : pais + num;
                        const txt = `Hola ${a.nombre}, este es su reporte de inventario:\nProductos: ${a.total_productos}\nEn stock: ${a.en_stock}\nSin stock: ${a.sin_stock}`;
                        window.open(`https://wa.me/${full}?text=${encodeURIComponent(txt)}`, "_blank");
                      }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg border border-green-300 text-green-600 hover:bg-green-50"
                      title="Enviar por WhatsApp"
                    >
                      WhatsApp
                    </button>
                  ) : (
                    <span className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-lg" title="Sin teléfono registrado">WhatsApp</span>
                  )}
                </div>
                <button
                  onClick={() => setAbierto(abierto === a.id ? null : a.id)}
                  className="ml-3 hover:bg-gray-50 rounded-xl p-2"
                >
                  <span className="text-xl">{abierto === a.id ? "▲" : "▼"}</span>
                </button>
              </div>

              {abierto === a.id && (
                <div className="border-t px-4 pb-4">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Código</th>
                        <th className="pb-2">Producto</th>
                        <th className="pb-2">Stock</th>
                        <th className="pb-2">Precio</th>
                        <th className="pb-2">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.productos.map((p) => (
                        <tr key={p.codigo} className="border-b border-gray-100">
                          <td className="py-2 font-mono text-xs">{p.codigo}</td>
                          <td className="py-2">{p.nombre}</td>
                          <td className={`py-2 font-medium ${p.stock <= 0 ? "text-red-600" : p.stock <= 5 ? "text-yellow-600" : "text-green-600"}`}>
                            {p.stock}
                          </td>
                          <td className="py-2">₡{money(p.precio)}</td>
                          <td className="py-2 text-gray-500">₡{money(p.costo)}</td>
                        </tr>
                      ))}
                      {a.productos.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-400">Sin productos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

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
