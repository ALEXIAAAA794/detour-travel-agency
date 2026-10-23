import { useCallback, useEffect, useMemo, useState } from "react";
import "./Reservations.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const statusLabels = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
};

const money = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value ?? 0));

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
};

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/reservations`);
      if (!response.ok) {
        throw new Error(`Impossible de charger les réservations (HTTP ${response.status}).`);
      }

      const data = await response.json();
      setReservations(Array.isArray(data) ? data : data.reservations ?? []);
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const client = reservation.client || {};
      const trip = reservation.trip || {};
      const destination = trip.destination || {};
      const haystack = [
        client.firstName,
        client.lastName,
        client.email,
        trip.title,
        destination.name,
        destination.country,
        reservation.id,
      ].join(" ").toLowerCase();

      return (
        (filter === "ALL" || reservation.status === filter) &&
        haystack.includes(query)
      );
    });
  }, [reservations, search, filter]);

  async function changeStatus(id, status) {
    setUpdatingId(id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/reservations/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Modification impossible (HTTP ${response.status}).`);
      }

      const updated = await response.json();
      setReservations((current) =>
        current.map((item) => item.id === id ? updated : item)
      );
    } catch (err) {
      setError(err.message || "Impossible de modifier le statut.");
      await loadReservations();
    } finally {
      setUpdatingId(null);
    }
  }

  const pendingCount = reservations.filter((r) => r.status === "PENDING").length;
  const confirmedCount = reservations.filter((r) => r.status === "CONFIRMED").length;
  const totalAmount = reservations
    .filter((r) => r.status !== "CANCELLED")
    .reduce((sum, r) => sum + Number(r.total ?? 0), 0);

  return (
    <section className="reservations-page">
      <div className="reservation-stats">
        <article className="reservation-stat">
          <span>Dossiers au total</span>
          <strong>{reservations.length}</strong>
          <small>Toutes les réservations</small>
        </article>
        <article className="reservation-stat">
          <span>À traiter</span>
          <strong>{pendingCount}</strong>
          <small>En attente de confirmation</small>
        </article>
        <article className="reservation-stat">
          <span>Confirmées</span>
          <strong>{confirmedCount}</strong>
          <small>Voyages validés</small>
        </article>
        <article className="reservation-stat">
          <span>Montant des dossiers actifs</span>
          <strong>{money(totalAmount)}</strong>
          <small>Hors réservations annulées</small>
        </article>
      </div>

      <div className="reservations-toolbar">
        <label className="reservation-search">
          <span>Rechercher</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom, e-mail, voyage…"
          />
        </label>

        <label className="reservation-filter">
          <span>Statut</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="CONFIRMED">Confirmées</option>
            <option value="CANCELLED">Annulées</option>
          </select>
        </label>

        <button
          type="button"
          className="reservation-refresh"
          onClick={loadReservations}
          disabled={loading}
        >
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </div>

      {error && (
        <div className="reservation-error" role="alert">
          {error}
        </div>
      )}

      <div className="reservations-table-wrap">
        <table className="reservations-table">
          <thead>
            <tr>
              <th>Voyageur</th>
              <th>Voyage</th>
              <th>Créée le</th>
              <th>Places</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Gestion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="reservation-empty">Chargement des réservations…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="reservation-empty">
                  {error ? "Les réservations ne sont pas disponibles pour le moment." : "Aucune réservation ne correspond à votre recherche."}
                </td>
              </tr>
            ) : filtered.map((reservation) => {
              const client = reservation.client || {};
              const trip = reservation.trip || {};
              const destination = trip.destination || {};

              return (
                <tr key={reservation.id}>
                  <td>
                    <strong>{client.firstName} {client.lastName}</strong>
                    <small>{client.email || "E-mail non renseigné"}</small>
                  </td>
                  <td>
                    <strong>{trip.title || "Voyage"}</strong>
                    <small>
                      {[destination.name, destination.country].filter(Boolean).join(", ") || "Destination non renseignée"}
                    </small>
                    <small>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</small>
                  </td>
                  <td>{formatDate(reservation.createdAt)}</td>
                  <td>{reservation.seats}</td>
                  <td className="reservation-amount">{money(reservation.total)}</td>
                  <td>
                    <span className={`reservation-status ${reservation.status?.toLowerCase()}`}>
                      {statusLabels[reservation.status] || reservation.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="reservation-status-select"
                      aria-label={`Modifier le statut de ${client.firstName || "la réservation"}`}
                      value={reservation.status}
                      disabled={updatingId === reservation.id}
                      onChange={(event) => changeStatus(reservation.id, event.target.value)}
                    >
                      <option value="PENDING">En attente</option>
                      <option value="CONFIRMED">Confirmer</option>
                      <option value="CANCELLED">Annuler</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="reservations-footnote">
        Les informations affichées proviennent des dossiers enregistrés dans la base de données.
      </p>
    </section>
  );
}
