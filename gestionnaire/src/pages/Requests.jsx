import { useCallback, useEffect, useMemo, useState } from "react";
import "./requests.css";

const statuses = [
  "Toutes",
  "Demande reçue",
  "Demande en cours d’étude",
  "À préciser",
  "Préparation disponible",
  "Préparation en cours",
  "Vérification de faisabilité",
  "Proposition envoyée",
  "Proposition envoyée au gestionnaire",
  "Modification demandée",
  "Voyage confirmé, paiement en attente",
  "Payé",
  "Refusée",
  "Expirée",
];

const statusToApi = {
  "Demande reçue": "PENDING_REVIEW",
  "Demande en cours d’étude": "IN_REVIEW",
  "À préciser": "NEEDS_INFO",
  "Préparation disponible": "PREPARATION_AVAILABLE",
  "Préparation en cours": "PREPARATION_IN_PROGRESS",
  "Vérification de faisabilité": "FEASIBILITY_REVIEW",
  "Proposition envoyée": "PROPOSAL_SENT",
  "Proposition envoyée au gestionnaire": "SUBMITTED",
  "Modification demandée": "CHANGES_REQUESTED",
  "Voyage confirmé, paiement en attente": "CONFIRMED_AWAITING_PAYMENT",
  "Payé": "PAID",
  "Refusée": "REFUSED",
  "Expirée": "EXPIRED",
};

const statusFromApi = Object.fromEntries(
  Object.entries(statusToApi).map(([label, value]) => [value, label])
);
statusFromApi.PENDING = "Demande reçue";
statusFromApi.SUBMITTED = "Proposition envoyée";
statusFromApi.CONFIRMED = "Voyage confirmé, paiement en attente";
statusFromApi.PAID = "Payé";
statusFromApi.REJECTED = "Refusée";
statusFromApi.PENDING_REVIEW = "Demande reçue";
statusFromApi.IN_REVIEW = "Demande en cours d’étude";
statusFromApi.PAYMENT_PENDING = "Voyage confirmé, paiement en attente";

const money = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const date = (value) =>
  value
    ? new Date(value.length === 10 ? `${value}T12:00:00` : value)
        .toLocaleDateString("fr-FR")
    : "—";

function mapRequest(item) {
  const proposal = item.proposal || {};
  const paymentLabels = {
    PAID: "Reçu",
    PENDING: "En attente",
    FAILED: "Échec",
    REFUNDED: "Remboursé",
    NOT_REQUIRED: "Non demandé",
  };

  return {
    id: item.id,
    reference: item.reference || `D-${item.id.slice(0, 8)}`,
    client: item.clientName,
    email: item.clientEmail,
    phone: item.clientPhone || "Non renseigné",
    destination: item.destination,
    start: item.startDate ? String(item.startDate).slice(0, 10) : "",
    end: item.endDate ? String(item.endDate).slice(0, 10) : "",
    datePreference: item.datePreference || "",
    received: item.createdAt,
    status: statusFromApi[item.status] || item.status,
    travelers: item.travelers,
    budget: item.budgetText || item.budget || "Non renseigné",
    preferences: item.preferences || "",
    proposal: {
      stages: proposal.itinerary
        ? typeof proposal.itinerary === "string"
          ? proposal.itinerary
          : JSON.stringify(proposal.itinerary, null, 2)
        : "",
      activities: proposal.activities || "",
      stay: proposal.accommodation || "",
      transport: proposal.transport || "",
      price: Number(proposal.totalPrice || 0),
    },
    payment: paymentLabels[item.paymentStatus] || "Non demandé",
    paymentUrl: item.paymentUrl || "",
    notes: item.internalNotes
  ? item.internalNotes.split("\n").filter(Boolean)
  : [],
    emails: (item.emails || []).map(
      (email) => `${email.subject} — ${email.status}`
    ),
    history: (item.history || []).map(
      (entry) => `${date(entry.createdAt)} — ${entry.action}`
    ),
  };
}

export default function Requests() {
  const [rows, setRows] = useState([]);
  const [id, setId] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [tab, setTab] = useState("details");
  const [note, setNote] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [flash, setFlash] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/manager-api/requests");
      if (!response.ok) {
        throw new Error(`Erreur API (${response.status})`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.data;

      if (!Array.isArray(items)) {
        throw new Error("Format de réponse API inattendu.");
      }

      const mapped = items.map(mapRequest);
      setRows(mapped);
      setId((currentId) =>
        mapped.some((item) => item.id === currentId)
          ? currentId
          : mapped[0]?.id || null
      );
    } catch (err) {
      setError(
        `${err.message}. Vérifie que le backend tourne sur le port 3000.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const current = rows.find((item) => item.id === id) || null;

  useEffect(() => {
    setPaymentUrl(current?.paymentUrl || "");
  }, [current?.id, current?.paymentUrl]);

  const list = useMemo(
    () =>
      rows.filter(
        (item) =>
          (filter === "Toutes" || item.status === filter) &&
          [
            item.reference,
            item.client,
            item.destination,
            item.email,
          ].some((value) =>
            String(value || "").toLowerCase().includes(q.toLowerCase())
          )
      ),
    [rows, q, filter]
  );

  async function updateStatus(newStatus, paymentLink = "") {
    if (!current) return;

    const apiStatus = statusToApi[newStatus];
    if (!apiStatus) return;

    try {
      const response = await fetch(
        `/manager-api/requests/${current.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: apiStatus,
            ...(paymentLink ? { paymentUrl: paymentLink } : {}),
          }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Erreur API (${response.status})`);
      }

      const result = await response.json().catch(() => ({}));
      setFlash(
        result.preparationEmailSent === false
          ? `Statut mis à jour : ${newStatus}. ${result.preparationEmailNotice || "Email de préparation non envoyé."}`
          : result.confirmationEmailSent === true
            ? `Statut mis à jour : ${newStatus}. Email de confirmation envoyé à ${current.email}.`
            : result.confirmationEmailSent === false
              ? `Statut mis à jour : ${newStatus}. ${result.confirmationEmailNotice || "Email de confirmation non envoyé."}`
              : `Statut mis à jour : ${newStatus}`
      );
      await loadRequests();
    } catch (err) {
      setError(`Impossible d'enregistrer le statut : ${err.message}`);
    }
  }

  
  async function addNote() {
    if (!current || !note.trim()) {
      setError("Saisis une note avant de l'enregistrer.");
      return;
    }

    setError("");
    setFlash("");

    try {
      const response = await fetch(
        `/manager-api/requests/${current.id}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim() }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.message || `Erreur API (${response.status})`
        );
      }

      setNote("");
      setFlash("Note enregistrée avec succès.");
      await loadRequests();
    } catch (err) {
      setError(`Impossible d'enregistrer la note : ${err.message}`);
    }
  }


  return (
    <main className="rq">
      <header className="rq-head">
        <div>
          <p className="rq-kicker">DÉTOUR VOYAGES · ESPACE CONSEILLER</p>
          <h1>Demandes de voyage</h1>
          <p>Centralisez les dossiers, préparez les propositions et suivez leur avancement.</p>
        </div>
        <div className="rq-stats">
          <span><b>{rows.length}</b>Dossiers</span>
          <span><b>{rows.filter((r) => ["Demande reçue", "Demande en cours d’étude", "À préciser"].includes(r.status)).length}</b>À traiter</span>
          <span><b>{rows.filter((r) => r.payment === "Reçu").length}</b>Payés</span>
        </div>
      </header>

      {flash && <div className="rq-flash">{flash}<button onClick={() => setFlash("")}>×</button></div>}
      {error && <div className="rq-flash">{error}<button onClick={() => setError("")}>×</button></div>}

      <div className="rq-layout">
        <section className="rq-panel">
          <div className="rq-list-title">
            <h2>Liste des demandes</h2>
            <small>{list.length} résultat(s)</small>
          </div>

          <input className="rq-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client, une destination ou une référence…" />

          <div className="rq-filters">
            {statuses.map((status) => (
              <button className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}>{status}</button>
            ))}
          </div>

          <div className="rq-scroll">
            {loading ? <p className="rq-muted">Chargement des demandes…</p> : (
              <table>
                <thead><tr><th>Client</th><th>Destination</th><th>Dates</th><th>Reçue le</th><th>Statut</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className={id === r.id ? "picked" : ""} onClick={() => { setId(r.id); setTab("details"); }}>
                      <td><b>{r.client}</b><small>{r.reference}</small></td>
                      <td>{r.destination}</td>
                      <td>{date(r.start)} – {date(r.end)}</td>
                      <td>{date(r.received)}</td>
                      <td><span className="rq-badge">{r.status}</span></td>
                    </tr>
                  ))}
                  {!list.length && <tr><td colSpan="5">{error ? "Impossible de charger les demandes." : "Aucune demande enregistrée."}</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          <button onClick={loadRequests}>Actualiser</button>
        </section>

        <section className="rq-panel rq-detail">
          {!current ? (
            <div className="rq-body"><h2>Aucune demande sélectionnée</h2><p className="rq-muted">Les dossiers enregistrés dans la base apparaîtront ici.</p></div>
          ) : (
            <>
              <div className="rq-detail-head">
                <div><small>{current.reference}</small><h2>{current.client}</h2><p>{current.destination} · {current.travelers} voyageur(s)</p></div>
                <span className="rq-badge">{current.status}</span>
              </div>

              <nav className="rq-tabs">
                {[["details", "Fiche"], ["proposal", "Proposition"], ["payment", "Paiement"], ["history", "Historique"]].map(([key, label]) => (
                  <button className={tab === key ? "active" : ""} key={key} onClick={() => setTab(key)}>{label}</button>
                ))}
              </nav>

              {tab === "details" && (
                <div className="rq-body">
                  <div className="rq-grid">
                    {[["Email", current.email], ["Téléphone", current.phone], ["Départ", date(current.start)], ["Retour", date(current.end)], ["Période souhaitée", current.datePreference || "Non renseignée"], ["Voyageurs", current.travelers], ["Budget", typeof current.budget === "number" ? money(current.budget) : current.budget]].map(([label, value]) => (
                      <div className="rq-info" key={label}><small>{label}</small><b>{value}</b></div>
                    ))}
                  </div>
                  <div className="rq-section"><h3>Préférences</h3><p>{current.preferences || "Non renseignées"}</p></div>
                  <div className="rq-section">
                    <h3>Traitement de la demande</h3>
                    <div className="rq-actions">
                      <button onClick={() => updateStatus("À préciser")}>Demander des précisions</button>
                      <button className="primary" onClick={() => updateStatus("Préparation disponible")}>Autoriser la préparation</button>
                      <button className="danger" onClick={() => updateStatus("Refusée")}>Refuser</button>
                    </div>
                    <label>Statut<select value={current.status} onChange={(e) => updateStatus(e.target.value)}>{statuses.slice(1).map((s) => <option key={s}>{s}</option>)}</select></label>
                  </div>
                  <div className="rq-section">
                    <h3>Notes internes <small>· invisibles au client</small></h3>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note pour l'équipe…" />
                    <button
  className="primary"
  onClick={addNote}
  disabled={!note.trim()}
>
  Ajouter la note
</button>
                    {current.notes.map((item, index) => <p className="rq-note" key={index}>{item}</p>)}
                  </div>
                </div>
              )}

              {tab === "proposal" && (
                <div className="rq-body">
                  <p className="rq-muted">La sauvegarde de la proposition sera connectée ensuite.</p>
                  <label>Étapes / itinéraire<textarea defaultValue={current.proposal.stages} /></label>
                  <label>Activités<textarea defaultValue={current.proposal.activities} /></label>
                  <label>Hébergements<input defaultValue={current.proposal.stay} /></label>
                  <label>Transports<input defaultValue={current.proposal.transport} /></label>
                  <label>Prix total (€)<input type="number" min="0" defaultValue={current.proposal.price} /></label>
                </div>
              )}

              {tab === "payment" && (
                <div className="rq-body">
                  <div className="rq-pay">
                    <small>SUIVI DU RÈGLEMENT</small><h3>{current.payment}</h3>
                    <p>Montant de la proposition : <b>{money(current.proposal.price)}</b></p>
                    <label>Lien sécurisé du prestataire de paiement<input type="url" value={paymentUrl} onChange={(event) => setPaymentUrl(event.target.value)} placeholder="https://…" /></label>
                    <button className="primary" onClick={() => updateStatus("Voyage confirmé, paiement en attente", paymentUrl)} disabled={!paymentUrl.startsWith("https://")}>Enregistrer le lien et passer en attente de paiement</button>
                    <button onClick={() => updateStatus("Payé")}>Marquer le paiement comme reçu</button>
                  </div>
                  <p className="rq-muted">Le lien est fourni manuellement par le conseiller. Aucun paiement ni vérification automatique n’est effectué par DÉTOUR.</p>
                </div>
              )}

              {tab === "history" && (
                <div className="rq-body">
                  <div className="rq-section"><h3>Historique des actions</h3>{current.history.length ? current.history.map((item, index) => <p className="rq-timeline" key={index}>{item}</p>) : <p className="rq-muted">Aucune action enregistrée.</p>}</div>
                  <div className="rq-section"><h3>Historique des emails</h3>{current.emails.length ? current.emails.map((item, index) => <p className="rq-mail" key={index}>{item}</p>) : <p className="rq-muted">Aucun email enregistré.</p>}</div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <p className="rq-footnote">Les dossiers, statuts, emails de préparation et liens fournis par le conseiller sont enregistrés par l’API. Le paiement reste manuel ; aucun encaissement automatique n’est intégré.</p>
    </main>
  );
}
