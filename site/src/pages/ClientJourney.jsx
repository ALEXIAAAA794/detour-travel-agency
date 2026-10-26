import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { usePageMeta } from "../components/Common.jsx";

const API = import.meta.env.VITE_API_URL || "/api";
const LABELS = {
  PENDING: "Demande reçue",
  PENDING_REVIEW: "Demande reçue",
  IN_REVIEW: "Demande en cours d’étude",
  NEEDS_INFO: "Précisions demandées",
  PREPARATION_AVAILABLE: "Préparation du voyage disponible",
  PREPARATION_IN_PROGRESS: "Préparation en cours",
  SUBMITTED: "Proposition envoyée au gestionnaire",
  PROPOSAL_SENT: "Proposition envoyée au gestionnaire",
  FEASIBILITY_REVIEW: "Vérification de faisabilité",
  CHANGES_REQUESTED: "Modification demandée",
  PAYMENT_PENDING: "Voyage confirmé, paiement en attente",
  CONFIRMED_AWAITING_PAYMENT: "Voyage confirmé, paiement en attente",
  PAID: "Paiement effectué",
  REFUSED: "Demande refusée",
  REJECTED: "Demande refusée",
  EXPIRED: "Demande expirée",
  CANCELLED: "Demande annulée",
};
const APPOINTMENT_LABELS = {
  PENDING: "À traiter",
  CONTACTED: "Client contacté",
  SCHEDULED: "Rendez-vous confirmé",
  CANCELLED: "Annulé",
};
function RequestForm({ initialDraft = {} }) {
  usePageMeta("Demande de pré-réservation", "Préparez votre prochain voyage avec DÉTOUR.");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const body = Object.fromEntries(f.entries());
    try {
      const response = await fetch(`${API}/travel-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("detour_token")}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Votre demande n'a pas pu être enregistrée. Réessayez.");
      navigate("/espace", {
        replace: true,
        state: {
          notice: `Votre demande ${data.request.id.slice(0, 8).toUpperCase()} a bien été enregistrée. Notre équipe va l’étudier. ${
            data.emailSent
              ? "Un email confirme la réception de votre demande."
              : data.emailNotice || "L’email de confirmation n’a pas pu être envoyé."
          }`,
        },
      });
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  return <main id="contenu" className="client-page"><div className="wrap client-wrap">
    <span className="eyebrow">Votre prochain voyage commence ici</span><h1>Parlons de votre projet</h1>
    <p className="client-intro">Partagez vos envies. Notre équipe étudiera votre demande avant de vous ouvrir la préparation de votre séjour.</p>
    <form className="client-card client-form" onSubmit={submit}>
      <div className="client-fields">
        <label>Nom et prénom<input name="name" value={user?.name || ""} readOnly /></label>
        <label>Adresse e-mail<input name="email" type="email" value={user?.email || ""} readOnly /></label>
        <label>Destination ou type de séjour<input name="destination" required defaultValue={initialDraft.destination || ""} placeholder="Ex. : Grèce, ou un séjour nature" /></label>
        <label>Départ souhaité<input name="departure" type="date" defaultValue={initialDraft.departure || ""} /></label>
        <label>Retour souhaité<input name="returnDate" type="date" defaultValue={initialDraft.returnDate || ""} /></label>
        <label>Période approximative<input name="datePreference" defaultValue={initialDraft.datePreference || ""} placeholder="Ex. : première quinzaine de juillet" maxLength={120} /></label>
        <label>Voyageurs<input name="travelers" type="number" min="1" max="30" defaultValue={initialDraft.travelers || 2} required /></label>
        <label>Budget estimé<input name="budget" defaultValue={initialDraft.budget || ""} placeholder="Ex. : 800 € par personne" /></label>
        <label>Style de voyage<select name="travelType" defaultValue={initialDraft.travelType || ""}><option value="">À définir</option><option>Détente</option><option>Aventure</option><option>Culture</option><option>Famille</option><option>Gastronomie</option></select></label>
        <label className="span-two">Préférences et besoins particuliers<textarea name="preferences" rows="4" defaultValue={initialDraft.preferences || ""} placeholder="Hébergement, transport, rythme, contraintes utiles…" /></label>
      </div>
      <button className="pill" disabled={busy}>{busy ? "Envoi…" : "Envoyer ma demande"}</button>
      <p className="client-notice" role="status">{message}</p>
      <p className="client-small">Cette demande lance une étude, elle ne confirme pas la disponibilité ni une réservation.</p>
    </form>
  </div></main>;
}

function Account() {
  usePageMeta("Mon espace", "Suivez vos demandes de voyage DÉTOUR.");
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointmentError, setAppointmentError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const requestIdFromLink = new URLSearchParams(location.search).get("requestId");
  const preparationTokenFromLink = new URLSearchParams(location.hash.slice(1)).get("preparation-token");
  useEffect(() => {
    if (preparationTokenFromLink && requestIdFromLink) {
      sessionStorage.setItem(`detour-preparation-${requestIdFromLink}`, preparationTokenFromLink);
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: location.state,
      });
    }
  }, [location.hash, location.pathname, location.search, location.state, navigate, preparationTokenFromLink, requestIdFromLink]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/travel-requests/mine`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("detour_token")}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Vos demandes ne peuvent pas être chargées.");
        return data.requests;
      })
      .then((requests) => {
        if (!cancelled) {
          setItems(requests);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/appointments/mine`, {
      headers: { Authorization: `******"detour_token")}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Vos rendez-vous ne peuvent pas être chargés.");
        return Array.isArray(data.appointments) ? data.appointments : [];
      })
      .then((results) => {
        if (!cancelled) {
          setAppointments(results);
          setAppointmentError("");
          setAppointmentsLoading(false);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setAppointmentError(loadError.message);
          setAppointmentsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return <main id="contenu" className="client-page"><div className="wrap client-wrap">
    <span className="eyebrow">Votre espace personnel</span><h1>Coucou {user?.name?.trim().split(/\s+/)[0] || "voyageur"} !</h1>
    <p className="client-intro">Retrouvez les demandes liées à votre compte, même après déconnexion ou depuis un autre appareil.</p>
    {notice && <p role="status" className="client-notice">{notice}</p>}
    {error && <p role="alert" className="client-notice">{error}</p>}
    <div className="client-account-actions">
      <Link className="pill" to="/pre-reservation">Demander une pré-réservation</Link>
      <Link className="pill ghost" to="/rendez-vous">Demander un rendez-vous</Link>
    </div>
    {items.length === 0 && !error && <section className="client-card empty-state"><h2>Aucune demande pour le moment</h2><p>Votre prochain voyage peut commencer par une simple idée.</p><Link className="pill" to="/pre-reservation">Demander une pré-réservation</Link></section>}
    <div className="request-list">{items.map((item) => (
      <RequestCard
        key={item.id}
        item={item}
        onUpdate={(updated) => setItems((previous) => previous.map((current) => current.id === updated.id ? updated : current))}
        token={localStorage.getItem("detour_token")}
        preparationToken={
          requestIdFromLink === item.id
            ? sessionStorage.getItem(`detour-preparation-${item.id}`)
            : null
        }
      />
    ))}</div>
    <section className="client-card request-card">
      <div className="request-head"><div><span className="eyebrow">Votre suivi</span><h2>Mes rendez-vous</h2></div></div>
      {appointmentError && <p role="alert" className="client-notice">{appointmentError}</p>}
      {appointmentsLoading && <p role="status">Chargement de vos rendez-vous…</p>}
      {!appointmentsLoading && !appointments.length && !appointmentError && <p>Vous n’avez pas encore de rendez-vous demandé.</p>}
      {appointments.map((appointment) => (
        <article className="itinerary" key={appointment.id}>
          <h3>{appointment.subject}</h3>
          <p>{new Date(`${String(appointment.preferredDate).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR")} · {appointment.preferredTime}</p>
          <p>Statut : {APPOINTMENT_LABELS[appointment.status] || appointment.status}</p>
          {appointment.message && <p>{appointment.message}</p>}
        </article>
      ))}
    </section>
  </div></main>;
}

function RequestCard({ item, token, preparationToken, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState(item.itinerary || { summary: "", steps: [{ day: "Jour 1", place: "", activities: "" }], duration: "", estimatedBudget: "", preferences: "" });
  const canPrepare = ["PREPARATION_AVAILABLE", "PREPARATION_IN_PROGRESS", "CHANGES_REQUESTED"].includes(item.status);
  async function persist(path, method, body) {
    setBusy(true); setNotice("");
    try {
      const r = await fetch(`${API}/travel-requests/${item.id}/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(preparationToken ? { "X-Preparation-Token": preparationToken } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "La modification n'a pas pu être enregistrée. Réessayez dans un instant.");
      onUpdate(data); setNotice("Votre dossier a été mis à jour."); setEditing(false);
    } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  async function suggestWithAI() {
    setThinking(true); setNotice("");
    const prompt = `Aide-moi à préparer une proposition de voyage (sans confirmer de disponibilité). Demande ${item.id}. Destination souhaitée : ${item.destination}. Dates : ${item.departure || "souples"} au ${item.returnDate || "à définir"}. Période approximative souhaitée : ${item.datePreference || "non précisée"}. Voyageurs : ${item.travelers}. Budget : ${item.budget || "à définir"}. Style : ${item.travelType || "à définir"}. Préférences : ${item.preferences || "à définir"}. Propose un résumé et des étapes concrètes, sans inventer des disponibilités ou tarifs garantis.`;
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
    {item.datePreference && <p>Période souhaitée : {item.datePreference}</p>}
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
    {(item.status === "CONFIRMED_AWAITING_PAYMENT" || item.status === "PAYMENT_PENDING" || item.status === "PAID") && <p>Statut de paiement : {item.paymentStatus === "PAID" || item.status === "PAID" ? "Paiement effectué" : "En attente"}{item.paymentUrl && <> · <a href={item.paymentUrl} target="_blank" rel="noreferrer">Accéder au paiement</a></>}</p>}
    <p className="client-small">Votre validation transmet la proposition au gestionnaire. Elle ne constitue pas une réservation définitive.</p>
  </article>;
}

export default function ClientJourney() {
  const location = useLocation();
  const draft = location.state?.draft;
  return location.pathname.startsWith("/pre-reservation") || location.pathname === "/espace/prereservation"
    ? <RequestForm initialDraft={draft} />
    : <Account />;
}
