import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, daysAgo, formatCurrency } from "../../supabase";
import EmptyState from "../EmptyState";

interface TopProducto {
  nombre: string;
  categoria: string | null;
  cantidad: number;
  ingresos: number;
}

export default function ProductosTab() {
  const [desde, setDesde] = useState(daysAgo(6));
  const [hasta, setHasta] = useState(todayStr());
  const [limite, setLimite] = useState(10);
  const [data, setData] = useState<TopProducto[]>([]);
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
        .select("producto_id, cantidad, precio_unitario, es_cortesia, padre_id")
        .in("orden_id", ordenIds);

      const count: Record<number, { cant: number; ing: number }> = {};
      for (const d of detalles || []) {
        if (d.padre_id !== null || d.es_cortesia) continue;
        if (!count[d.producto_id]) count[d.producto_id] = { cant: 0, ing: 0 };
        count[d.producto_id].cant += d.cantidad || 1;
        count[d.producto_id].ing += (d.precio_unitario || 0) * (d.cantidad || 1);
      }

      const ids = Object.keys(count).map(Number);
      if (ids.length === 0) { setData([]); return; }

      const { data: prods } = await supabase
        .from("productos")
        .select("id, nombre, categoria_id")
        .in("id", ids);

      const { data: cats } = await supabase
        .from("categorias")
        .select("id, nombre")
        .in("id", [...new Set((prods || []).map((p) => p.categoria_id).filter(Boolean))]);

      const catMap = new Map((cats || []).map((c) => [c.id, c.nombre]));
      const prodMap = new Map((prods || []).map((p) => [p.id, { nombre: p.nombre, cat: catMap.get(p.categoria_id) || null }]));

      const sorted = Object.entries(count)
        .map(([id, v]) => ({
          nombre: prodMap.get(Number(id))?.nombre || `#${id}`,
          categoria: prodMap.get(Number(id))?.cat || null,
          cantidad: v.cant,
          ingresos: v.ing,
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, limite);

      setData(sorted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [desde, hasta, limite]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxCant = Math.max(...data.map((p) => p.cantidad), 1);
  const maxIng = Math.max(...data.map((p) => p.ingresos), 1);

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
        <div>
          <label className="text-xs text-gray-500 block mb-1">Mostrar</label>
          <select value={limite} onChange={(e) => setLimite(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white">
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
        <button onClick={loadData} disabled={loading}
          className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm mt-4">
          {loading ? "..." : "Actualizar"}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 animate-pulse">Cargando...</p>
      ) : data.length === 0 ? (
        <EmptyState message="Sin ventas en el período" />
      ) : (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="pb-3">#</th>
                <th className="pb-3">Producto</th>
                <th className="pb-3">Categoría</th>
                <th className="pb-3 text-right">Cantidad</th>
                <th className="pb-3 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i} className="border-b border-gray-800/50 text-sm">
                  <td className="py-3 text-gray-400">{i + 1}</td>
                  <td className="py-3">{p.nombre}</td>
                  <td className="py-3 text-gray-400">{p.categoria || "—"}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <span>{p.cantidad}</span>
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-foodpilot-500 rounded-full" style={{ width: `${(p.cantidad / maxCant) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-foodpilot-400">{formatCurrency(p.ingresos)}</span>
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(p.ingresos / maxIng) * 100}%` }} />
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
