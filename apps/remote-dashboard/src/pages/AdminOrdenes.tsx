import { useEffect, useState, useCallback } from "react";
import { supabase, formatCurrency } from "../supabase";
import { useAuth } from "../context/AuthContext";
import OrderDetailModal from "../components/OrderDetailModal";

interface Orden {
  id: number;
  folio: string;
  tipo: string;
  mesa: string | null;
  estado: string;
  total: number;
  fecha_hora: string;
  usuario_id: number;
  costo_envio: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  PAGADO: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  CANCELADO: "text-red-400 bg-red-400/10 border-red-400/30",
};

export default function AdminOrdenes() {
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState<number | null>(null);
  const [cancelModal, setCancelModal] = useState<{ id: number; folio: string; estado: string } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const loadOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("ordenes")
        .select("id, folio, tipo, mesa, estado, total, fecha_hora, usuario_id, costo_envio")
        .order("fecha_hora", { ascending: false })
        .limit(100);

      setOrdenes(data || []);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrdenes();
    const interval = setInterval(loadOrdenes, 30000);
    return () => clearInterval(interval);
  }, [loadOrdenes]);

  const handleCancel = async () => {
    if (!cancelModal || !motivo.trim()) return;
    setCancelando(true);
    try {
      const { error } = await supabase
        .from("acciones_pendientes")
        .insert({
          tipo: "CANCELAR_ORDEN",
          payload: {
            orden_id: cancelModal.id,
            usuario_id: user?.id || 1,
            motivo: motivo.trim(),
          },
          estado: "PENDIENTE",
        });

      if (error) throw error;

      setCancelModal(null);
      setMotivo("");

      setTimeout(loadOrdenes, 2000);
    } catch (err: any) {
      console.error("Error al crear acción de cancelación:", err);
      alert("Error al solicitar cancelación: " + err.message);
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Órdenes</h2>
        <button onClick={loadOrdenes} disabled={loading} className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50">
          {loading ? "Cargando..." : "🔄 Actualizar"}
        </button>
      </div>

      {loading && ordenes.length === 0 ? (
        <p className="text-gray-500 text-center py-8 animate-pulse">Cargando órdenes...</p>
      ) : ordenes.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-500 text-lg">Sin órdenes</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {ordenes.map((o) => (
            <div
              key={o.id}
              onClick={() => setDetailModal(o.id)}
              className={`rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors ${
                o.estado === "CANCELADO"
                  ? "bg-gray-900/30 border border-gray-800/40 opacity-60"
                  : "bg-gray-900/80 border border-gray-800"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-mono text-foodpilot-400 flex-shrink-0">{o.folio}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${STATUS_COLORS[o.estado] || "text-gray-400"}`}>
                  {o.estado}
                </span>
                <span className="text-sm text-gray-400 flex-shrink-0">
                  {o.tipo}{o.mesa ? ` - Mesa ${o.mesa}` : ""}
                </span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(o.fecha_hora).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-foodpilot-400 font-medium">{formatCurrency(o.total)}</span>
                {o.estado !== "CANCELADO" && (
                  <button
                    onClick={() => setCancelModal({ id: o.id, folio: o.folio, estado: o.estado })}
                    className="bg-red-900/50 hover:bg-red-800/60 text-red-400 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {detailModal && <OrderDetailModal ordenId={detailModal} onClose={() => setDetailModal(null)} />}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Cancelar Orden</h3>
            <p className="text-gray-400 text-sm mb-4">
              ¿Estás seguro de cancelar la orden <strong className="text-white">{cancelModal.folio}</strong>?
            </p>
            {cancelModal.estado === "PAGADO" && (
              <p className="text-yellow-400 text-xs mb-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2">
                ⚠️ Esta orden ya fue pagada. Se generará una reversa contable (ANULACIÓN).
              </p>
            )}
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo de cancelación (obligatorio)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setCancelModal(null); setMotivo(""); }}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                disabled={cancelando}
              >
                Cancelar
              </button>
              <button
                onClick={handleCancel}
                disabled={!motivo.trim() || cancelando}
                className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
              >
                {cancelando ? "Enviando..." : "Sí, cancelar orden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
