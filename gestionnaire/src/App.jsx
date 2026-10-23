import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { getSession, logout } from "./services/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    getSession()
      .then((data) => setUser(data?.manager || data?.user || null))
      .catch(() => {
        setUser(null);
        setAuthError("Le service de connexion gestionnaire ne répond pas. Vérifiez que le service conseillers est démarré sur le port 8081.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="loading-message">Chargement…</p>;
  }

  if (!user) {
    return <Login
      initialError={authError}
      onLogin={(data) => {
        setAuthError("");
        setUser(data?.manager || data?.user || data);
      }}
    />;
  }

  return (
    <ProtectedRoute user={user} loading={loading}>
      <Dashboard user={user} onLogout={async () => {
        try {
          await logout();
        } finally {
          setUser(null);
        }
      }} />
    </ProtectedRoute>
  );
}
