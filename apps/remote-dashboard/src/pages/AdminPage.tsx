import { useParams, useNavigate, NavLink } from "react-router-dom";
import { useEffect } from "react";
import AdminOrdenes from "./AdminOrdenes";
import AdminProductos from "./AdminProductos";
import AdminPaquetes from "./AdminPaquetes";

const SUBTABS = [
  { key: "ordenes", label: "Órdenes", icon: "📋" },
  { key: "productos", label: "Productos", icon: "🍔" },
  { key: "paquetes", label: "Paquetes", icon: "📦" },
];

export default function AdminPage() {
  const { subtab } = useParams();
  const navigate = useNavigate();
  const active = subtab || "ordenes";

  useEffect(() => {
    if (!subtab) navigate("/admin/ordenes", { replace: true });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">⚙️ Administración Remota</h1>
        <p className="text-gray-400 text-sm">Gestiona órdenes, productos y paquetes desde cualquier lugar</p>
      </div>

      <div className="flex gap-1 mb-8 overflow-x-auto pb-2 border-b border-gray-800">
        {SUBTABS.map((t) => (
          <NavLink
            key={t.key}
            to={`/admin/${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              active === t.key
                ? "bg-foodpilot-700/50 text-foodpilot-300 border border-foodpilot-700/50"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
            }`}
          >
            {t.icon} {t.label}
          </NavLink>
        ))}
      </div>

      {active === "ordenes" && <AdminOrdenes />}
      {active === "productos" && <AdminProductos />}
      {active === "paquetes" && <AdminPaquetes />}
    </div>
  );
}
