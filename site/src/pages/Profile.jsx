import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const name = user.name || "Voyageur";
  const initial = name.charAt(0).toUpperCase();

  return (
    <main id="contenu">
      <section className="page-head">
        <div className="wrap">
          <h1>Mon profil</h1>
        </div>
      </section>

      <div className="wrap" style={{ maxWidth: 720, paddingBottom: 64 }}>
        <section className="form-card" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              aria-hidden="true"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "var(--brique, #b5472f)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 34,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{name}</h2>
              <p style={{ margin: "4px 0 0" }}>{user.email}</p>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <Link className="pill" to="/espace">
              Suivre mes demandes et voyages
            </Link>
            <button className="pill" type="button" onClick={logout}>
              Déconnexion
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
