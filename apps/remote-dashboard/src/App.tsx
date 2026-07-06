import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import AdminPage from "./pages/AdminPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, suspensionStatus } = useAuth();
  if (loading) return null;
  if (suspensionStatus?.suspendido) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.rol !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout>
                  <DashboardPage />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/reportes"
            element={
              <RequireAuth>
                <Layout>
                  <ReportsPage />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/reportes/:subtab"
            element={
              <RequireAuth>
                <Layout>
                  <ReportsPage />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <Layout>
                    <AdminPage />
                  </Layout>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/:subtab"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <Layout>
                    <AdminPage />
                  </Layout>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
