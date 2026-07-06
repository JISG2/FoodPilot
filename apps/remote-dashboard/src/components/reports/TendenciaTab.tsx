import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, daysAgo, formatCurrency } from "../../supabase";
import KpiCard from "../KpiCard";
import EmptyState from "../EmptyState";

export default function TendenciaTab() {
  const [desde, setDesde] = useState(daysAgo(6));
  const [hasta, setHasta] = useState(todayStr());
  const [data, setData] = useState<{ fecha: string; total: number; num_ordenes: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordenes } = await supabase
        .from("ordenes")
        .select("fecha_hora, total")
        .eq("eliminado", 0)
        .gte("fecha_hora", `${desde} 00:00:00`)
        .lte("fecha_hora", `${hasta} 23:59:59`)
        .eq("estado", "PAGADO");

      const map: Record<string, { total: number; num_ordenes: number }> = {};
      for (const o of ordenes || []) {
        const d = o.fecha_hora.slice(0, 10);
        if (!map[d]) map[d] = { total: 0, num_ordenes: 0 };
        map[d].total += o.total || 0;
        map[d].num_ordenes += 1;
      }

      const days: { fecha: string; total: number; num_ordenes: number }[] = [];
      const start = new Date(desde);
      const end = new Date(hasta);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        days.push({ fecha: key, total: map[key]?.total || 0, num_ordenes: map[key]?.num_ordenes || 0 });
      }
      setData(days);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [desde, hasta]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const totalPeriodo = data.reduce((s, d) => s + d.total, 0);
  const totalOrdenes = data.reduce((s, d) => s + d.num_ordenes, 0);
  const promedio = data.filter((d) => d.total > 0).length > 0
    ? totalPeriodo / data.filter((d) => d.total > 0).length : 0;
  const mejorDia = data.reduce((best, d) => d.total > (best?.total || 0) ? d : best, data[0]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white" />
        </div>
        <button onClick={loadData} disabled={loading}
          className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm mt-4">
          {loading ? "..." : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Período" value={formatCurrency(totalPeriodo)} icon="💰" color="text-foodpilot-400" />
        <KpiCard title="Órdenes" value={String(totalOrdenes)} icon="📋" color="text-blue-400" />
        <KpiCard title="Promedio Diario" value={formatCurrency(promedio)} icon="📊" color="text-yellow-400" />
        <KpiCard title="Mejor Día" value={formatCurrency(mejorDia?.total || 0)} icon="🏆" color="text-purple-400"
          subtitle={mejorDia?.fecha || "—"} />
      </div>

      {loading ? (
        <p className="text-gray-400 animate-pulse">Cargando...</p>
      ) : data.length === 0 ? (
        <EmptyState message="Sin datos en el período" />
      ) : (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-6">📈 Ventas Diarias</h2>
          <div className="space-y-2">
            {data.map((d) => (
              <div key={d.fecha}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{new Date(d.fecha).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className="text-gray-300">{formatCurrency(d.total)} ({d.num_ordenes} ord.)</span>
                </div>
                <div className="h-6 bg-gray-800 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-foodpilot-600 to-foodpilot-400 transition-all duration-500"
                    style={{ width: `${(d.total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
