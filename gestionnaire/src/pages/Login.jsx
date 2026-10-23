
import { useState } from "react";
import { login } from "../services/auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
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
          <label htmlFor="email">Adresse e-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="gestionnaire@detour.fr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
          Accès réservé aux gestionnaires autorisés.
        </p>
      </section>
    </main>
  );
}
