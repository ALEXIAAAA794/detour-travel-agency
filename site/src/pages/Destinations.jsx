import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DESTINATIONS, FILTERS } from "../data.js";
import { Cta, Steps, usePageMeta } from "../components/Common.jsx";

const STEPS = [
  [
    "Dites-nous vos envies",
    "Destination, dates, budget : remplissez la demande de devis, c’est gratuit.",
  ],
  [
    "On compose votre séjour",
    "Un conseiller prépare transport, hébergement et activités, et vous répond sous 48 h ouvrées.",
  ],
  [
    "Vous partez l’esprit léger",
    "Tout est réservé, il ne vous reste qu’à profiter de votre voyage.",
  ],
];

const euro = (n) => n.toLocaleString("fr-FR") + " €";

function DestinationCard({ d, reverse }) {
  const vars = { "--g": d.g, "--img": `url(/img/${d.id}.jpg)` };
  if (d.scene) vars["--scene"] = d.scene;

  return (
    <article className={"d-card" + (reverse ? " reverse" : "")} id={d.id}>
      <div className="d-photo" role="img" aria-label={d.name} style={vars}>
        <span className="tag">{d.tag}</span>
        <span className="d-place" aria-hidden="true">
          {d.name}
        </span>
      </div>

      <div className="d-body">
        <span className="eyebrow">{d.eyebrow}</span>
        <h2>{d.title}</h2>
        <p className="d-desc">{d.desc}</p>

        <dl className="program">
          {d.program.map(([label, value, note]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value}
                {note && <small>{note}</small>}
              </dd>
            </div>
          ))}
        </dl>

        <div className="d-foot">
          <div className="price-box">
            <small>À partir de</small>
            <b>{euro(d.price)}</b>
            <span>par personne</span>
          </div>
          <Link
            className="pill"
            to="/pre-reservation"
          >
            {d.cta}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Destinations() {
  usePageMeta(
    "Nos destinations",
    "Nos idées de séjours insolites : week-ends en train à Nantes, Lyon, Lille et Barcelone, grands voyages en Grèce et au Pérou. Devis gratuit sous 48 h."
  );

  const [filter, setFilter] = useState("all");
  const [touched, setTouched] = useState(false);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map(([key]) => [
          key,
          key === "all"
            ? DESTINATIONS.length
            : DESTINATIONS.filter((d) => d.filters.includes(key)).length,
        ])
      ),
    []
  );

  const list =
    filter === "all"
      ? DESTINATIONS
      : DESTINATIONS.filter((d) => d.filters.includes(filter));

  const choose = (key) => {
    setFilter(key);
    setTouched(true);
  };

  return (
    <>
      <section className="page-head">
        <div className="wrap">

          <h1>
            Nos destinati<span className="o-jump">o</span>ns
          </h1>
          <p>
            Du week-end en train aux grands voyages : des séjours pensés pour
            sortir des sentiers battus. Tous sont <strong>personnalisables</strong>,
            dites-nous ce qui vous fait envie, on s’occupe du reste.
          </p>
          <ul className="head-facts">
            <li>Devis gratuit</li>
            <li>Réponse sous 48 h ouvrées</li>
            <li>Séjours sur mesure</li>
          </ul>
        </div>
      </section>

      <div className="filter-bar">
        <div className="wrap filter-inner">
          <div
            className="filters"
            role="group"
            aria-label="Filtrer les destinations"
          >
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={filter === key ? "is-active" : undefined}
                aria-pressed={filter === key}
                onClick={() => choose(key)}
              >
                {label}
                <i>{counts[key]}</i>
              </button>
            ))}
          </div>
          <p className="filter-count" aria-live="polite">
            {list.length} séjour{list.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <main id="contenu">
        <div className="wrap">
          <div
            className={"d-list" + (touched ? " swap" : "")}
            key={filter}
          >
            {list.map((d, i) => (
              <DestinationCard key={d.id} d={d} reverse={i % 2 === 1} />
            ))}
          </div>

          {list.length === 0 && (
            <div className="empty">
              <p>Aucun séjour ne correspond à ce filtre.</p>
              <button
                type="button"
                className="pill ghost"
                onClick={() => choose("all")}
              >
                Voir tous les séjours
              </button>
            </div>
          )}

          <aside className="d-note">
            <strong>Bon à savoir</strong>
            <p>
              Prix indicatifs constatés, par personne, base 2 personnes.
              Nantes, Lyon, Lille et Barcelone : train A/R depuis Paris.
              Grèce et Pérou : vol A/R depuis Paris. Les tarifs sont confirmés
              par votre conseiller.
            </p>
          </aside>

          <Steps title="Un voyage en trois étapes" items={STEPS} />
          <Cta
            title="Une autre idée en tête ?"
            text="Ces séjours sont des points de départ : on les adapte, ou on en crée un nouveau pour vous."
          />
        </div>
      </main>
    </>
  );
}
