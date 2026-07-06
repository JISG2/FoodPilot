import { useEffect, useState } from "react";
import { supabase } from "../supabase";

interface OrderItem {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  es_cortesia: number;
  padre_id: number | null;
}

interface OrderData {
  folio: string;
  mesa: string | null;
  tipo: string;
  fecha_hora: string;
  total: number;
  subtotal: number;
  costo_envio: number;
  es_consumo_staff: number;
  mesero: string | null;
  items: OrderItem[];
}

export default function OrderDetailModal({
  ordenId,
  onClose,
}: {
  ordenId: number;
  onClose: () => void;
}) {
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: orden, error: errOrden } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", ordenId)
        .single();

      if (errOrden || !orden) {
        console.error("Error al cargar orden:", errOrden);
        setLoading(false);
        return;
      }

      let mesero: string | null = null;
      if (orden.usuario_id) {
        const { data: user } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("id", orden.usuario_id)
          .single();
        mesero = user?.nombre || null;
      }

      const { data: detalles } = await supabase
        .from("orden_detalles")
        .select("*")
        .eq("orden_id", ordenId);

      let items: OrderItem[] = [];

      if (detalles && detalles.length > 0) {
        const productoIds = [...new Set(detalles.map((d: any) => d.producto_id))];
        const { data: productos } = await supabase
          .from("productos")
          .select("id, nombre")
          .in("id", productoIds);

        const nombreMap: Record<number, string> = {};
        if (productos) {
          for (const p of productos) nombreMap[p.id] = p.nombre;
        }

        items = detalles.map((d: any) => ({
          id: d.id,
          nombre: nombreMap[d.producto_id] || `#${d.producto_id}`,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          es_cortesia: d.es_cortesia,
          padre_id: d.padre_id,
        }));
      }

      setData({
        folio: orden.folio,
        mesa: orden.mesa,
        tipo: orden.tipo,
        fecha_hora: orden.fecha_hora,
        total: orden.total,
        subtotal: orden.subtotal,
        costo_envio: orden.costo_envio || 0,
        es_consumo_staff: orden.es_consumo_staff,
        mesero,
        items,
      });
      setLoading(false);
    })();
  }, [ordenId]);

  const fmt = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : !data ? (
          <div className="p-8 text-center text-red-400">Orden no encontrada</div>
        ) : (
          <>
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{data.folio}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>📅 {new Date(data.fecha_hora).toLocaleString("es-MX")}</p>
                <p>👤 {data.mesero || "—"}</p>
                <p>🏷️ {data.tipo}{data.mesa ? ` · Mesa ${data.mesa}` : ""}</p>
                {data.es_consumo_staff ? (
                  <span className="inline-block mt-1 bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                    Consumo Staff
                  </span>
                ) : null}
              </div>
            </div>

            <div className="p-6 space-y-3">
              {data.items
                .filter((i) => !i.padre_id)
                .map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex justify-between">
                      <span>
                        {item.cantidad}x {item.nombre}
                        {item.es_cortesia ? (
                          <span className="text-purple-400 ml-1 text-xs">(Cortesía)</span>
                        ) : null}
                      </span>
                      <span className="text-foodpilot-400">
                        {item.es_cortesia ? "—" : fmt(item.precio_unitario * item.cantidad)}
                      </span>
                    </div>
                    {data.items
                      .filter((c) => c.padre_id === item.id)
                      .map((comp, ci) => (
                        <div key={ci} className="text-gray-500 ml-4">
                          ↳ {comp.nombre}
                        </div>
                      ))}
                  </div>
                ))}
            </div>

            <div className="p-6 border-t border-gray-800 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{fmt(data.subtotal)}</span>
              </div>
              {data.costo_envio > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Costo envío</span>
                  <span>{fmt(data.costo_envio)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-foodpilot-400 pt-2">
                <span>Total</span>
                <span>{fmt(data.total)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
