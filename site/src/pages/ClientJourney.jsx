import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePageMeta } from "../components/Common.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const STORAGE = "detour-client-requests";
const LABELS = {
  PENDING_REVIEW: "Demande en cours d'étude",
  PREPARATION_AVAILABLE: "Préparation du voyage disponible",
  PREPARATION_IN_PROGRESS: "Préparation en cours",
  SUBMITTED: "Proposition envoyée au gestionnaire",
  FEASIBILITY_REVIEW: "Vérification de faisabilité",
  CHANGES_REQUESTED: "Modification demandée",
  CONFIRMED_AWAITING_PAYMENT: "Voyage confirmé, paiement en attente",
  PAID: "Paiement effectué",
  REFUSED: "Demande refusée",
  EXPIRED: "Demande expirée",
};
const getSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch { return []; } };
const save = (rows) => localStorage.setItem(STORAGE, JSON.stringify(rows));

function RequestForm() {
  usePageMeta("Demande de pré-réservation", "Préparez votre prochain voyage avec DÉTOUR.");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const body = Object.fromEntries(f.entries());
    try {
      const response = await fetch(`${API}/travel-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error("Votre demande n'a pas pu être enregistrée. Vérifiez les informations et réessayez.");
      const rows = getSaved(); rows.unshift({ id: data.request.id, accessToken: data.accessToken }); save(rows);
      setMessage(`Votre demande ${data.request.id.slice(0, 8).toUpperCase()} a bien été enregistrée. Statut : Demande reçue. ${data.emailSent ? "Un email de confirmation a été envoyé." : data.emailNotice || "L'email de confirmation n'a pas pu être envoyé."}`);
      form.reset();
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  return <main id="contenu" className="client-page"><div className="wrap client-wrap">
    <p className="crumbs"><Link to="/">Accueil</Link> / Pré-réservation</p>
    <span className="eyebrow">Votre prochain voyage commence ici</span><h1>Parlons de votre projet</h1>
    <p className="client-intro">Partagez vos envies. Notre équipe étudiera votre demande avant de vous ouvrir la préparation de votre séjour.</p>
    <form className="client-card client-form" onSubmit={submit}>
      <div className="client-fields">
        <label>Nom et prénom<input name="name" autoComplete="name" minLength="2" required placeholder="Camille Martin" /></label>
        <label>Adresse e-mail<input name="email" type="email" autoComplete="email" required placeholder="camille@exemple.fr" /></label>
        <label>Destination ou type de séjour<input name="destination" required placeholder="Ex. : Grèce, ou un séjour nature" /></label>
        <label>Départ souhaité<input name="departure" type="date" /></label>
        <label>Retour souhaité<input name="returnDate" type="date" /></label>
        <label>Voyageurs<input name="travelers" type="number" min="1" max="30" defaultValue="2" required /></label>
        <label>Budget estimé<input name="budget" placeholder="Ex. : 800 € par personne" /></label>
        <label>Style de voyage<select name="travelType"><option value="">À définir</option><option>Détente</option><option>Aventure</option><option>Culture</option><option>Famille</option><option>Gastronomie</option></select></label>
        <label className="span-two">Préférences et besoins particuliers<textarea name="preferences" rows="4" placeholder="Hébergement, transport, rythme, contraintes utiles…" /></label>
      </div>
      <button className="pill" disabled={busy}>{busy ? "Envoi…" : "Envoyer ma demande"}</button>
      <p className="client-notice" role="status">{message}</p>
      <p className="client-small">Cette demande lance une étude, elle ne confirme pas la disponibilité ni une réservation.</p>
    </form>
  </div></main>;
}

function Account() {
  usePageMeta("Mon espace", "Suivez vos demandes de voyage DÉTOUR.");
  const [rows, setRows] = useState(getSaved);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all(rows.map(async (row) => {
      const r = await fetch(`${API}/travel-requests/${row.id}`, { headers: { Authorization: `Bearer ${row.accessToken}` } });
      if (!r.ok) throw new Error("Une demande ne peut pas être chargée. Vérifiez que l'API est disponible.");
      return r.json();
    })).then(setItems).catch((e) => setError(e.message));
  }, []);
  return <main id="contenu" className="client-page"><div className="wrap client-wrap">
    <p className="crumbs"><Link to="/">Accueil</Link> / Mon espace</p><span className="eyebrow">Votre espace personnel</span><h1>Mes voyages</h1>
    <p className="client-intro">Retrouvez ici les demandes enregistrées depuis ce navigateur.</p>
    {error && <p role="alert" className="client-notice">{error}</p>}
    {items.length === 0 && !error && <section className="client-card empty-state"><h2>Aucune demande pour le moment</h2><p>Votre prochain voyage peut commencer par une simple idée.</p><Link className="pill" to="/pre-reservation">Demander une pré-réservation</Link></section>}
    <div className="request-list">{items.map((item) => <RequestCard key={item.id} item={item} onUpdate={(updated) => setItems((prev) => prev.map((p) => p.id === updated.id ? updated : p))} token={rows.find((r) => r.id === item.id)?.accessToken} />)}</div>
    <Link className="pill ghost" to="/pre-reservation">Nouvelle demande</Link>
  </div></main>;
}

function RequestCard({ item, token, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState(item.itinerary || { summary: "", steps: [{ day: "Jour 1", place: "", activities: "" }], duration: "", estimatedBudget: "", preferences: "" });
  const canPrepare = ["PREPARATION_AVAILABLE", "PREPARATION_IN_PROGRESS", "CHANGES_REQUESTED"].includes(item.status);
  async function persist(path, method, body) {
    setBusy(true); setNotice("");
    try {
      const r = await fetch(`${API}/travel-requests/${item.id}/${path}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await r.json(); if (!r.ok) throw new Error("La modification n'a pas pu être enregistrée. Réessayez dans un instant.");
      onUpdate(data); setNotice("Votre dossier a été mis à jour."); setEditing(false);
    } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  async function suggestWithAI() {
    setThinking(true); setNotice("");
    const prompt = `Aide-moi à préparer une proposition de voyage (sans confirmer de disponibilité). Demande ${item.id}. Destination souhaitée : ${item.destination}. Dates : ${item.departure || "souples"} au ${item.returnDate || "à définir"}. Voyageurs : ${item.travelers}. Budget : ${item.budget || "à définir"}. Style : ${item.travelType || "à définir"}. Préférences : ${item.preferences || "à définir"}. Propose un résumé et des étapes concrètes, sans inventer des disponibilités ou tarifs garantis.`;
    try {
      const r = await fetch("/api/support/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt }) });
      const data = await r.json();
      if (!r.ok) throw new Error("L'assistant voyage est momentanément indisponible.");
      setDraft({ ...draft, summary: data.reply.content });
      setNotice("Suggestion reçue. Relisez-la et complétez les étapes avant d'enregistrer.");
    } catch (e) { setNotice(e.message); } finally { setThinking(false); }
  }
  return <article className="client-card request-card">
    <div className="request-head"><div><span className="eyebrow">Demande {item.id.slice(0, 8).toUpperCase()}</span><h2>{item.destination}</h2></div><span className="status-chip">{LABELS[item.status] || item.status}</span></div>
    <p>{item.travelers} voyageur{item.travelers > 1 ? "s" : ""} · {item.email}</p>
    {item.departure && <p>Du {new Date(item.departure).toLocaleDateString("fr-FR")} au {item.returnDate ? new Date(item.returnDate).toLocaleDateString("fr-FR") : "à préciser"}</p>}
    {item.itinerary && <div className="itinerary"><h3>Votre proposition</h3><p>{item.itinerary.summary}</p><ol>{item.itinerary.steps?.map((s, i) => <li key={i}><strong>{s.day} · {s.place}</strong><br />{s.activities}</li>)}</ol><p>Durée : {item.itinerary.duration || "à définir"} · Budget estimatif : {item.itinerary.estimatedBudget || "à définir"}</p></div>}
    {canPrepare && <div className="preparation">
      {!editing ? <button className="pill" onClick={() => setEditing(true)}>{item.itinerary ? "Modifier ma proposition" : "Préparer mon voyage"}</button> : <form onSubmit={(e) => { e.preventDefault(); persist("preparation", "PATCH", { itinerary: draft }); }}>
        <p className="client-small">Préparez votre séjour avec l'assistant, puis relisez et ajustez chaque détail avant de l'enregistrer.</p>
        <button type="button" className="pill ghost" disabled={thinking} onClick={suggestWithAI}>{thinking ? "L'assistant réfléchit…" : "Demander une suggestion à l'assistant IA"}</button>
        <label>Résumé<textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Le voyage que vous imaginez…" /></label>
        {draft.steps.map((s, i) => <div className="step-fields" key={i}><label>Étape<input value={s.day} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x, n) => n === i ? { ...x, day: e.target.value } : x) })} /></label><label>Lieu<input value={s.place} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x, n) => n === i ? { ...x, place: e.target.value } : x) })} /></label><label className="span-two">Activités<textarea value={s.activities} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x, n) => n === i ? { ...x, activities: e.target.value } : x) })} /></label></div>)}
        <button type="button" className="pill ghost" onClick={() => setDraft({ ...draft, steps: [...draft.steps, { day: `Jour ${draft.steps.length + 1}`, place: "", activities: "" }] })}>Ajouter une étape</button>
        <div className="client-fields"><label>Durée<input value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} placeholder="4 jours" /></label><label>Budget estimatif<input value={draft.estimatedBudget} onChange={(e) => setDraft({ ...draft, estimatedBudget: e.target.value })} placeholder="1 200 € / personne" /></label><label className="span-two">Rythme et préférences<textarea value={draft.preferences} onChange={(e) => setDraft({ ...draft, preferences: e.target.value })} /></label></div>
        <button className="pill" disabled={busy}>Enregistrer la préparation</button> <button type="button" className="pill ghost" onClick={() => setEditing(false)}>Annuler</button>
      </form>}
      {item.itinerary && item.status !== "SUBMITTED" && <button className="pill submit-trip" disabled={busy} onClick={() => persist("submit", "POST", {})}>Valider mon projet de voyage</button>}
    </div>}
    <p className="client-notice" role="status">{notice}</p>
    {(item.status === "CONFIRMED_AWAITING_PAYMENT" || item.status === "PAID") && <p>Statut de paiement : {item.status === "PAID" ? "Payé" : "En attente"}{item.paymentUrl && <> · <a href={item.paymentUrl}>Accéder au paiement</a></>}</p>}
    <p className="client-small">Votre validation transmet la proposition au gestionnaire. Elle ne constitue pas une réservation définitive.</p>
  </article>;
}

export default function ClientJourney() {
  const location = useLocation();
  return location.pathname.startsWith("/pre-reservation") ? <RequestForm /> : <Account />;
}
