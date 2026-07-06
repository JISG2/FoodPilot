import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, daysAgo, formatCurrency } from "../../supabase";
import EmptyState from "../EmptyState";

export default function CategoriasTab() {
  const [desde, setDesde] = useState(daysAgo(6));
  const [hasta, setHasta] = useState(todayStr());
  const [data, setData] = useState<{ nombre: string; total: number; porcentaje: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordenes } = await supabase
        .from("ordenes")
        .select("id")
        .eq("eliminado", 0)
        .gte("fecha_hora", `${desde} 00:00:00`)
        .lte("fecha_hora", `${hasta} 23:59:59`)
        .eq("estado", "PAGADO");

      const ordenIds = (ordenes || []).map((o) => o.id);
      if (ordenIds.length === 0) { setData([]); return; }

      const { data: detalles } = await supabase
        .from("orden_detalles")
        .select("producto_id, cantidad, precio_unitario, padre_id, es_cortesia")
        .in("orden_id", ordenIds);

      const prodIngresos: Record<number, number> = {};
      for (const d of detalles || []) {
        if (d.padre_id !== null || d.es_cortesia) continue;
        prodIngresos[d.producto_id] = (prodIngresos[d.producto_id] || 0) + (d.precio_unitario || 0) * (d.cantidad || 1);
      }

      const ids = Object.keys(prodIngresos).map(Number);
      if (ids.length === 0) { setData([]); return; }

      const { data: prods } = await supabase
        .from("productos")
        .select("id, categoria_id")
        .in("id", ids);

      const { data: cats } = await supabase
        .from("categorias")
        .select("id, nombre");

      const catMap = new Map((cats || []).map((c) => [c.id, c.nombre]));
      const prodCat = new Map((prods || []).map((p) => [p.id, p.categoria_id]));

      const catTotales: Record<string, number> = {};
      for (const [prodId, total] of Object.entries(prodIngresos)) {
        const catId = prodCat.get(Number(prodId));
        const catName = catMap.get(catId) || "Sin categoría";
        catTotales[catName] = (catTotales[catName] || 0) + total;
      }

      const granTotal = Object.values(catTotales).reduce((s, v) => s + v, 0);
      const sorted = Object.entries(catTotales)
        .map(([nombre, total]) => ({ nombre, total, porcentaje: granTotal > 0 ? (total / granTotal) * 100 : 0 }))
        .sort((a, b) => b.total - a.total);

      setData(sorted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [desde, hasta]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxTotal = Math.max(...data.map((c) => c.total), 1);

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
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <div className="space-y-4">
            {data.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.nombre}</span>
                  <span className="text-gray-300">{formatCurrency(c.total)} ({c.porcentaje.toFixed(1)}%)</span>
                </div>
                <div className="h-8 bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-500 flex items-center px-3 text-xs text-white font-medium"
                    style={{ width: `${(c.total / maxTotal) * 100}%`, minWidth: c.porcentaje > 5 ? undefined : 0 }}
                  >
                    {c.porcentaje > 8 ? `${c.porcentaje.toFixed(0)}%` : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
