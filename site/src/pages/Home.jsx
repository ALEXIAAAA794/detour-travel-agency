import { useState } from "react";
import { Link } from "react-router-dom";
import { DESTINATIONS, REVIEWS } from "../data.js";
import { Cta, Features, usePageMeta } from "../components/Common.jsx";


const FEATURES = [
  ["spark", "Curiosité", "On cherche les adresses à côté, celles qu'un moteur ne trouve pas."],
  ["shield", "Exactitude", "Votre conseiller vérifie les prix, les places et les horaires avant de vous envoyer sa proposition."],
  ["headset", "Attention", "Une personne compose votre voyage, le signe et vous accompagne."],
];

/* Avis : défilement infini */
const HALF = [...REVIEWS, ...REVIEWS, ...REVIEWS];
const ALL = [...HALF, ...HALF];

function DestCard({ d }) {
  const vars = {
    "--g": d.g,
    "--img": d.scene || "none",
  };
  return (
    <article className="dest">
      <Link to={`/destinations#${d.id}`}>
        <div className="photo" role="img" aria-label={`Illustration de ${d.name}`} style={vars}>
          <span className="tag">{d.tag}</span>
        </div>
        <div className="body">
          <div>
            <h3>{d.name}</h3>
            <p>{d.short}</p>
            <p className="price">Tarif vérifié par un conseiller avant envoi</p>
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
  );

  const onSearch = (e) => {
    e.preventDefault();
    document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow">Votre agence de voyages insolites</span>
          <h1>
            Le voyage commence par le dét<span className="brand-leap">o</span>ur.
          </h1>
          <p className="lead">
            Votre conseiller compose un voyage inattendu, puis vérifie chaque prix, place et horaire avant de vous l'envoyer.
          </p>
          <div className="hero-cta">
            <Link className="pill" to="/pre-reservation">Parler de mon projet</Link>
            <Link className="pill ghost" to="/destinations">Explorer nos idées</Link>
          </div>

          <form className="search-card" role="search" onSubmit={onSearch}>
            <label className="field">
              Destination
              <input
                type="search"
                placeholder="Où aller ?"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label className="field">
              Dates
              <input type="text" placeholder="Quand ?" />
            </label>
            <label className="field">
              Voyageurs
              <input type="text" placeholder="1 voyageur" />
            </label>
            <button className="pill" type="submit">Rechercher</button>
          </form>
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
              Chaque tarif et disponibilité est vérifié par un conseiller avant d'être proposé.
            </p>
          </section>
        </div>

        <section className="assist">
          <div className="wrap">
            <div>
              <span className="eyebrow">Votre conseiller voyage</span>
              <h2>Dites-nous vos envies, nous créons votre prochaine escapade</h2>
              <p className="txt">
                Dites-nous simplement ce que vous aimez : une ville, une ambiance, une activité. Nos conseillers composent un itinéraire sur mesure, avec hébergements, activités et conseils pratiques.
              </p>
              <div className="actions">
                <Link className="pill" to="/contact">Écrire à un conseiller</Link>
                <a className="pill ghost" href="tel:+33240000000">02 40 00 00 00</a>
              </div>
              <div className="chips">
                <span>Idées de week-end</span>
                <span>Itinéraires sur mesure</span>
                <span>Conseils locaux</span>
                <span>Budget optimisé</span>
              </div>
            </div>
            <div className="chat" aria-hidden="true">
              <div className="bubble">
                Je cherche un week-end en train pour 2, entre enquête et gastronomie, avec un budget moyen.
              </div>
              <div className="reply">
                Parfait ! Voici une suggestion qui pourrait vous plaire :
                <div className="row">
                  <div className="thumb"></div>
                  <div>
                    <h4>Lyon</h4>
                    <ul>
                      <li>2 jours · 1 nuit</li>
                      <li>Enquête &amp; gastronomie</li>
                      <li>Tarif vérifié par votre conseiller avant envoi</li>
                    </ul>
                    <Link className="pill" to="/destinations#lyon" tabIndex={-1}>
                      Voir l'itinéraire
                    </Link>
                  </div>
                </div>
              </div>
              <div className="msg">
                Écrivez votre message… <i></i>
              </div>
            </div>
          </div>
        </section>

        <div className="wrap">
          <section className="reviews">
            <span className="eyebrow">Ils nous ont fait confiance</span>
            <h2 className="review-title">Ce que disent nos voyageurs</h2>
            <div className="scroller">
              <ul className="track">
                {ALL.map((r, i) => (
                  <li
                    className="review"
                    key={i}
                    aria-hidden={i >= REVIEWS.length ? "true" : undefined}
                  >
                    <blockquote style={{ margin: 0 }}>
                      <p>«&nbsp;{r.quote}&nbsp;»</p>
                      <cite>
                        {r.name} · {r.title}
                      </cite>
                    </blockquote>
                  </li>
                ))}
              </ul>
            </div>
            <p className="client-small">Avis présentés à titre d'exemples de démonstration, non issus de clients vérifiés.</p>
          </section>

          <Cta
            title="Prêt à partir autrement ?"
            text="Racontez-nous votre week-end idéal, on s'occupe du reste."
          />
        </div>
      </main>
    </>
  );
}
