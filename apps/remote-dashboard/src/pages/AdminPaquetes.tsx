import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase";

interface Producto {
  id: number;
  nombre: string;
}

interface Etiqueta {
  id: number;
  nombre: string;
}

interface Regla {
  id: number;
  paquete_id: number;
  etiqueta_id: number;
  cantidad: number;
  orden_seleccion: number;
  obligatorio: number;
}

export default function AdminPaquetes() {
  const [paquetes, setPaquetes] = useState<Producto[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaquete, setSelectedPaquete] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<{
    id?: number;
    paquete_id: number;
    etiqueta_id: number;
    cantidad: number;
    orden_seleccion: number;
    obligatorio: number;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [paqRes, etqRes, regRes] = await Promise.all([
        supabase.from("productos").select("id, nombre").eq("es_paquete", 1).order("nombre"),
        supabase.from("etiquetas").select("*").order("nombre"),
        supabase.from("paquete_reglas").select("*").order("orden_seleccion"),
      ]);
      setPaquetes(paqRes.data || []);
      setEtiquetas(etqRes.data || []);
      setReglas(regRes.data || []);
    } catch (err) {
      console.error("Error cargando paquetes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reglasDelPaquete = reglas.filter((r) => r.paquete_id === selectedPaquete);
  const paqueteActual = paquetes.find((p) => p.id === selectedPaquete);

  const handleSaveRegla = async () => {
    if (!editModal) return;
    setGuardando(true);
    try {
      const payload = {
        paquete_id: editModal.paquete_id,
        etiqueta_id: editModal.etiqueta_id,
        cantidad: editModal.cantidad,
        orden_seleccion: editModal.orden_seleccion,
        obligatorio: editModal.obligatorio ? 1 : 0,
      };

      if (editModal.id) {
        const { error } = await supabase
          .from("paquete_reglas")
          .update(payload)
          .eq("id", editModal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("paquete_reglas")
          .insert(payload);
        if (error) throw error;
      }

      setEditModal(null);
      loadData();
    } catch (err: any) {
      alert("Error al guardar regla: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDeleteRegla = async (id: number) => {
    if (!confirm("¿Eliminar esta regla?")) return;
    try {
      await supabase.from("paquete_reglas").delete().eq("id", id);
      loadData();
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Reglas de Paquetes</h2>
        <button onClick={loadData} disabled={loading} className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50">
          🔄 Actualizar
        </button>
      </div>

      {loading && paquetes.length === 0 ? (
        <p className="text-gray-500 text-center py-8 animate-pulse">Cargando paquetes...</p>
      ) : paquetes.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-500">No hay paquetes creados</p>
          <p className="text-gray-600 text-sm mt-1">Crea productos con "Es paquete = Sí" desde la sección Productos</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Paquetes list */}
          <div className="w-64 flex-shrink-0 space-y-1">
            {paquetes.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPaquete(p.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                  selectedPaquete === p.id
                    ? "bg-foodpilot-700/50 text-foodpilot-300 border border-foodpilot-700/50"
                    : "bg-gray-900/50 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                📦 {p.nombre}
              </button>
            ))}
          </div>

          {/* Reglas */}
          <div className="flex-1">
            {!selectedPaquete ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
                <p className="text-gray-500">Selecciona un paquete para ver sus reglas</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{paqueteActual?.nombre}</h3>
                  <button
                    onClick={() => setEditModal({
                      paquete_id: selectedPaquete,
                      etiqueta_id: etiquetas[0]?.id || 0,
                      cantidad: 1,
                      orden_seleccion: reglasDelPaquete.length + 1,
                      obligatorio: 1,
                    })}
                    className="bg-foodpilot-700 hover:bg-foodpilot-600 px-3 py-1.5 rounded-lg text-xs transition-colors"
                    disabled={etiquetas.length === 0}
                  >
                    + Agregar regla
                  </button>
                </div>

                {reglasDelPaquete.length === 0 ? (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                    <p className="text-gray-500 text-sm">Sin reglas. Agrega una para definir el paso del wizard.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reglasDelPaquete.map((r) => {
                      const etq = etiquetas.find((e) => e.id === r.etiqueta_id);
                      return (
                        <div key={r.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-500 font-mono">#{r.orden_seleccion}</span>
                            <span className="text-sm font-medium">{etq?.nombre || "?"}</span>
                            <span className="text-xs text-gray-500">×{r.cantidad}</span>
                            {r.obligatorio ? (
                              <span className="text-xs text-yellow-500">Obligatorio</span>
                            ) : (
                              <span className="text-xs text-gray-600">Opcional</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditModal({
                                id: r.id,
                                paquete_id: r.paquete_id,
                                etiqueta_id: r.etiqueta_id,
                                cantidad: r.cantidad,
                                orden_seleccion: r.orden_seleccion,
                                obligatorio: r.obligatorio,
                              })}
                              className="text-gray-500 hover:text-white text-xs"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteRegla(r.id)}
                              className="text-gray-600 hover:text-red-400 text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit/Create Regla Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editModal.id ? "Editar Regla" : "Nueva Regla"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Etiqueta</label>
                <select
                  value={editModal.etiqueta_id}
                  onChange={(e) => setEditModal({ ...editModal, etiqueta_id: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                >
                  {etiquetas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Cantidad a elegir</label>
                <input
                  type="number"
                  min={1}
                  value={editModal.cantidad}
                  onChange={(e) => setEditModal({ ...editModal, cantidad: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Orden de selección</label>
                <input
                  type="number"
                  min={1}
                  value={editModal.orden_seleccion}
                  onChange={(e) => setEditModal({ ...editModal, orden_seleccion: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editModal.obligatorio}
                  onChange={(e) => setEditModal({ ...editModal, obligatorio: e.target.checked ? 1 : 0 })}
                  className="rounded"
                />
                Obligatorio
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRegla}
                disabled={!editModal.etiqueta_id || guardando}
                className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
