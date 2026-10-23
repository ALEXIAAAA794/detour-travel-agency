import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { usePageMeta } from "../components/Common.jsx";

export default function Login() {
    usePageMeta("Connexion", "Connectez-vous à votre compte DÉTOUR.");
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = location.state?.from;

    const [loginIdentifier, setLoginIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [accountType, setAccountType] = useState(() => returnTo ? "client" : null);

    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            if (accountType === "client") {
                await login(loginIdentifier, password);
                navigate(returnTo ? `${returnTo.pathname}${returnTo.search || ""}${returnTo.hash || ""}` : "/", { replace: true });
            } else {
                const response = await fetch("/auth/login", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier: loginIdentifier, password }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Erreur de connexion gestionnaire.");
                }
                if (!data.manager) {
                    throw new Error("La connexion n’a pas retourné de session gestionnaire valide.");
                }
                window.location.assign(
                    import.meta.env.VITE_GESTIONNAIRE_URL || "http://localhost:5174"
                );
            }
        } catch (err) {
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-card">
                <span className="eyebrow">Espace DÉTOUR</span>
                <h1>{accountType ? "Connexion" : "Bienvenue"}</h1>
                <p className="lead">
                    {accountType === "client"
                        ? "Connectez-vous à votre espace client pour retrouver vos voyages."
                        : accountType === "gestionnaire"
                            ? "Connectez-vous à votre espace professionnel."
                            : "Choisissez votre espace pour continuer."}
                </p>

                {!accountType ? (
                    <div className="account-type-choices">
                        <button type="button" className="account-type-choice" onClick={() => setAccountType("client")}>
                            <strong>Je suis un client</strong>
                            <span>Accéder à mon espace voyageur</span>
                        </button>
                        <button type="button" className="account-type-choice" onClick={() => setAccountType("gestionnaire")}>
                            <strong>Je suis gestionnaire</strong>
                            <span>Accéder au back-office professionnel</span>
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            className="account-type-back"
                            onClick={() => {
                                setAccountType(null);
                                setError("");
                            }}
                        >
                            ← Changer d’espace
                        </button>

                        {error && <p className="auth-error" role="alert">{error}</p>}

                        <form onSubmit={onSubmit} className="auth-form">
                            <label className="field">
                                {accountType === "client" ? "E-mail" : "Identifiant gestionnaire"}
                                <input
                                    type={accountType === "client" ? "email" : "text"}
                                    required
                                    autoComplete={accountType === "client" ? "email" : "username"}
                                    value={loginIdentifier}
                                    onChange={(e) => setLoginIdentifier(e.target.value)}
                                    placeholder={accountType === "client" ? "vous@exemple.fr" : "Votre identifiant"}
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

                        {accountType === "client" && (
                            <p className="auth-switch">
                            Pas encore de compte ? <Link to="/register" state={location.state}>Créer un compte</Link>
                            </p>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
