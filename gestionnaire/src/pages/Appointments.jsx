import { useCallback, useEffect, useState } from "react";

const STATUS_LABELS = {
  PENDING: "À traiter",
  CONTACTED: "Client contacté",
  SCHEDULED: "Rendez-vous confirmé",
  CANCELLED: "Annulée",
};

const formatDate = (value) =>
  value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "—";

export default function Appointments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchAppointments = useCallback(async () => {
    const response = await fetch("/manager-api/appointments");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Erreur API (${response.status})`);
    if (!Array.isArray(data.appointments)) throw new Error("Format de réponse inattendu.");
    return data.appointments;
  }, []);

  const load = useCallback(async () => {
    try {
      setItems(await fetchAppointments());
      setError("");
    } catch (err) {
      setError(`${err.message} Vérifiez que l'API et le service gestionnaire tournent.`);
    } finally {
      setLoading(false);
    }
  }, [fetchAppointments]);

  useEffect(() => {
    let active = true;
    fetchAppointments()
      .then((data) => { if (active) setItems(data); })
      .catch((err) => { if (active) setError(`${err.message} Vérifiez que l'API et le service gestionnaire tournent.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchAppointments]);

  async function updateStatus(item, status) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/manager-api/appointments/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Erreur API (${response.status})`);
      setItems((current) => current.map((entry) => entry.id === item.id ? data.appointment : entry));
      setNotice(data.appointmentEmailSent === true
        ? `Rendez-vous confirmé et email envoyé à ${item.clientEmail}.`
        : data.appointmentEmailNotice || "Le statut du rendez-vous a été enregistré.");
    } catch (err) {
      setError(`Le statut n'a pas été enregistré : ${err.message}`);
    }
  }

  return (
    <section className="rq">
      <header className="rq-head">
        <div>
          <p className="rq-kicker">DÉTOUR VOYAGES · ESPACE CONSEILLER</p>
          <h1>Demandes de rendez-vous</h1>
          <p>Les créneaux sont des souhaits à confirmer avec les clients.</p>
        </div>
        <div className="rq-stats"><span><b>{items.filter((item) => item.status === "PENDING").length}</b>À traiter</span></div>
      </header>
      {error && <div className="rq-flash" role="alert">{error}</div>}
      {notice && <div className="rq-flash" role="status">{notice}</div>}
      <section className="rq-panel">
        <div className="rq-list-title"><h2>Rendez-vous reçus</h2><button type="button" onClick={load}>Actualiser</button></div>
        {loading ? <p className="rq-muted">Chargement des demandes…</p> : (
          <div className="rq-scroll">
            <table>
              <thead><tr><th>Client</th><th>Créneau souhaité</th><th>Objet</th><th>Message</th><th>Statut</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.clientName}</b><small>{item.clientEmail}</small>{item.phone && <small>{item.phone}</small>}</td>
                    <td>{formatDate(item.preferredDate)}<small>{item.preferredTime}</small></td>
                    <td>{item.subject}</td>
                    <td>{item.message || "—"}</td>
                    <td><select aria-label={`Statut pour ${item.clientName}`} value={item.status} onChange={(event) => updateStatus(item, event.target.value)}>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select></td>
                  </tr>
                ))}
                {!items.length && <tr><td colSpan="5">Aucune demande de rendez-vous pour le moment.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
