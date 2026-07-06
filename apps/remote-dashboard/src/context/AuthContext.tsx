import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../supabase";

export interface AuthUser {
  id: number;
  nombre: string;
  pin: string;
  rol: string;
  activo: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (pin: string) => Promise<string | null>;
  logout: () => void;
  suspensionStatus: { suspendido: boolean; motivo: string | null } | null;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspensionStatus, setSuspensionStatus] = useState<{ suspendido: boolean; motivo: string | null } | null>(null);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("dashboard_user");
  };

  const checkSuspension = async () => {
    try {
      const { data, error } = await supabase
        .from("sistema_config")
        .select("suspendido, motivo")
        .eq("id", 1)
        .single();
      if (error) return;
      if (!data) return;
      const suspendido = data.suspendido === 1;
      setSuspensionStatus({ suspendido, motivo: data.motivo || null });
      if (suspendido) {
        const stored = localStorage.getItem("dashboard_user");
        if (stored) logout();
      }
    } catch {}
  };

  useEffect(() => {
    const stored = localStorage.getItem("dashboard_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { }
    }
    setLoading(false);

    checkSuspension();
    const interval = setInterval(checkSuspension, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (suspensionStatus?.suspendido) {
      const stored = localStorage.getItem("dashboard_user");
      if (stored) logout();
    }
  }, [suspensionStatus]);

  const login = async (pin: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("pin", pin)
      .eq("rol", "ADMIN")
      .eq("activo", 1)
      .single();

    if (error || !data) {
      return "PIN incorrecto o no tienes permisos de administrador";
    }

    const u: AuthUser = {
      id: data.id,
      nombre: data.nombre,
      pin: data.pin,
      rol: data.rol,
      activo: data.activo,
    };

    setUser(u);
    localStorage.setItem("dashboard_user", JSON.stringify(u));
    return null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, suspensionStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
