import { useEffect } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import {
  DashboardTab,
  TendenciaTab,
  ProductosTab,
  CategoriasTab,
  MeserosTab,
  HorarioTab,
  DetalleDiarioTab,
} from "../components/reports";

const SUBTABS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "tendencia", label: "Tendencia", icon: "📈" },
  { key: "productos", label: "Productos", icon: "🏆" },
  { key: "categorias", label: "Categorías", icon: "📁" },
  { key: "meseros", label: "Meseros", icon: "👤" },
  { key: "horario", label: "Horario", icon: "🕐" },
  { key: "detalle", label: "Detalle del Día", icon: "📋" },
];

export default function ReportsPage() {
  const { subtab } = useParams();
  const navigate = useNavigate();
  const active = subtab || "dashboard";

  useEffect(() => {
    if (!subtab) navigate("/reportes/dashboard", { replace: true });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">📈 Reportes</h1>
        <p className="text-gray-400 text-sm">Análisis y métricas del negocio</p>
      </div>

      <div className="flex gap-1 mb-8 overflow-x-auto pb-2 border-b border-gray-800">
        {SUBTABS.map((t) => (
          <NavLink
            key={t.key}
            to={`/reportes/${t.key}`}
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

      {active === "dashboard" && <DashboardTab />}
      {active === "tendencia" && <TendenciaTab />}
      {active === "productos" && <ProductosTab />}
      {active === "categorias" && <CategoriasTab />}
      {active === "meseros" && <MeserosTab />}
      {active === "horario" && <HorarioTab />}
      {active === "detalle" && <DetalleDiarioTab />}
    </div>
  );
}
