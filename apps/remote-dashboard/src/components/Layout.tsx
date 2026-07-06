import { useState, ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const reporteSubTabs = [
  { path: "/reportes/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/reportes/tendencia", label: "Tendencia", icon: "📈" },
  { path: "/reportes/productos", label: "Productos", icon: "🏆" },
  { path: "/reportes/categorias", label: "Categorías", icon: "📁" },
  { path: "/reportes/meseros", label: "Meseros", icon: "👤" },
  { path: "/reportes/horario", label: "Horario", icon: "🕐" },
  { path: "/reportes/detalle", label: "Detalle del Día", icon: "📋" },
];

const adminSubTabs = [
  { path: "/admin/ordenes", label: "Órdenes", icon: "📋" },
  { path: "/admin/productos", label: "Productos", icon: "🍔" },
  { path: "/admin/paquetes", label: "Paquetes", icon: "📦" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
    isActive
      ? "bg-foodpilot-700/50 text-foodpilot-300 border border-foodpilot-700/50"
      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
  }`;

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [reportesOpen, setReportesOpen] = useState(
    location.pathname.startsWith("/reportes")
  );
  const [adminOpen, setAdminOpen] = useState(
    location.pathname.startsWith("/admin")
  );

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-gray-900/90 border-r border-gray-800 z-40 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold text-foodpilot-400">FoodPilot</h1>
          <p className="text-gray-500 text-xs">Dashboard Remoto</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLink to="/" end className={linkClass}>
            <span>📊</span> Dashboard
          </NavLink>

          {/* Reportes collapsible */}
          <div>
            <button
              onClick={() => setReportesOpen(!reportesOpen)}
              className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive("/reportes")
                  ? "bg-foodpilot-700/50 text-foodpilot-300"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <span className="flex items-center gap-3">
                <span>📈</span> Reportes
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${reportesOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {reportesOpen && (
              <div className="ml-2 mt-1 space-y-0.5 border-l border-gray-800 pl-2">
                {reporteSubTabs.map((tab) => (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-foodpilot-700/30 text-foodpilot-300"
                          : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
                      }`
                    }
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Admin collapsible */}
          <div>
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive("/admin")
                  ? "bg-foodpilot-700/50 text-foodpilot-300"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <span className="flex items-center gap-3">
                <span>⚙️</span> Admin
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${adminOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {adminOpen && (
              <div className="ml-2 mt-1 space-y-0.5 border-l border-gray-800 pl-2">
                {adminSubTabs.map((tab) => (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-foodpilot-700/30 text-foodpilot-300"
                          : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
                      }`
                    }
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User info */}
        {user && (
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-foodpilot-700 flex items-center justify-center text-sm font-bold">
                {user.nombre.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.nombre}</p>
                <p className="text-xs text-gray-500">{user.rol}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-1"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
