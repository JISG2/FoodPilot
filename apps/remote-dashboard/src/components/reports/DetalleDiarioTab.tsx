import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, formatCurrency } from "../../supabase";
import KpiCard from "../KpiCard";
import EmptyState from "../EmptyState";
import OrderDetailModal from "../OrderDetailModal";

const TIPO_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  INGRESO_VENTA: { label: "Venta", icon: "💰", color: "text-foodpilot-400" },
  INGRESO_FONDO: { label: "Fondo Inicial", icon: "🏦", color: "text-blue-400" },
  EGRESO_GASTO: { label: "Gasto", icon: "📤", color: "text-red-400" },
  EGRESO_REPARTIDOR: { label: "Pago Repartidor", icon: "🛵", color: "text-orange-400" },
  EGRESO_RETIRO: { label: "Retiro", icon: "🏧", color: "text-yellow-400" },
  ANULACION_VENTA: { label: "Anulación Venta", icon: "↩️", color: "text-red-500" },
  CANCELACION_ORDEN: { label: "Cancelación", icon: "❌", color: "text-gray-400" },
};

const TIPO_ORDER = [
  "INGRESO_VENTA", "INGRESO_FONDO", "EGRESO_GASTO", "EGRESO_REPARTIDOR",
  "EGRESO_RETIRO", "ANULACION_VENTA", "CANCELACION_ORDEN",
];

interface TransRow {
  id: number;
  orden_id: number | null;
  usuario_nombre: string | null;
  monto: number;
  tipo: string;
  metodo_pago: string | null;
  referencia: string | null;
  concepto: string | null;
  fecha_hora: string;
}

export default function DetalleDiarioTab() {
  const [fecha, setFecha] = useState(todayStr());
  const [tipoFilter, setTipoFilter] = useState("TODOS");
  const [data, setData] = useState<TransRow[]>([]);
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalId, setModalId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = `${fecha} 00:00:00`;
      const end = `${fecha} 23:59:59`;

      const { data: trans } = await supabase
        .from("transacciones_caja")
        .select("*, usuarios!inner(nombre)")
        .gte("fecha_hora", start)
        .lte("fecha_hora", end)
        .order("fecha_hora", { ascending: true });

      const rows: TransRow[] = (trans || []).map((t: any) => ({
        id: t.id,
        orden_id: t.orden_id,
        usuario_nombre: (t.usuarios as any)?.nombre || null,
        monto: t.monto,
        tipo: t.tipo,
        metodo_pago: t.metodo_pago,
        referencia: t.referencia,
        concepto: t.concepto,
        fecha_hora: t.fecha_hora,
      }));

      setData(rows);

      const { data: staffOrds } = await supabase
        .from("ordenes")
        .select("id, folio, fecha_hora, total, usuarios!inner(nombre)")
        .eq("eliminado", 0)
        .gte("fecha_hora", start)
        .lte("fecha_hora", end)
        .eq("es_consumo_staff", 1)
        .eq("estado", "PAGADO");

      if (staffOrds && staffOrds.length > 0) {
        const staffIds = staffOrds.map((o: any) => o.id);
        const { data: staffDet } = await supabase
          .from("orden_detalles")
          .select("orden_id, producto_id, cantidad, precio_unitario, padre_id, productos!inner(nombre)")
          .in("orden_id", staffIds);

        const ordMap: Record<number, any> = {};
        for (const o of staffOrds as any[]) {
          ordMap[o.id] = { folio: o.folio, hora: o.fecha_hora, mesero: (o.usuarios as any)?.nombre || null, total: o.total };
        }

        const itemsByOrd: Record<number, any[]> = {};
        for (const d of staffDet || []) {
          if (d.padre_id) continue;
          if (!itemsByOrd[d.orden_id]) itemsByOrd[d.orden_id] = [];
          itemsByOrd[d.orden_id].push({
            nombre: (d.productos as any)?.nombre || `#${d.producto_id}`,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: (d.precio_unitario || 0) * (d.cantidad || 1),
          });
        }

        const ordenes = Object.entries(itemsByOrd).map(([oid, items]) => ({
          ...ordMap[Number(oid)],
          items,
        }));

        setStaffData({
          num_ordenes: ordenes.length,
          total_valor: ordenes.reduce((s, o) => s + (o.total || 0), 0),
          ordenes,
        });
      } else {
        setStaffData(null);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [fecha]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = tipoFilter === "TODOS" ? data : data.filter((r) => r.tipo === tipoFilter);
  const grouped: Record<string, TransRow[]> = {};
  for (const r of filtered) {
    if (!grouped[r.tipo]) grouped[r.tipo] = [];
    grouped[r.tipo].push(r);
  }

  const ingresos = data.filter((r) => r.monto > 0).reduce((s, r) => s + r.monto, 0);
  const egresos = data.filter((r) => r.monto < 0).reduce((s, r) => s + r.monto, 0);
  const balance = ingresos + egresos;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white" />
        <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm">
          <option value="TODOS">Todas las transacciones</option>
          {TIPO_ORDER.map((t) => (
            <option key={t} value={t}>{TIPO_CONFIG[t]?.label || t}</option>
          ))}
        </select>
        <button onClick={loadData} disabled={loading}
          className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm">
          {loading ? "..." : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Transacciones" value={String(data.length)} icon="📋" color="text-blue-400" />
        <KpiCard title="Ingresos" value={formatCurrency(ingresos)} icon="💰" color="text-foodpilot-400" />
        <KpiCard title="Egresos" value={formatCurrency(Math.abs(egresos))} icon="📤" color="text-red-400" />
        <KpiCard title="Balance" value={formatCurrency(balance)} icon="⚖️" color={balance >= 0 ? "text-foodpilot-400" : "text-red-400"} />
      </div>

      {staffData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-amber-400 mb-2">👨‍🍳 Consumo Staff</h2>
          <p className="text-sm text-amber-300/70 mb-4">
            {staffData.num_ordenes} órdenes · Valor total: {formatCurrency(staffData.total_valor)}
          </p>
          <div className="space-y-3">
            {staffData.ordenes.map((ord: any) => (
              <div key={ord.folio} className="bg-gray-900/50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{ord.folio}</span>
                  <span className="text-gray-400">{new Date(ord.hora).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Mesero: {ord.mesero || "—"}</p>
                <div className="space-y-1">
                  {ord.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-gray-400">
                      <span>{item.cantidad}x {item.nombre}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-medium text-amber-400 mt-2 pt-2 border-t border-amber-500/20">
                  <span>Total</span>
                  <span>{formatCurrency(ord.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 animate-pulse">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState message="No hay transacciones para esta fecha" />
      ) : (
        <div className="space-y-6">
          {TIPO_ORDER.filter((t) => grouped[t]?.length).map((tipo) => {
            const rows = grouped[tipo];
            const total = rows.reduce((s, r) => s + r.monto, 0);
            const cfg = TIPO_CONFIG[tipo] || { label: tipo, icon: "📄", color: "text-gray-400" };

            return (
              <div key={tipo} className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                    <span className="text-gray-500 text-sm ml-2">({rows.length})</span>
                  </h3>
                  <span className={`font-medium ${cfg.color}`}>{formatCurrency(total)}</span>
                </div>
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-sm bg-gray-800/30 rounded-lg px-4 py-2.5 hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => r.orden_id && setModalId(r.orden_id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-gray-500 text-xs w-16 shrink-0">
                          {r.fecha_hora.slice(11, 16)}
                        </span>
                        <span className="text-gray-400 text-xs truncate">{r.concepto || r.usuario_nombre || "—"}</span>
                        {r.metodo_pago && (
                          <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">{r.metodo_pago}</span>
                        )}
                        {r.referencia && (
                          <span className="text-xs text-gray-600">Ref: {r.referencia}</span>
                        )}
                      </div>
                      <span className={`font-medium shrink-0 ${r.monto >= 0 ? "text-foodpilot-400" : "text-red-400"}`}>
                        {r.monto >= 0 ? "+" : ""}{formatCurrency(r.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalId && <OrderDetailModal ordenId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
