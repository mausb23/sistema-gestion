import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { store } from "../lib/store";
import { money, etiquetaMetodoPago } from "../lib/format";

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

  const [clientes, setClientes] = useState([]);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteId, setClienteId] = useState(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [showClientes, setShowClientes] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState(null);
  const [emailDestino, setEmailDestino] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const debounceRef2 = useRef(null);

  const usuario = store.getUsuario();

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const res = await api.get("/ventas");
    setVentas(res.items || res || []);
    const [cfg, cs] = await Promise.all([
      api.get("/config"),
      api.get("/clientes"),
    ]);
    if (cfg.tipo_cambio_compra) setTipoCambio(parseFloat(cfg.tipo_cambio_compra));
    if (cfg.tipo_cambio_venta) setTipoCambioVenta(parseFloat(cfg.tipo_cambio_venta));
    setClientes(cs);
  }

  const buscarClientes = useCallback(async (q) => {
    if (!q.trim()) { setClientes(await api.get("/clientes")); return; }
    setClientes(await api.get(`/clientes?busqueda=${encodeURIComponent(q)}`));
  }, []);

  async function buscarProductoApi(codigo) {
    const res = await api.get(`/productos?busqueda=${encodeURIComponent(codigo)}&per_page=5&solo_activos=true`);
    const items = res.items || [];
    return items.find((p) => p.codigo === codigo || p.codigo.replace(/-/g, "") === codigo.replace(/-/g, ""));
  }

  async function buscarProductosPorTexto(texto) {
    if (!texto.trim()) return [];
    const res = await api.get(`/productos?busqueda=${encodeURIComponent(texto)}&per_page=20&solo_activos=true`);
    return res.items || [];
  }

  useEffect(() => { inputRef.current?.focus(); }, [showHistorial]);

  function agregarItem(p) {
    const existente = items.find((i) => i.producto_id === p.id);
    if (existente) {
      const nuevaCant = existente.cantidad + 1;
      setItems(items.map((i) =>
        i.producto_id === p.id
          ? { ...i, cantidad: nuevaCant, subtotal: nuevaCant * i.precio_unitario, stock: p.stock }
          : i
      ));
    } else {
      setItems([...items, { producto_id: p.id, nombre: p.nombre, codigo: p.codigo, cantidad: 1, precio_unitario: p.precio, subtotal: p.precio, stock: p.stock }]);
    }
    setUltimoProducto(p);
    setErrorMsg("");
    if (p.stock <= 0) {
      setErrorMsg("⚠ Sin stock registrado — se venderá igual y quedará en 0");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  }

  async function manejarCodigo(e) {
    if (e.key !== "Enter") return;
    const p = await buscarProductoApi(codigoInput);
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
    const pagosData = splitPago
      ? pagos.filter((p) => parseFloat(p.monto) > 0).map((p) => ({ metodo: p.metodo, monto: parseFloat(p.monto), moneda: monedaDeMetodo(p.metodo) }))
      : [{ metodo: metodoPago, monto: total, moneda: esUSD ? "USD" : "CRC" }];
    const hayUSD = pagosData.some((p) => p.moneda === "USD");
    const hayCRC = pagosData.some((p) => p.moneda === "CRC");
    const venta = await api.post("/ventas", {
      usuario_id: usuario.id,
      cliente_id: clienteId,
      items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
      metodo_pago: splitPago ? pagosData[0]?.metodo || metodoPago : metodoPago,
      pagos: pagosData,
      moneda: hayUSD && hayCRC ? "CRC" : hayUSD ? "USD" : "CRC",
    });
    setVentaCompletada({ id: venta.id, total, moneda: hayUSD && hayCRC ? "CRC" : hayUSD ? "USD" : "CRC", items: [...items] });
    setItems([]);
    setUltimoProducto(null);
    setMontoRecibido("");
    setSplitPago(false);
    setPagos([{ metodo: "efectivo", monto: "" }]);
    setMetodoPago("efectivo");
    setEmailDestino("");
    setMensajeEnvio("");
    api.post(`/ventas/${venta.id}/imprimir`).catch(() => {});
    cargarDatos();
    inputRef.current?.focus();
  }

  async function enviarRecibo() {
    if (!ventaCompletada || !emailDestino.trim()) return;
    setEnviando(true);
    setMensajeEnvio("");
    const res = await api.post(`/notificaciones/enviar-recibo/${ventaCompletada.id}?destinatario=${encodeURIComponent(emailDestino.trim())}`);
    setMensajeEnvio(res.error ? `Error: ${res.error}` : "Recibo enviado correctamente");
    setEnviando(false);
  }

  function abrirWhatsApp(telefono, texto) {
    const pais = "506";
    const num = telefono.replace(/\D/g, "");
    const full = num.startsWith(pais) ? num : pais + num;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const totalUSD = tipoCambio ? total / tipoCambio : 0;
  const [splitPago, setSplitPago] = useState(false);
  const [pagos, setPagos] = useState([{ metodo: "efectivo", monto: "" }]);

  function monedaDeMetodo(metodo) {
    return metodo === "efectivo_dolares" ? "USD" : "CRC";
  }

  function totalPagosCRC(pagosArr) {
    return pagosArr.reduce((s, p) => {
      const monto = parseFloat(p.monto) || 0;
      if (p.metodo === "efectivo_dolares" && tipoCambio) {
        return s + monto * tipoCambio;
      }
      return s + monto;
    }, 0);
  }

  function esMetodoEfectivo(metodo) {
    return metodo === "efectivo" || metodo === "efectivo_dolares";
  }

  const [montoRecibido, setMontoRecibido] = useState("");

  useEffect(() => {
    if (debounceRef2.current) clearTimeout(debounceRef2.current);
    debounceRef2.current = setTimeout(async () => {
      setResultadosBusqueda(await buscarProductosPorTexto(busquedaTexto));
    }, 300);
  }, [busquedaTexto]);

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
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre..."
                  value={clienteBusqueda}
                  onChange={(e) => { setClienteBusqueda(e.target.value); setShowClientes(true); buscarClientes(e.target.value); }}
                  onFocus={() => setShowClientes(true)}
                  className="w-full p-2 border rounded-lg text-sm"
                />
                {showClientes && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                    {clientes.filter((c) => !clienteBusqueda || c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase())).map((c) => (
                      <button key={c.id} type="button" onClick={() => { setClienteId(c.id); setClienteNombre(c.nombre); setClienteBusqueda(c.nombre); setShowClientes(false); }} className="w-full text-left p-2 hover:bg-blue-50 text-sm border-b flex justify-between">
                        <span>{c.nombre}</span>
                        <span className="text-gray-400 text-xs">{c.telefono || c.email || ""}</span>
                      </button>
                    ))}
                    {!clienteBusqueda && clientes.length === 0 && <p className="p-2 text-gray-400 text-sm">Sin clientes</p>}
                    <button type="button" onClick={() => { setClienteId(null); setClienteNombre(clienteBusqueda); setShowClientes(false); }} className="w-full text-left p-2 text-blue-600 hover:bg-blue-50 text-sm font-medium border-t">+ Nuevo: {clienteBusqueda || "sin nombre"}</button>
                  </div>
                )}
              </div>
              {clienteNombre && (
                <span className="text-sm text-gray-500 truncate max-w-40">{clienteNombre}</span>
              )}
              {clienteId && (
                <button onClick={() => { setClienteId(null); setClienteNombre(""); setClienteBusqueda(""); }} className="text-red-500 text-xs hover:underline">Quitar</button>
              )}
            </div>
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
                  {resultadosBusqueda.map((p) => (
                    <button key={p.id} onClick={() => { agregarItem(p); setShowBusqueda(false); }} className={`w-full text-left p-3 rounded-lg hover:bg-blue-50 border flex justify-between items-center ${p.stock <= 0 ? "bg-orange-50" : ""}`}>
                      <div>
                        <p className="font-medium">{p.nombre} {p.stock <= 0 ? <span className="text-orange-500 text-xs font-bold">⚠ Sin stock</span> : ""}</p>
                        <p className="text-sm text-gray-500">{p.codigo} | Stock: {p.stock}</p>
                      </div>
                      <span className="font-bold text-blue-600">₡{money(p.precio)}</span>
                    </button>
                  ))}
                  {resultadosBusqueda.length === 0 && busquedaTexto && <p className="text-gray-400 text-center py-4">Sin resultados</p>}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">Venta actual ({items.length} items)</h3>
            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
              {items.map((i) => {
                const sinStock = i.stock <= 0;
                const excedeStock = i.cantidad > i.stock;
                const hayAlerta = sinStock || excedeStock;
                return (
                <div key={i.producto_id} className={`flex items-center justify-between border-b pb-2 ${hayAlerta ? "bg-orange-50 rounded-lg px-2" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {hayAlerta && <span className="text-orange-500 font-bold text-sm" title={sinStock ? "Sin stock registrado" : `Stock disponible: ${i.stock}`}>⚠</span>}
                      <p className="font-medium text-sm truncate">{i.nombre}</p>
                    </div>
                    <p className="text-xs text-gray-500">{i.codigo} · ₡{money(i.precio_unitario)} c/u {hayAlerta && <span className="text-orange-600 font-medium">Stock: {i.stock}</span>}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => cambiarCantidad(i.producto_id, i.cantidad - 1)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold">-</button>
                    <span className="w-10 text-center font-bold">{i.cantidad}</span>
                    <button onClick={() => cambiarCantidad(i.producto_id, i.cantidad + 1)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold">+</button>
                    <span className="w-24 text-right font-medium">₡{money(i.subtotal)}</span>
                  </div>
                </div>
              );
              })}
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

                {!splitPago ? (
                  <>
                    <select value={metodoPago} onChange={(e) => { setMetodoPago(e.target.value); setMontoRecibido(""); }} className="w-full p-2 border rounded-lg mb-2">
                      <option value="efectivo">Efectivo colones</option>
                      <option value="efectivo_dolares">Efectivo Dólares</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="sinpe">SINPE Móvil</option>
                    </select>
                    {esMetodoEfectivo(metodoPago) && (
                      <div className="space-y-1 mb-3">
                        <div className="flex gap-2 items-center">
                          <span className="text-sm text-gray-500 w-16">{metodoPago === "efectivo_dolares" ? "Recibido $" : "Recibido ₡"}</span>
                          <input
                            type="number" step="0.01" min="0" placeholder="0"
                            value={montoRecibido}
                            onChange={(e) => setMontoRecibido(e.target.value)}
                            className="flex-1 p-2 border rounded-lg text-sm"
                            autoFocus={items.length > 0}
                          />
                        </div>
                        {montoRecibido && parseFloat(montoRecibido) > 0 && (
                          <div className="flex justify-between items-center px-2">
                            <span className="text-sm text-gray-500">Vuelto</span>
                            {metodoPago === "efectivo_dolares" && tipoCambio ? (
                              <span className="text-lg font-bold text-emerald-600">
                                ${money(Math.max(0, parseFloat(montoRecibido) - totalUSD))}
                              </span>
                            ) : (
                              <span className="text-lg font-bold text-emerald-600">
                                ₡{money(Math.max(0, parseFloat(montoRecibido) - total))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={registrarVenta} disabled={!items.length} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-300 mb-2">
                      {esUSD && totalUSD > 0 ? `Cobrar $${money(totalUSD)}` : `Cobrar ₡${money(total)}`}
                    </button>
                  </>
                ) : (
                  <div className="mb-3 space-y-2">
                    <p className="text-sm font-semibold text-gray-600">
                      Dividir pago — Total: ₡{money(total)}
                      {tipoCambio && <span className="font-normal text-gray-400 ml-2">(TC: ₡{money(tipoCambio)})</span>}
                    </p>
                    {pagos.map((p, idx) => {
                      const esUSD = p.metodo === "efectivo_dolares";
                      const esCash = esMetodoEfectivo(p.metodo);
                      return (
                      <div key={idx}>
                        <div className="flex gap-2 items-center">
                          <select
                            value={p.metodo}
                            onChange={(e) => {
                              const nuevos = [...pagos];
                              nuevos[idx] = { ...nuevos[idx], metodo: e.target.value, recibido: "" };
                              setPagos(nuevos);
                            }}
                            className="flex-1 p-2 border rounded-lg text-sm"
                          >
                            <option value="efectivo">Efectivo colones</option>
                            <option value="efectivo_dolares">Efectivo Dólares</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="sinpe">SINPE Móvil</option>
                          </select>
                          <input
                            type="number" step="0.01" placeholder={esUSD ? "Monto $" : "Monto ₡"}
                            value={p.monto}
                            onChange={(e) => {
                              const nuevos = [...pagos];
                              nuevos[idx] = { ...nuevos[idx], monto: e.target.value };
                              setPagos(nuevos);
                            }}
                            className="w-24 p-2 border rounded-lg text-sm"
                          />
                          {pagos.length > 1 && (
                            <button onClick={() => setPagos(pagos.filter((_, i) => i !== idx))} className="text-red-500 text-sm font-bold px-2">✕</button>
                          )}
                        </div>
                        {esCash && (
                          <div className="flex gap-2 items-center ml-4 mt-1">
                            <span className="text-xs text-gray-400 w-12">{esUSD ? "Recib. $" : "Recib. ₡"}</span>
                            <input
                              type="number" step="0.01" min="0" placeholder="0"
                              value={p.recibido || ""}
                              onChange={(e) => {
                                const nuevos = [...pagos];
                                nuevos[idx] = { ...nuevos[idx], recibido: e.target.value };
                                setPagos(nuevos);
                              }}
                              className="w-24 p-1.5 border rounded text-sm"
                            />
                            {p.recibido && parseFloat(p.recibido) > 0 && (
                              <span className="text-xs font-bold text-emerald-600">
                                Vuelto: {esUSD ? "$" : "₡"}{money(Math.max(0, parseFloat(p.recibido) - (parseFloat(p.monto) || 0)))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {tipoCambio && (() => {
                      const sumaCRC = totalPagosCRC(pagos);
                      const diff = total - sumaCRC;
                      const diffAbs = Math.abs(diff);
                      return (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 text-right">Total CRC: ₡{money(sumaCRC)}</p>
                        {diffAbs > 0.5 && (
                          <p className={`text-xs font-semibold text-right ${diff > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                            {diff > 0
                              ? `Faltan ₡${money(diffAbs)}`
                              : `Sobran ₡${money(diffAbs)}`}
                          </p>
                        )}
                      </div>
                      );
                    })()}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setPagos([...pagos, { metodo: "efectivo", monto: "", recibido: "" }])}
                        className="flex-1 border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-50"
                      >
                        + Agregar método
                      </button>
                      <button
                        onClick={() => {
                          const suma = totalPagosCRC(pagos);
                          if (Math.abs(suma - total) > 0.5) {
                            const diff = total - suma;
                            const ultimo = pagos.length - 1;
                            const nuevos = [...pagos];
                            const ultimoMetodo = nuevos[ultimo].metodo;
                            const enUSD = ultimoMetodo === "efectivo_dolares" && tipoCambio;
                            if (enUSD && Math.abs(diff) < tipoCambio) return;
                            const montoActual = parseFloat(nuevos[ultimo].monto) || 0;
                            if (enUSD) {
                              const ajuste = Math.round(diff / tipoCambio);
                              nuevos[ultimo] = { ...nuevos[ultimo], monto: Math.max(0, Math.round(montoActual + ajuste)).toFixed(0) };
                            } else {
                              nuevos[ultimo] = { ...nuevos[ultimo], monto: Math.max(0, parseFloat((montoActual + diff).toFixed(2))).toFixed(2) };
                            }
                            setPagos(nuevos);
                          }
                        }}
                        className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Balancear
                      </button>
                    </div>
                    <button
                      onClick={registrarVenta}
                      disabled={!items.length}
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-300"
                    >
                      Cobrar ₡{money(total)}
                    </button>
                  </div>
                )}

                {!splitPago && (
                  <button
                    onClick={() => {
                      setPagos([{ metodo: "efectivo", monto: total.toFixed(2), recibido: "" }]);
                      setSplitPago(true);
                    }}
                    className="w-full mt-2 py-2 border-2 border-dashed border-blue-400 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 hover:border-blue-500"
                  >
                    + Dividir pago
                  </button>
                )}
                {splitPago && (
                  <button
                    onClick={() => setSplitPago(false)}
                    className="w-full mt-2 py-2 border border-gray-300 text-gray-500 rounded-xl text-sm hover:bg-gray-50"
                  >
                    ← Pago único
                  </button>
                )}
              </div>
          </div>

          {ventaCompletada && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">Venta #{ventaCompletada.id} completada</h3>
              <p className="text-sm text-green-700 mb-3">Total: {ventaCompletada.moneda === "USD" ? "$" : "₡"}{money(ventaCompletada.total)}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Enviar recibo por correo</p>
                  <div className="flex gap-2">
                    <input
                      type="email" placeholder="correo@ejemplo.com"
                      value={emailDestino}
                      onChange={(e) => setEmailDestino(e.target.value)}
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                    <button onClick={enviarRecibo} disabled={enviando || !emailDestino.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300">
                      {enviando ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                  {mensajeEnvio && <p className={`text-sm mt-1 ${mensajeEnvio.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{mensajeEnvio}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirWhatsApp(clienteBusqueda ? "" : "", `Hola, gracias por su compra en ${window.location.hostname}. Total: ${ventaCompletada.moneda === "USD" ? "$" : "₡"}${money(ventaCompletada.total)} - Venta #${ventaCompletada.id}`)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300"
                  >
                    Enviar recibo por WhatsApp
                  </button>
                  <button onClick={() => setVentaCompletada(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300">
                    Nueva venta
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-end gap-2 mb-3">
            <select id="formato-ventas" className="px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value="ods">Calc (.ods)</option>
              <option value="xlsx">Excel (.xlsx)</option>
            </select>
            <button
              onClick={() => {
                const fmt = document.getElementById("formato-ventas").value;
                const a = document.createElement("a");
                a.href = `/api/ventas/exportar-excel?formato=${fmt}`;
                a.download = `ventas.${fmt}`;
                a.click();
              }}
              className="bg-green-600 text-white px-4 py-1.5 rounded-xl hover:bg-green-700 text-sm font-semibold"
            >
              Descargar
            </button>
          </div>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr><th className="p-3">#</th><th className="p-3">Fecha</th><th className="p-3">Usuario</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Pago</th><th className="p-3">Estado</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono">{v.id}</td>
                    <td className="p-3">{new Date(v.fecha).toLocaleString()}</td>
                    <td className="p-3">{v.usuario?.nombre || "-"}</td>
                    <td className="p-3">{v.items?.length || 0}</td>
                    <td className="p-3 font-medium">₡{money(v.total)}</td>
                    <td className="p-3">{etiquetaMetodoPago(v.metodo_pago)}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${v.estado === "completada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{v.estado}</span></td>
                    <td className="p-3">
                      <button onClick={() => api.post(`/ventas/${v.id}/imprimir`).catch(() => {})} className="text-gray-400 hover:text-blue-600 text-sm" title="Reimprimir ticket">🖨</button>
                    </td>
                  </tr>
                ))}
                {ventas.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-400">Sin ventas registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
