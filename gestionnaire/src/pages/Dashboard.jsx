
export default function Dashboard({ user, onLogout }) {
  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">DETOUR · ESPACE GESTIONNAIRE</p>
          <h1>Bienvenue, {user?.name || "Gestionnaire"}</h1>
          <p>Voici votre espace de gestion.</p>
        </div>

        <button className="logout-button" onClick={onLogout}>
          Se déconnecter
        </button>
      </header>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span>01</span>
          <h2>Clients</h2>
          <p>Consulter et gérer les informations des clients.</p>
        </article>

        <article className="dashboard-card">
          <span>02</span>
          <h2>Demandes de devis</h2>
          <p>Suivre les demandes reçues.</p>
        </article>

        <article className="dashboard-card">
          <span>03</span>
          <h2>Réservations</h2>
          <p>Consulter et mettre à jour les réservations.</p>
        </article>

        <article className="dashboard-card">
          <span>04</span>
          <h2>Voyages</h2>
          <p>Gérer les voyages proposés aux clients.</p>
        </article>
      </section>
    </main>
  );
}
