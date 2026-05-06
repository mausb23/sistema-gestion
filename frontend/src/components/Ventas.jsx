import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";
import { money } from "../lib/format";

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [items, setItems] = useState([]);
  const [codigoInput, setCodigoInput] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [showHistorial, setShowHistorial] = useState(false);
  const [tipoCambio, setTipoCambio] = useState(null);
  const [tipoCambioVenta, setTipoCambioVenta] = useState(null);
  const [ultimoProducto, setUltimoProducto] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showBusqueda, setShowBusqueda] = useState(false);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const inputRef = useRef(null);

  const usuario = store.getUsuario();

  useEffect(() => {
    api.get("/productos").then(setProductos);
    api.get("/ventas").then(setVentas);
    api.get("/config").then((cfg) => {
      if (cfg.tipo_cambio_compra) setTipoCambio(parseFloat(cfg.tipo_cambio_compra));
      if (cfg.tipo_cambio_venta) setTipoCambioVenta(parseFloat(cfg.tipo_cambio_venta));
    });
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, [showHistorial]);

  function buscarProducto(codigo) {
    const limpio = codigo.trim();
    if (!limpio) return null;
    return productos.find(
      (p) => p.codigo === limpio || p.codigo.replace(/-/g, "") === limpio.replace(/-/g, "")
    );
  }

  function agregarItem(p) {
    if (p.stock <= 0) {
      setErrorMsg("Producto sin stock");
      setTimeout(() => setErrorMsg(""), 2000);
      return;
    }
    const existente = items.find((i) => i.producto_id === p.id);
    if (existente) {
      setItems(items.map((i) =>
        i.producto_id === p.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i
      ));
    } else {
      setItems([...items, { producto_id: p.id, nombre: p.nombre, codigo: p.codigo, cantidad: 1, precio_unitario: p.precio, subtotal: p.precio }]);
    }
    setUltimoProducto(p);
    setErrorMsg("");
  }

  function manejarCodigo(e) {
    if (e.key !== "Enter") return;
    const p = buscarProducto(codigoInput);
    if (p) {
      agregarItem(p);
    } else {
      setErrorMsg(`Producto no encontrado: ${codigoInput}`);
      setTimeout(() => setErrorMsg(""), 2500);
    }
    setCodigoInput("");
  }

  function cambiarCantidad(id, cant) {
    if (cant <= 0) { setItems(items.filter((i) => i.producto_id !== id)); return; }
    setItems(items.map((i) => i.producto_id === id ? { ...i, cantidad: cant, subtotal: cant * i.precio_unitario } : i));
  }

  const esUSD = metodoPago === "efectivo_dolares";

  async function registrarVenta() {
    if (!items.length || !usuario) return;
    await api.post("/ventas", {
      usuario_id: usuario.id,
      items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
      metodo_pago: metodoPago,
      moneda: esUSD ? "USD" : "CRC",
    });
    setItems([]);
    setUltimoProducto(null);
    api.get("/productos").then(setProductos);
    api.get("/ventas").then(setVentas);
    inputRef.current?.focus();
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const totalUSD = tipoCambio ? total / tipoCambio : 0;

  const filtradosBusqueda = productos.filter(
    (p) => p.stock > 0 && (!busquedaTexto || p.nombre.toLowerCase().includes(busquedaTexto.toLowerCase()) || p.codigo.includes(busquedaTexto))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Punto de Venta</h2>
        <button onClick={() => setShowHistorial(!showHistorial)} className="text-blue-600 hover:underline">
          {showHistorial ? "← Nueva venta" : "📋 Historial"}
        </button>
      </div>

      {!showHistorial ? (
        <div className="max-w-2xl mx-auto">
          {tipoCambio && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center justify-between text-sm mb-4">
              <span className="text-blue-700 font-medium">Tipo de cambio BCCR (BNCR)</span>
              <span className="text-gray-600">Compra: <strong className="text-green-700">₡{money(tipoCambio)}</strong></span>
              <span className="text-gray-600">Venta: <strong className="text-red-700">₡{tipoCambioVenta ? money(tipoCambioVenta) : ""}</strong></span>
              <span className="text-xs text-gray-400">C/2 h</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                placeholder="Escaneá o ingresá el código del producto..."
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                onKeyDown={manejarCodigo}
                className="flex-1 p-4 text-lg border-2 border-blue-400 rounded-xl focus:outline-none focus:border-blue-600"
              />
              <button
                onClick={() => { setShowBusqueda(true); setBusquedaTexto(""); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 font-semibold text-sm"
                title="Buscar por nombre"
              >
                Buscar
              </button>
            </div>
            {errorMsg && (
              <p className="text-red-600 text-sm mt-2 font-medium">{errorMsg}</p>
            )}
            {ultimoProducto && (
              <p className="text-green-600 text-sm mt-2">
                ✓ {ultimoProducto.nombre} — ₡{money(ultimoProducto.precio)}
              </p>
            )}
          </div>

          {showBusqueda && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBusqueda(false)}>
              <div className="bg-white p-6 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Buscar producto</h3>
                <input type="text" placeholder="Buscar por nombre o código..." value={busquedaTexto} onChange={(e) => setBusquedaTexto(e.target.value)} className="w-full p-3 border rounded-lg mb-4" autoFocus />
                <div className="space-y-2">
                  {filtradosBusqueda.map((p) => (
                    <button key={p.id} onClick={() => { agregarItem(p); setShowBusqueda(false); }} className="w-full text-left p-3 rounded-lg hover:bg-blue-50 border flex justify-between items-center">
                      <div>
                        <p className="font-medium">{p.nombre}</p>
                        <p className="text-sm text-gray-500">{p.codigo} | Stock: {p.stock}</p>
                      </div>
                      <span className="font-bold text-blue-600">₡{money(p.precio)}</span>
                    </button>
                  ))}
                  {filtradosBusqueda.length === 0 && <p className="text-gray-400 text-center py-4">Sin resultados</p>}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">Venta actual ({items.length} items)</h3>
            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
              {items.map((i) => (
                <div key={i.producto_id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{i.nombre}</p>
                    <p className="text-xs text-gray-500">{i.codigo} · ₡{money(i.precio_unitario)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => cambiarCantidad(i.producto_id, i.cantidad - 1)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold">-</button>
                    <span className="w-10 text-center font-bold">{i.cantidad}</span>
                    <button onClick={() => cambiarCantidad(i.producto_id, i.cantidad + 1)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold">+</button>
                    <span className="w-24 text-right font-medium">₡{money(i.subtotal)}</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-lg">
                  Escaneá un producto para comenzar
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-2xl text-blue-600">₡{money(total)}</span>
              </div>
              {esUSD && tipoCambio && (
                <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                  <span>TC compra: ₡{money(tipoCambio)}</span>
                  <span className="font-semibold text-blue-500">≈ ${money(totalUSD)} USD</span>
                </div>
              )}
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full p-2 border rounded-lg mb-3">
                <option value="efectivo">Efectivo colones</option>
                <option value="efectivo_dolares">Efectivo Dólares</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="sinpe">SINPE Móvil</option>
              </select>
              <button onClick={registrarVenta} disabled={!items.length} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-300">
                {esUSD && totalUSD > 0 ? `Cobrar $${money(totalUSD)}` : `Cobrar ₡${money(total)}`}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-3">
            <a href="/api/ventas/exportar-excel" className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 text-sm font-semibold">Descargar Excel</a>
          </div>
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
                    <td className="p-3 font-medium">₡{money(v.total)}</td>
                    <td className="p-3 capitalize">{v.metodo_pago === "efectivo_dolares" ? "Efectivo Dólares" : v.metodo_pago === "sinpe" ? "SINPE Móvil" : v.metodo_pago}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${v.estado === "completada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{v.estado}</span></td>
                  </tr>
                ))}
                {ventas.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400">Sin ventas registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
