import { Link } from "react-router-dom";
import { DESTINATIONS } from "../data.js";
import { usePageMeta } from "../components/Common.jsx";

function DestCard({ d }) {

  const style = {
    "--g": d.g,
    "--img": `url(/img/${d.id}.jpg)`,
  };
  if (d.scene) {
    style["--scene"] = d.scene;
  }

  return (
    <article className="dest">
      <Link to={`/destinations#${d.id}`}>
        <div
          className="photo"
          role="img"
          aria-label={`Photo de ${d.name}`}
          style={style}
        >
          <span className="tag">{d.tag}</span>
        </div>
        <div className="body">
          <div>
            <h3>{d.name}</h3>
            <p>{d.short}</p>
            <p className="price">
              À partir de {d.price.toLocaleString("fr-FR")} €*
            </p>
          </div>
          <span className="go" aria-hidden="true">→</span>
        </div>
      </Link>
    </article>
  );
}

export default function Home() {
  usePageMeta(
    "Accueil",
    "DÉTOUR, agence de voyages insolites : week-ends sur mesure en train à Nantes, Lyon, Lille. Devis gratuit !"
  );
  const list = DESTINATIONS.slice(0, 3);

  return (
    <>
      <section className="hero home-hero">
        <div className="wrap">
          <h1>
            Des week-ends sur mesure,{" "}
            <em>sans prise de tête</em>
          </h1>
          <p className="lead">
            Découvrez la France autrement avec DÉTOUR : des séjours en train, sans voiture, préparés par nos conseillers pour créer des expériences uniques et inoubliables.
          </p>
          <div className="hero-cta">
            <Link className="pill" to="/assistant">Parlons de votre projet</Link>
            <Link className="pill ghost" to="/destinations">Voir nos destinations</Link>
          </div>
        </div>
      </section>

      <main className="home-main" id="contenu">
        <div className="wrap">
          <section id="destinations">
            <div className="section-head home-destination-head">
              <div>
                <h2>Des lieux qui font rêver</h2>
              </div>
              <Link to="/destinations">Voir toutes les destinations →</Link>
            </div>
            <div className="dest-grid">
              {list.map((d) => (
                <DestCard key={d.id} d={d} />
              ))}
            </div>
          </section>
        </div>

        <section className="home-strengths wrap" aria-labelledby="strengths-title">
          <span className="eyebrow">L’esprit DÉTOUR</span>
          <h2 id="strengths-title">Un voyage pensé avec vous, vérifié par une personne</h2>
          <div className="home-strength-grid">
            <article><h3>Du sur-mesure</h3><p>Vos envies, votre rythme et votre budget guident chaque proposition.</p></article>
            <article><h3>Un conseiller dédié</h3><p>Une personne vérifie les prix, les horaires et les disponibilités avant confirmation.</p></article>
            <article><h3>Le train d’abord</h3><p>Des escapades conçues pour découvrir autrement, avec moins de trajets inutiles.</p></article>
          </div>
        </section>
      </main>

      <section className="cta home-booking-cta">
        <div className="wrap">
          <h2>Votre prochaine escapade commence par une idée.</h2>
          <p>Connectez-vous à votre espace client pour demander un voyage, suivre votre dossier et prendre rendez-vous.</p>
          <Link className="pill" to="/espace">Accéder à mon espace client</Link>
        </div>
      </section>
    </>
  );
}
