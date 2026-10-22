import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../components/Common.jsx";

const DESTINATION_OPTIONS = [
  "Je ne sais pas encore",
  "Nantes",
  "Lyon",
  "Lille",
  "Barcelone",
  "Grèce",
  "Pérou",
  "Autre",
];
const BUDGETS = [
  "Moins de 300 €",
  "300 à 500 €",
  "500 à 800 €",
  "Plus de 800 €",
];

function Field({ id, label, required, error, invalid, full, children }) {
  return (
    <div className={"f" + (full ? " full" : "") + (invalid ? " invalid" : "")}>
      <label htmlFor={id}>
        {label}{" "}
        {required && (
          <span className="req" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {invalid && error && (
        <span className="err" id={`${id}-err`}>{error}</span>
      )}
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const input = e.currentTarget.elements["nl-email"];
    if (email.trim() && input.checkValidity()) {
      setMsg("Merci, vous êtes inscrit(e) à la newsletter.");
      setEmail("");
    } else {
      setMsg("Indiquez une adresse e-mail valide.");
      input.focus();
    }
  };

  return (
    <div className="side-card">
      <h3>Newsletter</h3>
      <p>Idées de week-ends et adresses qu’un moteur ne trouve pas.</p>
      <form className="nl" noValidate onSubmit={submit}>
        <label className="vh" htmlFor="nl-email">
          Votre e-mail
        </label>
        <input
          id="nl-email"
          name="nl-email"
          type="email"
          placeholder="Votre e-mail"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="pill ghost">
          Je m’inscris
        </button>
      </form>
      <p className="nl-msg" role="status">
        {msg}
      </p>
    </div>
  );
}

function Cookies() {
  const [hidden, setHidden] = useState(() => {
    try {
      return !!localStorage.getItem("detour-cookies");
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const accept = () => {
    setHidden(true);
    try {
      localStorage.setItem("detour-cookies", "1");
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="cookies" role="dialog" aria-label="Cookies">
      <p>Ce site utilise des cookies pour vous proposer des services adaptés.</p>
      <button type="button" className="pill" onClick={accept}>
        Accepter
      </button>
    </div>
  );
}

export default function Contact() {
  usePageMeta(
    "Devis gratuit",
    "Demandez votre devis gratuit. Un conseiller DÉTOUR vous répond sous 48 h ouvrées."
  );

  const [params] = useSearchParams();
  const wanted = params.get("destination");
  const defaultDestination = DESTINATION_OPTIONS.includes(wanted)
    ? wanted
    : DESTINATION_OPTIONS[0];

  const [invalid, setInvalid] = useState({});
  const [done, setDone] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const doneRef = useRef(null);

  useEffect(() => {
    if (done) {
      doneRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [done]);

  const today = new Date().toISOString().slice(0, 10);

  const check = (el) => {
    const ok = el.value.trim() !== "" && el.checkValidity();
    setInvalid((prev) => ({ ...prev, [el.name]: !ok }));
    return ok;
  };

  const req = (name) => ({
    id: name,
    name,
    required: true,
    "aria-invalid": !!invalid[name],
    onBlur: (e) => check(e.target),
    onChange: (e) => {
      if (invalid[name]) check(e.target);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    let bad = null;
    form.querySelectorAll("[required]").forEach((el) => {
      if (!check(el) && !bad) bad = el;
    });
    if (bad) {
      bad.focus();
      return;
    }

    setSentTo(form.elements.email.value);
    setDone(true);
  };

  return (
    <>
      <main id="contenu">
        <section className="page-head">
          <div className="wrap">
            <p className="crumbs">
              <Link to="/">Accueil</Link> / Devis gratuit
            </p>
            <h1>
              Demandez v<span className="o-jump">o</span>tre devis
            </h1>
            <p>
              Dites-nous ce qui vous ferait plaisir. Un conseiller DÉTOUR vous
              répond <strong>sous 48 h ouvrées</strong> avec une proposition
              personnalisée. Les champs marqués d’un{" "}
              <span style={{ color: "var(--brique)" }} aria-hidden="true">
                *
              </span>{" "}
              sont obligatoires.
            </p>
          </div>
        </section>

        <div className="wrap quote-layout">
          <section
            className="form-card"
            aria-label="Formulaire de demande de devis"
          >
            <form
              noValidate
              onSubmit={submit}
              style={done ? { display: "none" } : undefined}
            >
              <div className="f-grid">
                <Field
                  id="nom"
                  label="Nom et prénom"
                  required
                  full
                  invalid={invalid.nom}
                  error="Indiquez votre nom et prénom."
                >
                  <input type="text" autoComplete="name" {...req("nom")} />
                </Field>

                <Field
                  id="email"
                  label="E-mail"
                  required
                  invalid={invalid.email}
                  error="Indiquez une adresse e-mail valide."
                >
                  <input type="email" autoComplete="email" {...req("email")} />
                </Field>

                <Field id="telephone" label="Téléphone">
                  <input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="06 00 00 00 00"
                  />
                </Field>

                <Field id="depart" label="Ville de départ">
                  <input
                    id="depart"
                    name="depart"
                    type="text"
                    defaultValue="Paris"
                    autoComplete="address-level2"
                  />
                </Field>

                <Field id="destination" label="Destination souhaitée">
                  <select
                    id="destination"
                    name="destination"
                    defaultValue={defaultDestination}
                  >
                    {DESTINATION_OPTIONS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  id="date"
                  label="Date de départ"
                  required
                  invalid={invalid.date}
                  error="Choisissez une date de départ à venir."
                >
                  <input type="date" min={today} {...req("date")} />
                </Field>

                <Field
                  id="voyageurs"
                  label="Nombre de voyageurs"
                  required
                  invalid={invalid.voyageurs}
                  error="Indiquez au moins 1 voyageur."
                >
                  <input
                    type="number"
                    min="1"
                    max="30"
                    defaultValue="2"
                    inputMode="numeric"
                    {...req("voyageurs")}
                  />
                </Field>

                <Field id="budget" label="Budget total" full>
                  <select id="budget" name="budget">
                    {BUDGETS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  id="envies"
                  label="Vos envies, contraintes, remarques"
                  full
                >
                  <textarea
                    id="envies"
                    name="envies"
                    rows={4}
                    placeholder="Ex. : week-end créatif, pas de voiture, régime végétarien, mobilité réduite…"
                  />
                </Field>

                <label className="check">
                  <input type="checkbox" name="newsletter" />
                  <span>J’accepte de recevoir la newsletter DÉTOUR</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="pill">
                  Envoyer ma demande
                </button>
                <span className="hint">
                  Réponse sous 48 h ouvrées, sans engagement.
                </span>
              </div>
            </form>

            <div
              className={"done" + (done ? " show" : "")}
              ref={doneRef}
              role="status"
              tabIndex={-1}
            >
              <h2>
                Merci, v<span className="o-jump">o</span>tre demande est bien
                partie
              </h2>
              <p>
                Nous vous répondons sous 48 h ouvrées
                {sentTo ? (
                  <>
                    {" "}à l’adresse <strong>{sentTo}</strong>
                  </>
                ) : (
                  " à l’adresse indiquée"
                )}
                . En attendant, jetez un œil à nos destinations.
              </p>
              <Link className="pill ghost" to="/destinations">
                Découvrir nos destinations
              </Link>
            </div>

            <p className="legal">
              Conformément à la loi « Informatique et Libertés » du 6 janvier
              1978, vous disposez d’un droit d’accès et de rectification aux
              données vous concernant.
            </p>
          </section>

          <aside className="side">
            <div className="side-card">
              <h3>Une question avant de vous lancer ?</h3>
              <p>Appelez-nous, on parle week-end toute la journée.</p>
              <a className="big" href="tel:+33240000000">
                02 40 00 00 00
              </a>
              <p>Du mardi au samedi, 10h–19h. Appel non surtaxé.</p>
            </div>

            <div className="side-card">
              <h3>Ils nous ont fait confiance</h3>
              <blockquote className="quote">
                <p>
                  Un week-end génial à Lyon, l’enquête dans les traboules était
                  top. Merci à toute l’équipe.
                </p>
                <cite>Julie et Marc, Rennes</cite>
              </blockquote>
              <blockquote className="quote">
                <p>Organisation parfaite, on n’a eu à penser à rien.</p>
                <cite>Famille Bertin</cite>
              </blockquote>
            </div>

            <div className="side-card">
              <h3>Actualités</h3>
              <ul className="news">
                <li>
                  <span className="tag">Nouveau</span>
                  <a href="#">L’atelier des machines imaginaires à Nantes</a>
                </li>
                <li>
                  <a href="#">Fête des Lumières : réservez tôt</a>
                </li>
                <li>
                  <a href="#">DÉTOUR, coup de cœur de nos voyageurs</a>
                </li>
                <li>
                  <a href="#">Braderie de Lille : nos astuces</a>
                </li>
              </ul>
            </div>

            <Newsletter />
          </aside>
        </div>
      </main>
      <Cookies />
    </>
  );
}