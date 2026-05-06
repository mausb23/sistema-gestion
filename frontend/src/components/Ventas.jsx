import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [showHistorial, setShowHistorial] = useState(false);

  const usuario = store.getUsuario();

  useEffect(() => {
    api.get("/productos").then(setProductos);
    api.get("/clientes").then(setClientes);
    api.get("/ventas").then(setVentas);
  }, []);

  function agregarItem(p) {
    const existente = items.find((i) => i.producto_id === p.id);
    if (existente) {
      setItems(items.map((i) => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario } : i));
    } else {
      setItems([...items, { producto_id: p.id, nombre: p.nombre, codigo: p.codigo, cantidad: 1, precio_unitario: p.precio, subtotal: p.precio }]);
    }
  }

  function cambiarCantidad(id, cant) {
    if (cant <= 0) { setItems(items.filter((i) => i.producto_id !== id)); return; }
    setItems(items.map((i) => i.producto_id === id ? { ...i, cantidad: cant, subtotal: cant * i.precio_unitario } : i));
  }

  async function registrarVenta() {
    if (!items.length || !usuario) return;
    await api.post("/ventas", {
      usuario_id: usuario.id,
      items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
      metodo_pago: metodoPago,
    });
    setItems([]);
    api.get("/productos").then(setProductos);
    api.get("/ventas").then(setVentas);
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const filtrados = productos.filter((p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase()));
  const activos = filtrados.filter((p) => p.stock > 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Punto de Venta</h2>
        <button onClick={() => setShowHistorial(!showHistorial)} className="text-blue-600 hover:underline">
          {showHistorial ? "← Nueva venta" : "📋 Historial"}
        </button>
      </div>

      {!showHistorial ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Productos</h3>
            <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full p-2 border rounded-lg mb-3" />
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {activos.map((p) => (
                <button key={p.id} onClick={() => agregarItem(p)} className="w-full text-left p-3 rounded-lg hover:bg-blue-50 border flex justify-between items-center">
                  <div>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-sm text-gray-500">{p.codigo} | Stock: {p.stock}</p>
                  </div>
                  <span className="font-bold text-blue-600">${p.precio.toFixed(2)}</span>
                </button>
              ))}
              {activos.length === 0 && <p className="text-gray-400 text-center py-4">Sin productos disponibles</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Venta actual</h3>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {items.map((i) => (
                <div key={i.producto_id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{i.nombre}</p>
                    <p className="text-xs text-gray-500">${i.precio_unitario.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambiarCantidad(i.producto_id, i.cantidad - 1)} className="w-7 h-7 rounded-full bg-gray-200">-</button>
                    <span className="w-8 text-center">{i.cantidad}</span>
                    <button onClick={() => cambiarCantidad(i.producto_id, i.cantidad + 1)} className="w-7 h-7 rounded-full bg-gray-200">+</button>
                    <span className="w-20 text-right font-medium">${i.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-gray-400 text-center py-8">Agrega productos</p>}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-2xl text-blue-600">${total.toFixed(2)}</span>
              </div>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full p-2 border rounded-lg mb-3">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="credito">Crédito</option>
              </select>
              <button onClick={registrarVenta} disabled={!items.length} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-300">
                Cobrar ${total.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr><th className="p-3">#</th><th className="p-3">Fecha</th><th className="p-3">Usuario</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Pago</th><th className="p-3">Estado</th></tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono">{v.id}</td>
                  <td className="p-3">{new Date(v.fecha).toLocaleString()}</td>
                  <td className="p-3">{v.usuario?.nombre || "-"}</td>
                  <td className="p-3">{v.items?.length || 0}</td>
                  <td className="p-3 font-medium">${v.total.toFixed(2)}</td>
                  <td className="p-3 capitalize">{v.metodo_pago}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${v.estado === "completada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{v.estado}</span></td>
                </tr>
              ))}
              {ventas.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400">Sin ventas registradas</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
