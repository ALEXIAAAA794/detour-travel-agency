import { Link } from "react-router-dom";
import { Cta, Features, Steps, usePageMeta } from "../components/Common.jsx";

const VALUES = [
  ["spark", "100 % sur mesure", "Chaque séjour est préparé par un conseiller selon vos envies, vos dates et votre budget."],
  ["leaf", "Sans voiture", "On privilégie le train pour voyager plus simplement et plus respectueusement."],
  ["shield", "Des expériences originales", "Des hôtels de caractère, des ateliers et des jeux de piste que vous ne trouverez pas ailleurs."],
  ["headset", "Joignables pendant le séjour", "Vos conseillers restent disponibles tout au long de votre week-end."],
];

const FACTS = [
  ["2012", "Création de l'agence, à Nantes"],
  ["3", "Villes : Nantes, Lyon et Lille"],
  ["2", "Conseillers pour votre séjour"],
  ["48 h", "Pour recevoir votre devis (jours ouvrés)"],
];

const STEPS = [
  ["Vous nous contactez", <>Remplissez notre <Link to="/contact">formulaire de demande</Link> ou appelez-nous.</>],
  ["On vous propose un séjour", "Un conseiller vous recontacte et vous présente une proposition."],
  ["Vous validez", "On réserve tout pour vous : train, hébergement et activités."],
  ["Vous partez l'esprit léger", "Il ne vous reste qu'à profiter de votre week-end."],
];

export default function Agency() {
  usePageMeta("L'agence", "Créée en 2012 à Nantes, DÉTOUR compose des week-ends insolites et sur mesure en train. Découvrez l'équipe et notre façon de travailler.");

  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="crumbs"><Link to="/">Accueil</Link> / L'agence</p>
          <h1>Qui sommes-nous ?</h1>
          <p>Une petite équipe nantaise qui compose des week-ends insolites, de A à Z.</p>
        </div>
      </section>

      <main id="contenu">
        <div className="wrap">
          <section className="story">
            <div>
              <span className="eyebrow">Notre histoire</span>
              <p className="lead-quote">Le meilleur d'un voyage, c'est souvent le détour qu'on n'avait pas prévu.</p>
              <p>Créée en 2012 à Nantes, <strong>DÉTOUR</strong> est née de cette idée simple.</p>
              <p>Notre petite équipe sélectionne des prestations originales (hôtels de caractère, ateliers, jeux de piste…) et compose pour vous des week-ends uniques, adaptés à vos envies, à votre rythme et à votre budget.</p>
            </div>
            <div className="facts">
              {FACTS.map(([big, text]) => (
                <div className="fact" key={big}><b>{big}</b><span>{text}</span></div>
              ))}
            </div>
          </section>

          <section className="values">
            <span className="eyebrow">Notre façon de voyager</span>
            <h2 className="sec-title">Ce qui nous guide</h2>
            <Features items={VALUES} />
          </section>

          <section className="team-sec">
            <span className="eyebrow">Les personnes derrière DÉTOUR</span>
            <h2 className="sec-title">L'équipe</h2>
            <div className="team">
              <article className="member">
                <div className="avatar" aria-hidden="true">C</div>
                <h3>Camille</h3>
                <p className="role">Fondatrice &amp; responsable</p>
                <p>Toujours à la recherche de la prochaine pépite.</p>
              </article>
              <article className="member">
                <div className="avatar" aria-hidden="true">2</div>
                <h3>Nos conseillers</h3>
                <p className="role">Deux conseillers voyage</p>
                <p>Ils préparent votre séjour de A à Z et restent joignables pendant votre week-end.</p>
              </article>
            </div>
          </section>

          <Steps title="Un week-end en quatre étapes" items={STEPS} />
          <Cta title="Envie de nous rencontrer ?" text="L'agence est ouverte du mardi au samedi, de 10h à 19h, au 12 rue des Écluses à Nantes." />
        </div>
      </main>
    </>
  );
}
