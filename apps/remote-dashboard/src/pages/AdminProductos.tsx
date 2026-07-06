import { useEffect, useState, useCallback } from "react";
import { supabase, formatCurrency } from "../supabase";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  es_paquete: number;
  disponible: number;
  categoria_id: number;
}

interface Categoria {
  id: number;
  nombre: string;
}

const emptyProducto = () => ({
  nombre: "",
  precio: 0,
  es_paquete: 0,
  disponible: 1,
  categoria_id: 0,
});

export default function AdminProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState<{ id?: number } & Record<string, any> | null>(null);
  const [guardando, setGuardando] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        supabase.from("productos").select("*").order("nombre"),
        supabase.from("categorias").select("*").order("nombre"),
      ]);
      setProductos(prodRes.data || []);
      setCategorias(catRes.data || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!editModal || !editModal.nombre.trim() || editModal.precio <= 0) return;
    setGuardando(true);
    try {
      const payload = {
        nombre: editModal.nombre.trim(),
        precio: Number(editModal.precio),
        es_paquete: editModal.es_paquete ? 1 : 0,
        disponible: editModal.disponible ? 1 : 0,
        categoria_id: editModal.categoria_id || null,
      };

      if (editModal.id) {
        const { error } = await supabase
          .from("productos")
          .update(payload)
          .eq("id", editModal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("productos")
          .insert(payload);
        if (error) throw error;
      }

      setEditModal(null);
      loadData();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const toggleDisponible = async (p: Producto) => {
    try {
      await supabase
        .from("productos")
        .update({ disponible: p.disponible ? 0 : 1 })
        .eq("id", p.id);
      loadData();
    } catch (err: any) {
      alert("Error al cambiar disponibilidad: " + err.message);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white flex-1 max-w-xs"
        />
        <div className="flex gap-2">
          <button onClick={loadData} disabled={loading} className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-xl text-xs transition-colors disabled:opacity-50">
            🔄 Actualizar
          </button>
          <button
            onClick={() => setEditModal({ ...emptyProducto() })}
            className="bg-foodpilot-700 hover:bg-foodpilot-600 px-3 py-2 rounded-xl text-xs transition-colors"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {loading && productos.length === 0 ? (
        <p className="text-gray-500 text-center py-8 animate-pulse">Cargando productos...</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-500">Sin resultados</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtrados.map((p) => {
            const cat = categorias.find((c) => c.id === p.categoria_id);
            return (
              <div key={p.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleDisponible(p)}
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${p.disponible ? "bg-green-500" : "bg-red-500"}`}
                    title={p.disponible ? "Disponible" : "Agotado"}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{p.nombre}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {cat?.nombre || "Sin categoría"}{p.es_paquete ? " • 📦 Paquete" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-foodpilot-400 text-sm">{formatCurrency(p.precio)}</span>
                  <button
                    onClick={() => setEditModal({ ...p })}
                    className="text-gray-500 hover:text-white text-xs transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.nombre)}
                    className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editModal.id ? "Editar Producto" : "Nuevo Producto"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editModal.nombre}
                  onChange={(e) => setEditModal({ ...editModal, nombre: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={editModal.precio}
                  onChange={(e) => setEditModal({ ...editModal, precio: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Categoría</label>
                <select
                  value={editModal.categoria_id}
                  onChange={(e) => setEditModal({ ...editModal, categoria_id: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                >
                  <option value={0}>Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editModal.disponible}
                    onChange={(e) => setEditModal({ ...editModal, disponible: e.target.checked ? 1 : 0 })}
                    className="rounded"
                  />
                  Disponible
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editModal.es_paquete}
                    onChange={(e) => setEditModal({ ...editModal, es_paquete: e.target.checked ? 1 : 0 })}
                    className="rounded"
                  />
                  Es paquete
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!editModal.nombre.trim() || editModal.precio <= 0 || guardando}
                className="bg-foodpilot-700 hover:bg-foodpilot-600 px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
