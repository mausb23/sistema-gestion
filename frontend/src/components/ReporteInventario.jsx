import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";

export default function ReporteInventario() {
  const [artesanos, setArtesanos] = useState([]);
  const [data, setData] = useState([]);
  const [artesanoFiltro, setArtesanoFiltro] = useState("");
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    api.get("/artesanos").then(setArtesanos);
  }, []);

  function cargar() {
    const params = artesanoFiltro ? `?artesano_id=${artesanoFiltro}` : "";
    api.get(`/reportes/inventario-artesanos${params}`).then(setData);
  }

  useEffect(() => { cargar(); }, [artesanoFiltro]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reporte de Inventario por Artesano</h2>
        <select value={artesanoFiltro} onChange={(e) => setArtesanoFiltro(e.target.value)} className="p-2 border rounded-lg text-sm">
          <option value="">Todos los artesanos</option>
          {artesanos.map((a) => (
            <option key={a.id} value={a.id}>{a.codigo ? `${a.codigo} - ` : ""}{a.nombre}</option>
          ))}
        </select>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No hay datos</p>
      ) : (
        <div className="space-y-4">
          {data.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow">
              <button
                onClick={() => setAbierto(abierto === a.id ? null : a.id)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl"
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
                <span className="text-xl">{abierto === a.id ? "▲" : "▼"}</span>
              </button>

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
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold mb-2">Resumen general</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-500">Artesanos:</span>
            <span className="font-bold ml-2">{data.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Total productos:</span>
            <span className="font-bold ml-2">{data.reduce((s, a) => s + a.total_productos, 0)}</span>
          </div>
          <div>
            <span className="text-gray-500">Productos sin stock:</span>
            <span className="font-bold ml-2 text-red-600">{data.reduce((s, a) => s + a.sin_stock, 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
