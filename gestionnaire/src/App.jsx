
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { getSession } from "./services/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="loading-message">Chargement…</p>;
  }

  if (!user) {
    return <Login onLogin={(data) => setUser(data.user || data)} />;
  }

  return (
    <ProtectedRoute user={user} loading={loading}>
      <Dashboard user={user} onLogout={() => setUser(null)} />
    </ProtectedRoute>
  );
}
