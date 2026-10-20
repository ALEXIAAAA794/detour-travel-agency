import { useState } from "react";
import { Link } from "react-router-dom";
import { DESTINATIONS, FILTERS } from "../data.js";
import { Cta, Steps, usePageMeta } from "../components/Common.jsx";

const STEPS = [
  ["Dites-nous vos envies", "Destination, dates, budget : remplissez la demande de devis, c'est gratuit."],
  ["On compose votre séjour", "Un conseiller prépare transport, hébergement et activités, et vous répond sous 48 h ouvrées."],
  ["Vous partez l'esprit léger", "Tout est réservé, il ne vous reste qu'à profiter de votre voyage."],
];

function DestinationCard({ d, hidden }) {
  const vars = { "--g": d.g, "--img": `url(/img/${d.id}.jpg)` };
  if (d.scene) vars["--scene"] = d.scene;
  return (
    <article className="d-card" id={d.id} hidden={hidden}>
      <div className="d-photo" role="img" aria-label={d.name} style={vars}>
        <span className="tag">{d.tag}</span>
      </div>
      <div className="d-body">
        <span className="eyebrow">{d.eyebrow}</span>
        <h2>{d.title}</h2>
        <p>{d.desc}</p>
        <dl className="program">
          {d.program.map(([label, value, note]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}{note && <small>{note}</small>}</dd>
            </div>
          ))}
        </dl>
        <div className="d-foot">
          <div className="price-box"><small>À partir de</small><b>{d.price.toLocaleString("fr-FR")} €</b> <span>/ pers.*</span></div>
          <Link className="pill" to={`/contact?destination=${encodeURIComponent(d.name)}`}>{d.cta}</Link>
        </div>
      </div>
    </article>
  );
}

export default function Destinations() {
  usePageMeta("Nos destinations", "Nos idées de séjours insolites : week-ends en train à Nantes, Lyon, Lille et Barcelone, grands voyages en Grèce et au Pérou. Devis gratuit sous 48 h.");
  const [filter, setFilter] = useState("all");

  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="crumbs"><Link to="/">Accueil</Link> / Nos destinations</p>
          <h1>Nos destinations</h1>
          <p>Découvrez nos idées de séjours, du week-end en train aux grands voyages ! Tous nos séjours sont <strong>personnalisables</strong> : dites-nous ce qui vous fait envie et on s'occupe du reste.</p>
        </div>
      </section>

      <main id="contenu">
        <div className="wrap">
          <div className="filters" role="group" aria-label="Filtrer les destinations">
            {FILTERS.map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
            ))}
          </div>

          <div className="d-list">
            {DESTINATIONS.map((d) => (
              <DestinationCard key={d.id} d={d} hidden={filter !== "all" && !d.filters.includes(filter)} />
            ))}
          </div>

          <p className="note">* Prix indicatifs constatés, par personne, base 2 personnes. Nantes, Lyon, Lille et Barcelone : train A/R depuis Paris. Grèce et Pérou : vol A/R depuis Paris, durée et nombre de nuits précisés sur le devis. Les tarifs et disponibilités varient selon les dates et sont confirmés par votre conseiller.</p>

          <Steps title="Un voyage en trois étapes" items={STEPS} />
          <Cta title="Une autre idée en tête ?" text="Ces séjours sont des points de départ : on les adapte, ou on en crée un nouveau pour vous." />
        </div>
      </main>
    </>
  );
}
