import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { usePageMeta } from "../components/Common.jsx";

const API = import.meta.env.VITE_API_URL || "/api";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AppointmentRequest() {
  usePageMeta("Prendre rendez-vous", "Demandez un rendez-vous avec un conseiller DÉTOUR.");
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const token = localStorage.getItem("detour_token");
    try {
      const response = await fetch(`${API}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "La demande n'a pas pu être envoyée.");
      setMessage("Votre demande de rendez-vous est transmise à l’équipe. Le créneau sera confirmé par un conseiller.");
      form.reset();
    } catch (error) {
      setMessage(error.message || "Une erreur est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="contenu" className="client-page">
      <div className="wrap client-wrap">
        <p className="crumbs"><Link to="/">Accueil</Link> / Rendez-vous</p>
        <span className="eyebrow">Rencontrons-nous</span>
        <h1>Prendre rendez-vous</h1>
        <p className="client-intro">Indiquez le créneau qui vous conviendrait. Un conseiller vous contactera pour confirmer le rendez-vous.</p>
        <form className="client-card client-form" onSubmit={submit}>
          <div className="client-fields">
            <label>Nom et prénom<input value={user?.name || ""} readOnly /></label>
            <label>Adresse e-mail<input type="email" value={user?.email || ""} readOnly /></label>
            <label>Téléphone<input name="phone" type="tel" autoComplete="tel" maxLength="40" placeholder="06 00 00 00 00" /></label>
            <label>Date souhaitée<input name="preferredDate" type="date" min={today()} required /></label>
            <label>Heure souhaitée<input name="preferredTime" type="time" required /></label>
            <label>Objet du rendez-vous
              <select name="subject" required defaultValue="Parler de mon projet de voyage">
                <option>Parler de mon projet de voyage</option>
                <option>Découvrir l’agence</option>
                <option>Suivre une demande existante</option>
                <option>Autre</option>
              </select>
            </label>
            <label className="span-two">Quelques mots sur votre demande<textarea name="message" rows="4" maxLength="2000" placeholder="Votre projet ou les sujets que vous souhaitez aborder…" /></label>
          </div>
          <button className="pill" disabled={busy}>{busy ? "Envoi…" : "Envoyer ma demande"}</button>
          <p className="client-notice" role="status">{message}</p>
          <p className="client-small">Ce formulaire envoie une demande de rendez-vous, il ne confirme pas encore le créneau.</p>
        </form>
      </div>
    </main>
  );
}
