import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, formatCurrency } from "../../supabase";
import KpiCard from "../KpiCard";
import BarRow from "../BarRow";
import EmptyState from "../EmptyState";

export default function DashboardTab() {
  const [fecha, setFecha] = useState(todayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = `${fecha} 00:00:00`;
      const end = `${fecha} 23:59:59`;

      const { data: ordenesData } = await supabase
        .from("ordenes")
        .select("id, total, estado, tipo, es_cortesia, es_consumo_staff")
        .gte("fecha_hora", start)
        .lte("fecha_hora", end);

      const pagadas = (ordenesData || []).filter((o: any) => o.estado === "PAGADO");
      const canceladas = (ordenesData || []).filter((o: any) => o.estado === "CANCELADO");
      const ordenIds = pagadas.map((o: any) => o.id);

      let totalVentas = 0;
      let ventasEfectivo = 0;
      let ventasTarjeta = 0;
      let ventasTransferencia = 0;
      let cortesiaTotal = 0;
      let staffMeals = 0;

      const { data: transacciones } = await supabase
        .from("transacciones_caja")
        .select("monto, metodo_pago, tipo")
        .gte("fecha_hora", start)
        .lte("fecha_hora", end);

      for (const t of transacciones || []) {
        if (t.tipo === "INGRESO_VENTA") {
          totalVentas += t.monto;
          if (t.metodo_pago === "EFECTIVO") ventasEfectivo += t.monto;
          else if (t.metodo_pago === "TARJETA") ventasTarjeta += t.monto;
          else if (t.metodo_pago === "TRANSFERENCIA") ventasTransferencia += t.monto;
        }
        if (t.tipo === "ANULACION_VENTA") {
          totalVentas += t.monto;
          if (t.metodo_pago === "EFECTIVO") ventasEfectivo += t.monto;
          else if (t.metodo_pago === "TARJETA") ventasTarjeta += t.monto;
          else if (t.metodo_pago === "TRANSFERENCIA") ventasTransferencia += t.monto;
        }
      }

      if (ordenIds.length > 0) {
        const { data: detalles } = await supabase
          .from("orden_detalles")
          .select("precio_unitario, cantidad, es_cortesia, padre_id, orden_id")
          .in("orden_id", ordenIds);

        for (const d of detalles || []) {
          if (d.padre_id !== null) continue;
          if (d.es_cortesia) {
            cortesiaTotal += (d.precio_unitario || 0) * (d.cantidad || 1);
          }
        }

        const staffIds = pagadas.filter((o: any) => o.es_consumo_staff).map((o: any) => o.id);
        if (staffIds.length > 0) {
          const { data: sd } = await supabase
            .from("orden_detalles")
            .select("precio_unitario, cantidad")
            .in("orden_id", staffIds)
            .is("padre_id", null);
          for (const d of sd || []) {
            staffMeals += (d.precio_unitario || 0) * (d.cantidad || 1);
          }
        }
      }

      const ordenesPorTipo: Record<string, number> = { MESA: 0, PARA_LLEVAR: 0, DOMICILIO: 0 };
      for (const o of pagadas) {
        ordenesPorTipo[o.tipo] = (ordenesPorTipo[o.tipo] || 0) + 1;
      }

      setData({
        totalVentas, numOrdenes: pagadas.length,
        ticketPromedio: pagadas.length > 0 ? totalVentas / pagadas.length : 0,
        ventasEfectivo, ventasTarjeta, ventasTransferencia,
        cortesiaTotal, staffMeals,
        numCancelaciones: canceladas.length,
        montoCancelado: canceladas.reduce((s: number, o: any) => s + (o.total || 0), 0),
        ordenesPorTipo,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [fecha]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading && !data) return <p className="text-gray-400 animate-pulse">Cargando...</p>;
  if (!data) return <EmptyState message="No hay datos para esta fecha" />;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white" />
        <button onClick={loadData} disabled={loading}
          className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm">
          {loading ? "..." : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Ventas" value={formatCurrency(data.totalVentas)} icon="💰" color="text-foodpilot-400" />
        <KpiCard title="Órdenes Pagadas" value={String(data.numOrdenes)} icon="📋" color="text-blue-400" />
        <KpiCard title="Ticket Prom." value={formatCurrency(data.ticketPromedio)} icon="🎯" color="text-yellow-400" />
        <KpiCard title="Cancelaciones" value={String(data.numCancelaciones)} icon="❌" color="text-red-400"
          subtitle={`Monto: ${formatCurrency(data.montoCancelado)}`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <KpiCard title="Cortesía" value={formatCurrency(data.cortesiaTotal)} icon="🎁" color="text-purple-400" />
        <KpiCard title="Consumo Staff" value={formatCurrency(data.staffMeals)} icon="👨‍🍳" color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">💳 Métodos de Pago</h2>
          <div className="space-y-3">
            <BarRow label="Efectivo" value={data.ventasEfectivo} total={data.totalVentas} color="bg-green-500" />
            <BarRow label="Tarjeta" value={data.ventasTarjeta} total={data.totalVentas} color="bg-blue-500" />
            <BarRow label="Transferencia" value={data.ventasTransferencia} total={data.totalVentas} color="bg-yellow-500" />
          </div>
        </div>
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Órdenes por Tipo</h2>
          <div className="space-y-3">
            {Object.entries(data.ordenesPorTipo).map(([tipo, count]) => (
              <BarRow key={tipo} label={tipo} value={count as number}
                total={data.numOrdenes} color={
                  tipo === "MESA" ? "bg-foodpilot-500" :
                  tipo === "PARA_LLEVAR" ? "bg-amber-500" : "bg-purple-500"
                } format={(n) => String(n)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
