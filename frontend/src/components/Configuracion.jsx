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
  const [impresorasDetectadas, setImpresorasDetectadas] = useState([]);
  const [msgImpresora, setMsgImpresora] = useState("");
  const [backupList, setBackupList] = useState([]);
  const [backupCfg, setBackupCfg] = useState({ intervalo_horas: 4, max_copias: 30 });
  const [msgBackup, setMsgBackup] = useState("");

  const usuario = store.getUsuario();

  useEffect(() => {
    api.get("/config").then((c) => { setConfig(c); setEditConfig(c); });
    api.get("/usuarios").then(setUsuarios);
    api.get("/categorias").then(setCategorias);
    api.get("/backup/listar").then(setBackupList);
    api.get("/backup/config").then(setBackupCfg);
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

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Correo electrónico (SMTP)</h3>
          <p className="text-sm text-gray-500 mb-4">Configuración para enviar recibos por email</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Servidor SMTP</label>
              <input value={editConfig.smtp_host || ""} onChange={(e) => setEditConfig({ ...editConfig, smtp_host: e.target.value })} onBlur={() => guardarConfig("smtp_host", editConfig.smtp_host)} placeholder="smtp.gmail.com" className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Puerto</label>
              <input value={editConfig.smtp_port || "587"} onChange={(e) => setEditConfig({ ...editConfig, smtp_port: e.target.value })} onBlur={() => guardarConfig("smtp_port", editConfig.smtp_port)} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Usuario</label>
              <input value={editConfig.smtp_user || ""} onChange={(e) => setEditConfig({ ...editConfig, smtp_user: e.target.value })} onBlur={() => guardarConfig("smtp_user", editConfig.smtp_user)} placeholder="tu@correo.com" className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Contraseña</label>
              <input type="password" value={editConfig.smtp_password || ""} onChange={(e) => setEditConfig({ ...editConfig, smtp_password: e.target.value })} onBlur={() => guardarConfig("smtp_password", editConfig.smtp_password)} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Correo remitente</label>
              <input value={editConfig.smtp_from || ""} onChange={(e) => setEditConfig({ ...editConfig, smtp_from: e.target.value })} onBlur={() => guardarConfig("smtp_from", editConfig.smtp_from)} placeholder="ventas@tutienda.com" className="w-full p-2 border rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Cierre de caja</h3>
          <p className="text-sm text-gray-500 mb-4">Correo al que se envía el resumen del cierre al final del día</p>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Correo del cierre</label>
            <input value={editConfig.correo_cierre || ""} onChange={(e) => setEditConfig({ ...editConfig, correo_cierre: e.target.value })} onBlur={() => guardarConfig("correo_cierre", editConfig.correo_cierre)} placeholder="contador@ejemplo.com" className="w-full p-2 border rounded-lg" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Impresora de factura</h3>
          <p className="text-sm text-gray-500 mb-4">Configuración para imprimir tickets en impresora térmica USB (ESC/POS)</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Vendor ID (VID)</label>
              <div className="flex gap-2">
                <input value={editConfig.printer_vendor_id || ""} onChange={(e) => setEditConfig({ ...editConfig, printer_vendor_id: e.target.value })} onBlur={() => guardarConfig("printer_vendor_id", editConfig.printer_vendor_id)} placeholder="ej. 0416" className="flex-1 p-2 border rounded-lg font-mono" />
                <button
                  onClick={async () => {
                    const lista = await api.get("/config/detectar-impresoras");
                    setImpresorasDetectadas(lista || []);
                  }}
                  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Detectar
                </button>
              </div>
              {impresorasDetectadas.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                  {impresorasDetectadas.map((d, i) => (
                    <button key={i} onClick={() => { setEditConfig({ ...editConfig, printer_vendor_id: d.vid, printer_product_id: d.pid }); guardarConfig("printer_vendor_id", d.vid); guardarConfig("printer_product_id", d.pid); setImpresorasDetectadas([]); }} className="w-full text-left p-2 text-sm hover:bg-blue-50 border-b flex justify-between">
                      <span className="font-mono">{d.vid}:{d.pid}</span>
                      <span className="text-gray-500 truncate ml-2">{d.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Product ID (PID)</label>
              <input value={editConfig.printer_product_id || ""} onChange={(e) => setEditConfig({ ...editConfig, printer_product_id: e.target.value })} onBlur={() => guardarConfig("printer_product_id", editConfig.printer_product_id)} placeholder="ej. 5011" className="w-full p-2 border rounded-lg font-mono" />
            </div>
            <button
              onClick={async () => {
                setMsgImpresora("");
                const res = await api.post("/config/imprimir-prueba");
                setMsgImpresora(res.error || "Ticket de prueba enviado ✓");
              }}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Probar impresión
            </button>
              {msgImpresora && (
                <p className={"text-sm " + (msgImpresora.includes("✓") ? "text-green-600" : "text-red-600")}>{msgImpresora}</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-semibold mb-4">Respaldos</h3>
            <p className="text-sm text-gray-500 mb-4">La base de datos se respalda automáticamente cada cierto tiempo. Podés descargar o restaurar respaldos anteriores.</p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500">Respaldar cada (horas)</label>
                <input type="number" min="1" value={backupCfg.intervalo_horas}
                  onChange={(e) => setBackupCfg({ ...backupCfg, intervalo_horas: parseInt(e.target.value) || 4 })}
                  onBlur={() => api.put("/backup/config", backupCfg)}
                  className="w-20 p-1.5 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Máx. copias</label>
                <input type="number" min="1" max="200" value={backupCfg.max_copias}
                  onChange={(e) => setBackupCfg({ ...backupCfg, max_copias: parseInt(e.target.value) || 30 })}
                  onBlur={() => api.put("/backup/config", backupCfg)}
                  className="w-20 p-1.5 border rounded text-sm"
                />
              </div>
              <button
                onClick={async () => {
                  setMsgBackup("");
                  const r = await api.post("/backup/crear");
                  setMsgBackup(r.error ? "Error: " + r.error : "Respaldo creado ✓ (" + (r.archivo || "") + ")");
                  api.get("/backup/listar").then(setBackupList);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 self-end"
              >
                Crear respaldo ahora
              </button>
            </div>
            {msgBackup && (
              <p className={"text-sm mb-3 " + (msgBackup.includes("✓") ? "text-green-600" : "text-red-600")}>{msgBackup}</p>
            )}

            {backupList.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-2 pb-1 border-b">
                  <span className="col-span-4">Archivo</span>
                  <span className="col-span-3">Fecha</span>
                  <span className="col-span-2">Tamaño</span>
                  <span className="col-span-3"></span>
                </div>
                {backupList.map((b) => (
                  <div key={b.archivo} className="grid grid-cols-12 gap-2 items-center text-sm px-2 py-1.5 hover:bg-gray-50 rounded">
                    <span className="col-span-4 truncate font-mono text-xs">{b.archivo}</span>
                    <span className="col-span-3 text-xs text-gray-500">{new Date(b.fecha).toLocaleString()}</span>
                    <span className="col-span-2 text-xs text-gray-500">{(b.tamano / 1024).toFixed(0)} KB</span>
                    <span className="col-span-3 flex gap-2">
                      <a href={"/api/backup/descargar/" + b.archivo} download className="text-blue-600 hover:underline text-xs">Descargar</a>
                      <button
                        onClick={async () => {
                          if (!confirm("¿Restaurar este respaldo? Se perderán los datos actuales.")) return;
                          const r = await api.post("/backup/restaurar/" + b.archivo);
                          alert(r.ok ? "Base restaurada ✓ - reinicie el servidor" : "Error: " + (r.error || ""));
                        }}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Restaurar
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sin respaldos aún</p>
            )}
        </div>
      </div>
    </div>
  );
}
