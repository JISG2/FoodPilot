import { useEffect, useState, useCallback } from "react";
import { supabase, todayStr, formatCurrency } from "../supabase";
import KpiCard from "../components/KpiCard";
import BarRow from "../components/BarRow";

interface DashboardData {
  totalVentas: number;
  numOrdenes: number;
  ticketPromedio: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
  cortesiaTotal: number;
  staffMeals: number;
  ordenesPorEstado: Record<string, number>;
  topProductos: { nombre: string; total: number; cantidad: number }[];
  ultimaSync: string;
}

const INITIAL: DashboardData = {
  totalVentas: 0,
  numOrdenes: 0,
  ticketPromedio: 0,
  ventasEfectivo: 0,
  ventasTarjeta: 0,
  ventasTransferencia: 0,
  cortesiaTotal: 0,
  staffMeals: 0,
  ordenesPorEstado: {},
  topProductos: [],
  ultimaSync: "",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(todayStr());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = `${fecha} 00:00:00`;
      const end = `${fecha} 23:59:59`;

      const { data: ordenesData } = await supabase
        .from("ordenes")
        .select("id, total, estado, es_cortesia, es_consumo_staff, fecha_hora")
        .eq("eliminado", 0)
        .gte("fecha_hora", start)
        .lte("fecha_hora", end)
        .order("fecha_hora", { ascending: false });

      const ordenesPagadas = (ordenesData || []).filter((o) => o.estado === "PAGADO");
      const ordenIds = ordenesPagadas.map((o) => o.id);

      let topProductos: { nombre: string; total: number; cantidad: number }[] = [];
      let cortesiaTotal = 0;
      let staffMeals = 0;
      let ventasEfectivo = 0;
      let ventasTarjeta = 0;
      let ventasTransferencia = 0;
      let totalVentas = 0;

      if (ordenIds.length > 0) {
        const { data: detalles } = await supabase
          .from("orden_detalles")
          .select("producto_id, cantidad, precio_unitario, es_cortesia, padre_id")
          .in("orden_id", ordenIds);

        const staffOrdenIds = ordenesPagadas
          .filter((o) => o.es_consumo_staff)
          .map((o) => o.id);

        if (staffOrdenIds.length > 0) {
          const { data: staffDetalles } = await supabase
            .from("orden_detalles")
            .select("precio_unitario, cantidad")
            .in("orden_id", staffOrdenIds)
            .is("padre_id", null);

          for (const d of staffDetalles || []) {
            staffMeals += (d.precio_unitario || 0) * (d.cantidad || 1);
          }
        }

        const productCount: Record<number, { cantidad: number; ingreso: number }> = {};
        for (const d of detalles || []) {
          if (d.padre_id !== null) continue;
          if (d.es_cortesia) {
            cortesiaTotal += (d.precio_unitario || 0) * (d.cantidad || 1);
          }
          if (!productCount[d.producto_id]) {
            productCount[d.producto_id] = { cantidad: 0, ingreso: 0 };
          }
          productCount[d.producto_id].cantidad += d.cantidad || 1;
          if (!d.es_cortesia) {
            productCount[d.producto_id].ingreso += (d.precio_unitario || 0) * (d.cantidad || 1);
          }
        }

        const productIds = Object.keys(productCount).map(Number);
        if (productIds.length > 0) {
          const { data: productos } = await supabase
            .from("productos")
            .select("id, nombre")
            .in("id", productIds);

          const prodMap = new Map((productos || []).map((p) => [p.id, p.nombre]));
          topProductos = Object.entries(productCount)
            .map(([id, v]) => ({
              nombre: prodMap.get(Number(id)) || `#${id}`,
              total: v.ingreso,
              cantidad: v.cantidad,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
        }
      }

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

      const ordenesPorEstado: Record<string, number> = {};
      for (const o of ordenesData || []) {
        ordenesPorEstado[o.estado] = (ordenesPorEstado[o.estado] || 0) + 1;
      }

      const numOrdenes = ordenesPagadas.length;
      setData({
        totalVentas,
        numOrdenes,
        ticketPromedio: numOrdenes > 0 ? totalVentas / numOrdenes : 0,
        ventasEfectivo,
        ventasTarjeta,
        ventasTransferencia,
        cortesiaTotal,
        staffMeals,
        ordenesPorEstado,
        topProductos,
        ultimaSync: new Date().toLocaleString("es-MX"),
      });
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div>
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">📊 Dashboard</h1>
          <p className="text-gray-400 text-sm">Resumen del día</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white"
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </header>

      {loading && data.totalVentas === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 animate-pulse text-xl">Cargando datos...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard title="Ventas del Día" value={formatCurrency(data.totalVentas)} icon="💰" color="text-foodpilot-400" />
            <KpiCard title="Órdenes" value={String(data.numOrdenes)} icon="📋" color="text-blue-400" />
            <KpiCard title="Ticket Promedio" value={formatCurrency(data.ticketPromedio)} icon="🎯" color="text-yellow-400" />
            <KpiCard
              title="Cortesía + Staff"
              value={formatCurrency(data.cortesiaTotal + data.staffMeals)}
              icon="🎁"
              color="text-purple-400"
              subtitle={`Cortesía: ${formatCurrency(data.cortesiaTotal)} · Staff: ${formatCurrency(data.staffMeals)}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">💳 Métodos de Pago</h2>
              <div className="space-y-3">
                <BarRow label="Efectivo" value={data.ventasEfectivo} total={data.totalVentas} color="bg-green-500" />
                <BarRow label="Tarjeta" value={data.ventasTarjeta} total={data.totalVentas} color="bg-blue-500" />
                <BarRow label="Transferencia" value={data.ventasTransferencia} total={data.totalVentas} color="bg-yellow-500" />
              </div>
            </div>

            <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">📊 Estado de Órdenes</h2>
              <div className="space-y-3">
                {Object.entries(data.ordenesPorEstado).map(([estado, count]) => (
                  <BarRow
                    key={estado}
                    label={estado}
                    value={count}
                    total={Object.values(data.ordenesPorEstado).reduce((a, b) => a + b, 0)}
                    color={
                      estado === "PAGADO" ? "bg-blue-500" :
                      estado === "PENDIENTE" ? "bg-yellow-500" :
                      estado === "CANCELADO" ? "bg-red-500" : "bg-gray-500"
                    }
                    format={(n) => String(n)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">🏆 Productos Más Vendidos</h2>
            {data.topProductos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Sin ventas hoy</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-sm border-b border-gray-800">
                      <th className="pb-3">#</th>
                      <th className="pb-3">Producto</th>
                      <th className="pb-3 text-right">Cantidad</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProductos.map((p, i) => (
                      <tr key={i} className="border-b border-gray-800/50 text-sm">
                        <td className="py-3 text-gray-400">{i + 1}</td>
                        <td className="py-3">{p.nombre}</td>
                        <td className="py-3 text-right">{p.cantidad}</td>
                        <td className="py-3 text-right text-foodpilot-400 font-medium">{formatCurrency(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="text-center text-gray-500 text-xs">
            Última actualización: {data.ultimaSync}
          </div>
        </>
      )}
    </div>
  );
}
