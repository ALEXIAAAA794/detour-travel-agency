
export default function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return <p className="loading-message">Vérification de la session…</p>;
  }

  if (!user) {
    return null;
  }

  return children;
}
