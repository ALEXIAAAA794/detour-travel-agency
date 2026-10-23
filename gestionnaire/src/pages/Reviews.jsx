import { useCallback, useEffect, useState } from "react";
import "./requests.css";

const STATUS_LABELS = {
  PENDING: "À modérer",
  APPROVED: "Publié",
  REJECTED: "Refusé",
};

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(async () => {
    const response = await fetch("/manager-api/reviews");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Erreur API (${response.status})`);
    if (!Array.isArray(data.reviews)) throw new Error("Format de réponse inattendu.");
    return data.reviews;
  }, []);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      setReviews(await fetchReviews());
      setError("");
    } catch (loadError) {
      setError(`${loadError.message} Vérifiez que l’API et le service gestionnaire tournent.`);
    } finally {
      setLoading(false);
    }
  }, [fetchReviews]);

  useEffect(() => {
    let active = true;
    fetchReviews()
      .then((data) => {
        if (active) {
          setReviews(data);
          setError("");
        }
      })
      .catch((loadError) => {
        if (active) setError(`${loadError.message} Vérifiez que l’API et le service gestionnaire tournent.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchReviews]);

  async function updateStatus(review, status) {
    setError("");
    try {
      const response = await fetch(`/manager-api/reviews/${review.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Erreur API (${response.status})`);
      setReviews((current) => current.map((item) => item.id === review.id ? data.review : item));
    } catch (updateError) {
      setError(`Le statut de l’avis n’a pas été enregistré : ${updateError.message}`);
    }
  }

  return (
    <section className="rq">
      <header className="rq-head">
        <div>
          <p className="rq-kicker">DÉTOUR VOYAGES · ESPACE CONSEILLER</p>
          <h1>Avis voyageurs</h1>
          <p>Relisez les avis envoyés avant leur publication sur le site.</p>
        </div>
        <div className="rq-stats"><span><b>{reviews.filter((review) => review.status === "PENDING").length}</b>À modérer</span></div>
      </header>
      {error && <div className="rq-flash" role="alert">{error}</div>}
      <section className="rq-panel">
        <div className="rq-list-title"><h2>Avis reçus</h2><button type="button" onClick={loadReviews}>Actualiser</button></div>
        {loading ? <p className="rq-muted">Chargement des avis…</p> : (
          <div className="rq-scroll">
            <table>
              <thead><tr><th>Client</th><th>Note</th><th>Avis</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td><b>{review.clientName}</b><small>{review.clientEmail}</small><small>{review.destination || "Destination non précisée"}</small></td>
                    <td>{review.rating}/5</td>
                    <td>{review.content}</td>
                    <td>{STATUS_LABELS[review.status] || review.status}</td>
                    <td>
                      <div className="rq-actions">
                        <button type="button" className="primary" disabled={review.status === "APPROVED"} onClick={() => updateStatus(review, "APPROVED")}>Publier</button>
                        <button type="button" className="danger" disabled={review.status === "REJECTED"} onClick={() => updateStatus(review, "REJECTED")}>Refuser</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!reviews.length && <tr><td colSpan="5">Aucun avis reçu pour le moment.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
