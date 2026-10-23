import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireClient({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main aria-live="polite">Chargement de votre espace…</main>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
