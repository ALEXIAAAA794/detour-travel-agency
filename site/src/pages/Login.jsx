import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { usePageMeta } from "../components/Common.jsx";

export default function Login() {
    usePageMeta("Connexion", "Connectez-vous à votre compte DÉTOUR.");
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await login(email, password);
            navigate("/");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-card">
                <span className="eyebrow">Espace client</span>
                <h1>Connexion</h1>
                <p className="lead">Retrouvez vos devis et vos voyages sur mesure.</p>

                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={onSubmit} className="auth-form">
                    <label className="field">
                        E-mail
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vous@exemple.fr"
                        />
                    </label>
                    <label className="field">
                        Mot de passe
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </label>
                    <button className="pill" type="submit" disabled={busy}>
                        {busy ? "Connexion…" : "Se connecter"}
                    </button>
                </form>

                <p className="auth-switch">
                    Pas encore de compte ? <Link to="/register">Créer un compte</Link>
                </p>
            </div>
        </main>
    );
}
