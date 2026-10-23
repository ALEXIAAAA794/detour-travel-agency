
import { useState } from "react";

const sections = [
  {
    id: "overview",
    number: "01",
    title: "Vue d'ensemble",
    description: "Les informations essentielles de votre agence.",
  },
  {
    id: "reservations",
    number: "02",
    title: "Réservations",
    description: "Suivez les demandes et les confirmations de voyages.",
  },
  {
    id: "clients",
    number: "03",
    title: "Clients",
    description: "Retrouvez les voyageurs et leurs coordonnées.",
  },
  {
    id: "quotes",
    number: "04",
    title: "Demandes de devis",
    description: "Consultez les demandes à étudier.",
  },
  {
    id: "trips",
    number: "05",
    title: "Voyages",
    description: "Consultez les destinations proposées.",
  },
];

export default function Dashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("overview");

  const firstName =
    user?.firstName ||
    user?.name?.trim()?.split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "Gestionnaire";

  const activeItem = sections.find(
    (section) => section.id === activeSection
  );

  return (
    <main className="dashboard">
      <aside className="dashboard-sidebar">
        <a
          className="dashboard-brand"
          href="#overview"
          onClick={(event) => {
            event.preventDefault();
            setActiveSection("overview");
          }}
        >
          DÉT<span>O</span>UR
          <small>VOYAGES · ESPACE CONSEILLER</small>
        </a>

        <p className="sidebar-label">ESPACE DE TRAVAIL</p>

        <nav className="dashboard-nav" aria-label="Navigation principale">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`nav-item ${
                activeSection === section.id ? "active" : ""
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-number">{section.number}</span>
              <span>{section.title}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          Espace conseiller
          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
          >
            Se déconnecter ↗
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">DÉTOUR VOYAGES / ESPACE CONSEILLER</p>
            <h1>Bienvenue, {firstName}<span className="title-dot">.</span></h1>
            <p className="header-subtitle">
              Les bons voyages commencent par une attention aux détails.
            </p>
          </div>

          <div className="user-chip">
            <span className="user-avatar">
              {firstName.charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{firstName}</strong>
              <small>Conseiller voyage</small>
            </span>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">VOTRE AGENCE, EN UN CLIN D’ŒIL</p>
              <h2>{activeItem?.title}</h2>
              <p>{activeItem?.description}</p>
            </div>
            <span className="date-label">
              DÉTOUR · CONSEIL PERSONNALISÉ
            </span>
          </div>

          {activeSection === "overview" && (
            <>
              <section className="welcome-panel">
                <div className="welcome-copy">
                  <span className="panel-kicker">LE VOYAGE, AUTREMENT</span>
                  <h2>Un peu de détour.<br />Beaucoup d’attention.</h2>
                  <p>
                    Retrouvez vos clients, suivez les réservations
                    et préparez chaque voyage avec soin.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveSection("reservations")}
                  >
                    Voir les réservations <span>↗</span>
                  </button>
                </div>
                <div className="welcome-mark" aria-hidden="true">
                  <span>O</span>
                  <small>PRENEZ LE PAS<br />DE CÔTÉ.</small>
                </div>
              </section>

              <div className="overview-grid">
                {sections
                  .filter((section) => section.id !== "overview")
                  .map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className="dashboard-card"
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="card-number">{section.number}</span>
                      <span className="card-arrow">↗</span>
                      <h3>{section.title}</h3>
                      <p>{section.description}</p>
                      <span className="card-link">Ouvrir la rubrique</span>
                    </button>
                  ))}
              </div>
            </>
          )}

          {activeSection !== "overview" && (
            <section className="empty-section">
              <span className="empty-number">{activeItem?.number}</span>
              <h3>{activeItem?.title}</h3>
              <p>
                Cette rubrique est prête à accueillir ses fonctionnalités.
                La prochaine étape consiste à la connecter aux données
                de votre application.
              </p>
              <button
                className="secondary-button"
                onClick={() => setActiveSection("overview")}
              >
                ← Retour à la vue d’ensemble
              </button>
            </section>
          )}
        </div>

        <footer className="dashboard-footer">
          <span>DÉTOUR VOYAGES</span>
          <span>Prenez le pas de côté.</span>
        </footer>
      </section>
    </main>
  );
}
