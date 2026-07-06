import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, daysAgo, formatCurrency } from "../../supabase";
import EmptyState from "../EmptyState";

export default function MeserosTab() {
  const [desde, setDesde] = useState(daysAgo(6));
  const [hasta, setHasta] = useState(todayStr());
  const [data, setData] = useState<{ nombre: string; num_ordenes: number; total_ventas: number; ticket_promedio: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordenes } = await supabase
        .from("ordenes")
        .select("id, usuario_id, total")
        .eq("eliminado", 0)
        .gte("fecha_hora", `${desde} 00:00:00`)
        .lte("fecha_hora", `${hasta} 23:59:59`)
        .eq("estado", "PAGADO");

      const userCount: Record<number, { num: number; total: number }> = {};
      for (const o of ordenes || []) {
        if (!userCount[o.usuario_id]) userCount[o.usuario_id] = { num: 0, total: 0 };
        userCount[o.usuario_id].num += 1;
        userCount[o.usuario_id].total += o.total || 0;
      }

      const userIds = Object.keys(userCount).map(Number);
      if (userIds.length === 0) { setData([]); return; }

      const { data: users } = await supabase
        .from("usuarios")
        .select("id, nombre")
        .in("id", userIds);

      const userMap = new Map((users || []).map((u) => [u.id, u.nombre]));

      const sorted = Object.entries(userCount)
        .map(([id, v]) => ({
          nombre: userMap.get(Number(id)) || `#${id}`,
          num_ordenes: v.num,
          total_ventas: v.total,
          ticket_promedio: v.num > 0 ? v.total / v.num : 0,
        }))
        .sort((a, b) => b.total_ventas - a.total_ventas);

      setData(sorted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [desde, hasta]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxVentas = Math.max(...data.map((m) => m.total_ventas), 1);

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

      {loading ? (
        <p className="text-gray-400 animate-pulse">Cargando...</p>
      ) : data.length === 0 ? (
        <EmptyState message="Sin datos en el período" />
      ) : (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="pb-3">Mesero</th>
                <th className="pb-3 text-right">Órdenes</th>
                <th className="pb-3 text-right">Ticket Prom.</th>
                <th className="pb-3 text-right">Total Ventas</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={i} className="border-b border-gray-800/50 text-sm">
                  <td className="py-3 font-medium">{m.nombre}</td>
                  <td className="py-3 text-right">{m.num_ordenes}</td>
                  <td className="py-3 text-right text-yellow-400">{formatCurrency(m.ticket_promedio)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-foodpilot-400">{formatCurrency(m.total_ventas)}</span>
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-foodpilot-500 rounded-full" style={{ width: `${(m.total_ventas / maxVentas) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
