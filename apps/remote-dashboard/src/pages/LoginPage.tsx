import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, suspensionStatus } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (suspensionStatus?.suspendido) {
      const timer = setInterval(() => {
        window.location.reload();
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [suspensionStatus]);

  if (suspensionStatus?.suspendido) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Sistema Suspendido</h1>
          <p className="text-gray-400 mb-6">
            {suspensionStatus.motivo || "Esta instalación ha sido suspendida. Contacta a tu proveedor para más información."}
          </p>
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 max-w-sm mx-auto">
            <p className="text-gray-500 text-sm mb-2">Contacto</p>
            <p className="text-foodpilot-400 font-medium">soporte@foodpilot.com</p>
          </div>
          <p className="text-gray-600 text-xs mt-6">Esta pantalla se actualiza automáticamente cada 30 segundos</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    const err = await login(pin.trim());
    if (err) setError(err);
    else navigate("/");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foodpilot-400">FoodPilot</h1>
          <p className="text-gray-400 text-sm mt-1">Dashboard Remoto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">PIN de Administrador</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ingresa tu PIN"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-foodpilot-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length === 0}
            className="w-full bg-foodpilot-700 hover:bg-foodpilot-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-all active:scale-95"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-6">Solo administradores autorizados</p>
      </div>
    </div>
  );
}
