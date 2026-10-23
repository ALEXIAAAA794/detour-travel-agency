
import { useState } from "react";
import { login } from "../services/auth";

export default function Login({ onLogin, initialError = "" }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(identifier, password);
      onLogin(user);
    } catch (err) {
      setError(err.status === 401
        ? "Identifiant ou mot de passe incorrect. Saisissez l’identifiant gestionnaire, pas votre adresse e-mail."
        : err.status >= 500 || err instanceof TypeError
          ? "Le service de connexion gestionnaire ne répond pas. Vérifiez que le service conseillers est démarré sur le port 8081."
          : err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">DETOUR · ESPACE PROFESSIONNEL</p>
        <h1>Bon retour parmi nous.</h1>
        <p className="subtitle">
          Connectez-vous pour gérer les clients et les réservations.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="identifier">Identifiant gestionnaire</label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="Votre identifiant"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="error-message" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="security-note">
          Accès réservé aux gestionnaires autorisés. Utilisez l’identifiant créé pour votre compte gestionnaire.
        </p>
      </section>
    </main>
  );
}
