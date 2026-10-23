
import { usePageMeta } from "../components/Common.jsx";

const legalSections = [
  {
    number: "01",
    title: "Éditeur du site",
    content: (
      <>
        <p>
          Le site <strong>detour-voyages.fr</strong> est édité sous la marque
          DÉTOUR Voyages.
        </p>
        <div className="legal-info-card">
          <span className="legal-label">Éditeur</span>
          <h3>DÉTOUR Voyages</h3>
          <div className="legal-divider" />
          <span className="legal-label">Contact</span>
          <p>
            <a href="mailto:contact@detour-voyages.fr">
              contact@detour-voyages.fr
            </a>
          </p>
        </div>
        <p>
          Directeur de la publication : Sion Genders<br />
          SIRET : 927 647 453 00012<br />
          Capital social : 10 000 €
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "Hébergement",
    content: (
      <>
        <div className="legal-info-card">
          <span className="legal-label">Hébergeur</span>
          <h3>Microsoft Azure</h3>
        </div>
      </>
    ),
  },
  {
    number: "03",
    title: "Propriété intellectuelle",
    content: (
      <>
        <p>
          L’ensemble des contenus présents sur le site (textes, images,
          logos, graphismes, etc.) est la propriété de DÉTOUR Voyages ou
          de ses partenaires, sauf mention contraire.
        </p>
        <p>
          Toute reproduction, représentation, modification ou exploitation,
          totale ou partielle, sans autorisation préalable écrite, est
          interdite, sous réserve des exceptions prévues par la loi.
        </p>
      </>
    ),
  },
  {
    number: "04",
    title: "Données personnelles",
    content: (
      <>
        <p>
          Les informations collectées via les formulaires du site
          (demande de devis, contact, inscription) sont utilisées pour
          traiter vos demandes et assurer le suivi de nos échanges.
        </p>
        <p>
          Conformément au RGPD et à la loi Informatique et Libertés,
          vous disposez, selon les conditions applicables, de droits
          d’accès, de rectification, d’effacement, de limitation,
          d’opposition et de portabilité de vos données.
        </p>
        <p>
          Pour exercer vos droits ou obtenir des informations sur le
          traitement de vos données, contactez :
          {" "}
          <a href="mailto:contact@detour-voyages.fr">
            contact@detour-voyages.fr
          </a>.
        </p>
      </>
    ),
  },
  {
    number: "05",
    title: "Cookies",
    content: (
      <>
        <p>
          Le site peut utiliser des cookies techniques nécessaires à son
          fonctionnement. Les éventuels cookies non essentiels sont
          soumis aux règles de consentement applicables.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "Limitation de responsabilité",
    content: (
      <>
        <p>
          DÉTOUR Voyages s’efforce de fournir des informations exactes
          et à jour. Toutefois, des erreurs ou omissions peuvent survenir.
          Les informations publiées sont susceptibles d’être modifiées.
        </p>
        <p>
          L’utilisateur est invité à vérifier les informations pertinentes
          avant toute décision prise sur la base du contenu du site.
        </p>
      </>
    ),
  },
  {
    number: "07",
    title: "Droit applicable",
    content: (
      <>
        <p>
          Les présentes mentions légales sont soumises au droit français.
          En cas de litige, les règles de compétence juridictionnelle
          applicables détermineront la juridiction compétente.
        </p>
      </>
    ),
  },
];

export default function MentionsLegales() {
  usePageMeta(
    "Mentions légales",
    "Mentions légales de DÉTOUR Voyages : éditeur, hébergement, propriété intellectuelle et données personnelles."
  );

  return (
    <main className="legal-page" id="contenu">
      <header className="legal-hero">
        <div className="wrap legal-hero-inner">
          <nav className="legal-breadcrumb" aria-label="Fil d’Ariane">
            <a href="/">Accueil</a>
            <span>/</span>
            <span>Mentions légales</span>
          </nav>

          <span className="eyebrow">DÉTOUR VOYAGES · INFORMATIONS</span>

          <h1>
            Les mentions<br />
            <span>légales.</span>
          </h1>

          <p className="legal-intro">
            Transparence, confiance et clarté. Retrouvez ici les
            informations relatives à notre site et à son fonctionnement.
          </p>

          <div className="legal-hero-bottom">
            <span>INFORMATIONS OFFICIELLES</span>
            <span className="legal-hero-mark">D<span>É</span>TOUR.</span>
          </div>
        </div>
      </header>

      <div className="wrap legal-layout">
        <aside className="legal-sidebar">
          <span className="legal-label">SUR CETTE PAGE</span>
          <nav aria-label="Sections des mentions légales">
            {legalSections.map((section) => (
              <a key={section.number} href={`#legal-${section.number}`}>
                <span>{section.number}</span>
                {section.title}
              </a>
            ))}
          </nav>

          <div className="legal-contact">
            <span className="legal-contact-dot" />
            <p>Une question concernant nos informations légales ?</p>
            <a href="mailto:contact@detour-voyages.fr">
              Nous contacter <span>↗</span>
            </a>
          </div>
        </aside>

        <div className="legal-content">
          <div className="legal-content-heading">
            <span className="eyebrow">CADRE JURIDIQUE</span>
            <p>
              Les informations présentées ci-dessous concernent
              l’utilisation du site DÉTOUR Voyages.
            </p>
          </div>

          {legalSections.map((section) => (
            <section
              className="legal-section"
              id={`legal-${section.number}`}
              key={section.number}
            >
              <div className="legal-section-number">{section.number}</div>
              <div className="legal-section-body">
                <h2>{section.title}</h2>
                <div className="legal-section-text">{section.content}</div>
              </div>
            </section>
          ))}

          <div className="legal-endnote">
            <span className="legal-endnote-symbol">D.</span>
            <div>
              <strong>DÉTOUR Voyages</strong>
              <p>Voyager autrement commence par la confiance.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
