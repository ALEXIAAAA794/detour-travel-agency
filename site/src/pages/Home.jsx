import { useState } from "react";
import { Link } from "react-router-dom";
import { DESTINATIONS, REVIEWS } from "../data.js";
import { Cta, Features, usePageMeta } from "../components/Common.jsx";


const FEATURES = [
  ["spark", "100 % sur mesure", "Chaque séjour est préparé par un conseiller selon vos envies, vos dates et votre budget."],
  ["headset", "Une équipe à l'écoute", "Du mardi au samedi, de 10h à 19h, nous répondons à vos questions avant, pendant et après le voyage."],
  ["leaf", "Sans voiture", "On privilégie le train pour voyager plus simplement et plus respectueusement."],
  ["shield", "Devis gratuit sous 48 h", "Réponse sous 48 h ouvrées, sans engagement, avec un interlocuteur dédié."],
];

/* Avis : défilement infini */
const HALF = [...REVIEWS, ...REVIEWS, ...REVIEWS];
const ALL = [...HALF, ...HALF];

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
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const list = DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(term) ||
      d.short.toLowerCase().includes(term)
  ).slice(0, 3);

  const onSearch = (e) => {
    e.preventDefault();
    document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>
            Des week-ends sur mesure,{" "}
            <em>sans prise de tête</em>
          </h1>
          <p className="lead">
            Découvrez la France autrement avec DÉTOUR : des séjours en train, sans voiture, préparés par nos conseillers pour créer des expériences uniques et inoubliables.
          </p>
          <div className="hero-cta">
            <Link className="pill" to="/contact">Button</Link>
            <Link className="pill ghost" to="/destinations">Voir nos destinations</Link>
          </div>


        </div>
      </section>

      <main id="contenu">
        <div className="wrap">
          <Features items={FEATURES} />

          <section id="destinations">
            <div className="section-head">
              <div>
                <span className="eyebrow">Nos coups de cœur</span>
                <h2>Des lieux qui font rêver</h2>
              </div>
              <Link to="/destinations">Voir toutes les destinations →</Link>
            </div>
            <div className="dest-grid">
              {list.map((d) => (
                <DestCard key={d.id} d={d} />
              ))}
            </div>
            {list.length === 0 && (
              <p className="empty">Aucune destination ne correspond à « {q} ».</p>
            )}
            <p className="note">
              * Prix indicatif par personne, base 2 personnes, 1 nuit + 1 activité. Train A/R depuis Paris. Sous réserve de disponibilité au moment de la réservation.
            </p>
          </section>
        </div>


      </main>
    </>
  );
}