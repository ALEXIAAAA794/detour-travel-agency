import Reservations from "./Reservations.jsx";
import { useState } from "react";
import Requests from "./Requests.jsx";
const sections = [
  {
    id: "overview",
    title: "Vue d'ensemble",
    description: "Les informations essentielles de votre agence.",
  },
  {
    id: "reservations",
    title: "RÃ©servations",
    description: "Suivez les demandes et les confirmations de voyages.",
  },
  {
    id: "clients",
    title: "Clients",
    description: "Retrouvez les voyageurs et leurs coordonnÃ©es.",
  },
  {
    id: "quotes",
    title: "Demandes de devis",
    description: "Consultez les demandes Ã  Ã©tudier.",
  },
  {
    id: "trips",
    title: "Voyages",
    description: "Consultez les destinations proposÃ©es.",
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
        <a className="dashboard-brand" href="/" aria-label="DÃ©tour Voyages">
  <img
    src="/brand/logo-officiel.png"
    alt="DÃ©tour Voyages"
    className="dashboard-logo"
  />
  <small>VOYAGES Â· ESPACE CONSEILLER</small>
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
              <span>{section.title}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          Espace gestionnaire
          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
          >
            Se dÃ©connecter â†—
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">DÃ‰TOUR VOYAGES / ESPACE CONSEILLER</p>
            <h1>Bienvenue, {firstName}<span className="title-dot">.</span></h1>
            <p className="header-subtitle">
              Les bons voyages commencent par une attention aux dÃ©tails.
            </p>
          </div>

          <div className="user-chip">
            <span className="user-avatar">
              {firstName.charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{firstName}</strong>
              <small>Gestionnaire</small>
            </span>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">VOTRE AGENCE, EN UN CLIN Dâ€™Å’IL</p>
              <h2>{activeItem?.title}</h2>
              <p>{activeItem?.description}</p>
            </div>
            <span className="date-label">
              DÃ‰TOUR Â· CONSEIL PERSONNALISÃ‰
            </span>
          </div>

          {activeSection === "overview" && (
            <>
              <section className="welcome-panel">
                <div className="welcome-copy">
                  <span className="panel-kicker">LE VOYAGE, AUTREMENT</span>
                  <h2>Un peu de dÃ©tour.<br />Beaucoup dâ€™attention.</h2>
                  <p>
                    Retrouvez vos clients, suivez les rÃ©servations
                    et prÃ©parez chaque voyage avec soin.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveSection("reservations")}
                  >
                    Voir les rÃ©servations <span>â†—</span>
                  </button>
                </div>
                <div className="welcome-mark" aria-hidden="true">
                  <span>O</span>
                  <small>PRENEZ LE PAS<br />DE CÃ”TÃ‰.</small>
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
                      <span className="card-arrow">â†—</span>
                      <h3>{section.title}</h3>
                      <p>{section.description}</p>
                      <span className="card-link">Ouvrir la rubrique</span>
                    </button>
                  ))}
              </div>
            </>
          )}

          {activeSection === "reservations" && <Reservations />}
          {activeSection === "quotes" && <Requests />}

{activeSection !== "overview" && activeSection !== "reservations" && activeSection !== "quotes" && (
  <section className="empty-section">
    <h3>{activeItem?.title}</h3>
    <p>
      {activeSection === "clients" &&
        "Retrouvez les informations des voyageurs et leurs coordonnÃ©es."}
      {activeSection === "quotes" &&
        "Consultez les demandes reÃ§ues et prÃ©parez vos propositions de voyage."}
      {activeSection === "trips" &&
        "Consultez les destinations et les informations sur les sÃ©jours proposÃ©s."}
    </p>
    <button
      type="button"
      className="secondary-button"
      onClick={() => setActiveSection("overview")}
    >
      Retour au tableau de bord
    </button>
  </section>
)}
        </div>

        <footer className="dashboard-footer">
          <span>DÃ‰TOUR VOYAGES</span>
          <span>Prenez le pas de cÃ´tÃ©.</span>
        </footer>
      </section>
    </main>
  );
}

