import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { usePageMeta } from "../components/Common.jsx";

export default function Register() {
    usePageMeta("Inscription", "Créez votre compte DÉTOUR.");
    const { register } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await register(name, email, password);
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
                <h1>Créer un compte</h1>
                <p className="lead">Rejoignez DÉTOUR et préparez votre prochain week-end sur mesure.</p>

                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={onSubmit} className="auth-form">
                    <label className="field">
                        Nom
                        <input
                            type="text"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Votre prénom et nom"
                        />
                    </label>
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
                            minLength={6}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="6 caractères minimum"
                        />
                    </label>
                    <button className="pill" type="submit" disabled={busy}>
                        {busy ? "Création…" : "Créer mon compte"}
                    </button>
                </form>

                <p className="auth-switch">
                    Déjà un compte ? <Link to="/login">Se connecter</Link>
                </p>
            </div>
        </main>
    );
}
