import { useEffect, useMemo, useState } from "react";
import "./Clients.css";

const statusLabels = {
  PENDING: "En attente",
  NEEDS_INFO: "À préciser",
  IN_REVIEW: "À l’étude",
  PROPOSAL_SENT: "Proposition envoyée",
  ACCEPTED: "Acceptée",
  PAYMENT_PENDING: "Paiement en attente",
  PAID: "Payée",
  CONFIRMED: "Confirmée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

const bookingLabels = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
};

function formatDate(value) {
  if (!value) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function buildClients(requests, clients) {
  const grouped = new Map();

  for (const client of clients) {
    const email = normalizeEmail(client.email);
    if (!email) continue;

    grouped.set(email, {
      id: `client-${client.id}`,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email,
      phone: client.phone || "",
      requests: [],
      bookings: client.bookings || [],
      createdAt: client.createdAt,
      source: "client",
    });
  }

  for (const request of requests) {
    const email = normalizeEmail(request.clientEmail);
    if (!email) continue;

    const existing = grouped.get(email);

    if (existing) {
      existing.requests.push(request);
      if (!existing.phone && request.clientPhone) {
        existing.phone = request.clientPhone;
      }
      if (!existing.firstName && !existing.lastName) {
        const parts = (request.clientName || "").trim().split(/\s+/);
        existing.firstName = parts.shift() || "";
        existing.lastName = parts.join(" ");
      }
    } else {
      const parts = (request.clientName || "").trim().split(/\s+/);

      grouped.set(email, {
        id: `request-${request.id}`,
        firstName: parts.shift() || "",
        lastName: parts.join(" "),
        email,
        phone: request.clientPhone || "",
        requests: [request],
        bookings: [],
        createdAt: request.createdAt,
        source: "request",
      });
    }
  }

  return [...grouped.values()].sort((a, b) => {
    const nameA = `${a.lastName} ${a.firstName}`.trim();
    const nameB = `${b.lastName} ${b.firstName}`.trim();
    return nameA.localeCompare(nameB, "fr");
  });
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [clientsResponse, requestsResponse] = await Promise.all([
        fetch("/manager-api/clients", { credentials: "include" }),
        fetch("/manager-api/requests", { credentials: "include" }),
      ]);

      const [clientsData, requestsData] = await Promise.all(
        [clientsResponse, requestsResponse].map(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.error || data?.message || `Erreur API (${response.status})`);
          }
          return data;
        })
      );

      if (!Array.isArray(clientsData) || !Array.isArray(requestsData)) {
        throw new Error("Format de réponse API inattendu.");
      }
      setClients(clientsData);
      setRequests(requestsData);
    } catch (loadError) {
      setError(
        `${loadError instanceof Error ? loadError.message : "Erreur inconnue"}. Vérifiez la session gestionnaire et le serveur.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const people = useMemo(
    () => buildClients(requests, clients),
    [requests, clients]
  );

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");

    return people.filter((person) => {
      const matchesSearch = [
        person.firstName,
        person.lastName,
        person.email,
        person.phone,
        ...person.requests.map((request) => request.destination),
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(term);

      const latestRequest = person.requests[0];
      const matchesFilter =
        filter === "ALL" ||
        (filter === "REQUESTS" && person.requests.length > 0) ||
        (filter === "BOOKINGS" && person.bookings.length > 0) ||
        (filter === "CONFIRMED" &&
          (latestRequest?.status === "CONFIRMED" ||
            person.bookings.some((booking) => booking.status === "CONFIRMED")));

      return matchesSearch && matchesFilter;
    });
  }, [people, search, filter]);

  const selected =
    filteredPeople.find((person) => person.id === selectedId) ||
    filteredPeople[0] ||
    null;

  const totalRequests = people.reduce(
    (total, person) => total + person.requests.length,
    0
  );

  const totalBookings = people.reduce(
    (total, person) => total + person.bookings.length,
    0
  );

  return (
    <section className="cl-page">
      <header className="cl-header">
        <div>
          <p className="cl-kicker">RELATION VOYAGEURS</p>
          <h2>Vos clients<span>.</span></h2>
          <p>Chaque voyage commence par une rencontre.</p>
        </div>
        <button className="cl-refresh" type="button" onClick={loadData}>
          ↻ Actualiser
        </button>
      </header>

      <div className="cl-stats">
        <article>
          <span>VOYAGEURS IDENTIFIÉS</span>
          <strong>{people.length}</strong>
          <small>Adresses e-mail uniques</small>
        </article>
        <article>
          <span>DEMANDES DE VOYAGE</span>
          <strong>{totalRequests}</strong>
          <small>Dossiers enregistrés</small>
        </article>
        <article>
          <span>RÉSERVATIONS</span>
          <strong>{totalBookings}</strong>
          <small>Réservations enregistrées</small>
        </article>
      </div>

      <div className="cl-toolbar">
        <label className="cl-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un nom, un e-mail, une destination…"
            aria-label="Rechercher un voyageur"
          />
        </label>

        <div className="cl-filters" aria-label="Filtrer les voyageurs">
          {[
            ["ALL", "Tous"],
            ["REQUESTS", "Demandes"],
            ["BOOKINGS", "Réservations"],
            ["CONFIRMED", "Confirmés"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="cl-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadData}>Réessayer</button>
        </div>
      )}

      <div className="cl-layout">
        <section className="cl-panel cl-directory">
          <div className="cl-panel-heading">
            <div>
              <h3>Répertoire</h3>
              <p>{filteredPeople.length} voyageur(s)</p>
            </div>
          </div>

          {loading ? (
            <p className="cl-state">Chargement des voyageurs…</p>
          ) : filteredPeople.length === 0 ? (
            <div className="cl-state">
              <span>○</span>
              <strong>Aucun voyageur trouvé</strong>
              <p>Essayez une autre recherche ou un autre filtre.</p>
            </div>
          ) : (
            <div className="cl-list">
              {filteredPeople.map((person) => {
                const latestRequest = person.requests[0];
                const fullName =
                  `${person.firstName} ${person.lastName}`.trim() ||
                  "Voyageur sans nom";

                return (
                  <button
                    type="button"
                    key={person.id}
                    className={`cl-person ${selected?.id === person.id ? "selected" : ""}`}
                    onClick={() => setSelectedId(person.id)}
                  >
                    <span className="cl-avatar">
                      {(person.firstName || person.email).charAt(0).toUpperCase()}
                    </span>
                    <span className="cl-person-main">
                      <strong>{fullName}</strong>
                      <small>{person.email}</small>
                      <span className="cl-person-meta">
                        {person.requests.length} demande(s) · {person.bookings.length} réservation(s)
                      </span>
                    </span>
                    <span className="cl-chevron">›</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="cl-panel cl-detail">
          {!selected ? (
            <div className="cl-state">
              <span>○</span>
              <strong>Fiche voyageur</strong>
              <p>Sélectionnez une personne dans le répertoire.</p>
            </div>
          ) : (
            <>
              <div className="cl-detail-top">
                <span className="cl-avatar cl-avatar-large">
                  {(selected.firstName || selected.email).charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="cl-kicker">FICHE VOYAGEUR</p>
                  <h3>{`${selected.firstName} ${selected.lastName}`.trim() || "Voyageur sans nom"}</h3>
                  <span className="cl-since">
                    Présent(e) depuis le {formatDate(selected.createdAt)}
                  </span>
                </div>
              </div>

              <div className="cl-contact">
                <h4>Coordonnées</h4>
                <div>
                  <small>Adresse e-mail</small>
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </div>
                <div>
                  <small>Téléphone</small>
                  {selected.phone ? (
                    <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                  ) : (
                    <span>Non renseigné</span>
                  )}
                </div>
              </div>

              <div className="cl-activity">
                <div className="cl-activity-heading">
                  <h4>Demandes de voyage</h4>
                  <span>{selected.requests.length}</span>
                </div>

                {selected.requests.length === 0 ? (
                  <p className="cl-muted">Aucune demande de voyage enregistrée.</p>
                ) : (
                  selected.requests.map((request) => (
                    <article className="cl-trip-item" key={request.id}>
                      <div>
                        <strong>{request.destination}</strong>
                        <small>
                          {formatDate(request.startDate)} — {formatDate(request.endDate)}
                        </small>
                        <small>{request.travelers} voyageur(s)</small>
                      </div>
                      <span className={`cl-status status-${request.status.toLowerCase()}`}>
                        {statusLabels[request.status] || request.status}
                      </span>
                    </article>
                  ))
                )}
              </div>

              <div className="cl-activity">
                <div className="cl-activity-heading">
                  <h4>Réservations</h4>
                  <span>{selected.bookings.length}</span>
                </div>

                {selected.bookings.length === 0 ? (
                  <p className="cl-muted">Aucune réservation enregistrée.</p>
                ) : (
                  selected.bookings.map((booking) => (
                    <article className="cl-trip-item" key={booking.id}>
                      <div>
                        <strong>{booking.trip?.title || "Voyage"}</strong>
                        <small>
                          {booking.trip?.destination?.name || "Destination à préciser"}
                          {booking.trip?.destination?.country
                            ? `, ${booking.trip.destination.country}`
                            : ""}
                        </small>
                        <small>
                          {booking.seats} place(s) · {formatDate(booking.createdAt)}
                        </small>
                      </div>
                      <span className={`cl-status status-${booking.status.toLowerCase()}`}>
                        {bookingLabels[booking.status] || booking.status}
                      </span>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <p className="cl-footnote">
        Les fiches sont regroupées par adresse e-mail. Les demandes de voyage et les réservations restent gérées dans leurs rubriques respectives.
      </p>
    </section>
  );
}
