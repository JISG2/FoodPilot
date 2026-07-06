import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, formatCurrency } from "../../supabase";
import KpiCard from "../KpiCard";

export default function HorarioTab() {
  const [fecha, setFecha] = useState(todayStr());
  const [data, setData] = useState<{ hora: string; num_ordenes: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordenes } = await supabase
        .from("ordenes")
        .select("fecha_hora, total")
        .eq("eliminado", 0)
        .gte("fecha_hora", `${fecha} 00:00:00`)
        .lte("fecha_hora", `${fecha} 23:59:59`)
        .eq("estado", "PAGADO");

      const map: Record<string, { num: number; total: number }> = {};
      for (const o of ordenes || []) {
        const h = o.fecha_hora.slice(11, 13);
        if (!map[h]) map[h] = { num: 0, total: 0 };
        map[h].num += 1;
        map[h].total += o.total || 0;
      }

      const hours: { hora: string; num_ordenes: number; total: number }[] = [];
      for (let i = 0; i < 24; i++) {
        const h = String(i).padStart(2, "0");
        hours.push({ hora: h, num_ordenes: map[h]?.num || 0, total: map[h]?.total || 0 });
      }
      setData(hours);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [fecha]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxTotal = Math.max(...data.map((h) => h.total), 1);
  const maxOrdenes = Math.max(...data.map((h) => h.num_ordenes), 1);
  const picoVentas = data.reduce((best, h) => h.total > (best?.total || 0) ? h : best, data[0]);
  const picoOrdenes = data.reduce((best, h) => h.num_ordenes > (best?.num_ordenes || 0) ? h : best, data[0]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white" />
        <button onClick={loadData} disabled={loading}
          className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm">
          {loading ? "..." : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiCard title="Hora Pico (Ventas)" value={`${picoVentas?.hora || "—"}:00`} icon="💰" color="text-foodpilot-400"
          subtitle={picoVentas ? formatCurrency(picoVentas.total) : ""} />
        <KpiCard title="Hora Pico (Órdenes)" value={`${picoOrdenes?.hora || "—"}:00`} icon="📋" color="text-blue-400"
          subtitle={picoOrdenes ? `${picoOrdenes.num_ordenes} órdenes` : ""} />
      </div>

      {loading ? (
        <p className="text-gray-400 animate-pulse">Cargando...</p>
      ) : (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-6">🕐 Distribución Horaria</h2>
          <div className="space-y-1.5">
            {data.map((h) => (
              <div key={h.hora} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-gray-500 text-right">{h.hora}</span>
                <div className="flex-1 h-6 bg-gray-800 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                    style={{ width: `${(h.total / maxTotal) * 100}%` }}
                  />
                  {h.total > 0 && h.total / maxTotal > 0.15 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                      {formatCurrency(h.total)}
                    </span>
                  )}
                </div>
                <span className="w-8 text-gray-500 text-xs">{h.num_ordenes > 0 ? h.num_ordenes : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
