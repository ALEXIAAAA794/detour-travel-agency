import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../components/Common.jsx";

const REVIEWS = [
  {
    text: "Nous avons adoré notre escapade à Lille grâce à Detour. L’agence a pris en compte toutes nos préférences et nous a proposé un programme parfait. Merci pour cette expérience unique !",
    author: "Alice et Maxime",
    place: "Lille",
  },
  {
    text: "L’agence “Voyages Detour” a été impeccable du début à la fin. Réponses ultra rapides, bons conseils sur les activités, et transfert aéroport parfaitement organisé. L’hôtel était super, mais c’est vraiment le suivi de l’agence qui a fait la différence.",
    author: "Julie et Marc",
    place: "Nantes",
  },
  {
    text: "L’équipe de Detour a été exceptionnelle. Tout était parfait : vol, hôtel, et même une visite privée du Louvre organisée à la dernière minute. Réactivité et professionnalisme au top.",
    author: "William",
    place: "Barcelone",
  },
  {
    text: "Nous avons passé un excellent séjour à Barcelone grâce à Detour. L’organisation était parfaite, les activités proposées étaient originales et adaptées à nos envies. Nous recommandons vivement cette agence !",
    author: "Sophie et Thomas",
    place: "Barcelone",
  },
  {
    text: "Un grand merci à l’équipe Detour pour ce week-end inoubliable à Lyon. Tout était parfaitement organisé, de l’hébergement aux activités. Nous avons pu profiter pleinement de notre séjour sans stress.",
    author: "Claire",
    place: "Lyon",
  },
];

const PLACES = new Set(REVIEWS.map((r) => r.place));


const COLUMNS = [
  [
    { r: 1, tone: "sky", size: "lg" },
    { r: 2, tone: "ink", size: "sm" },
  ],
  [{ r: 0, tone: "paper", size: "tall" }],
  [
    { r: 4, tone: "ink", size: "sm" },
    { r: 3, tone: "sky", size: "lg" },
  ],
];


function Reveal({ i = 0, className = "", children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const tilt = (e) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
  };

  const reset = () => {
    const el = ref.current;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <article
      ref={ref}
      className={`bn-card reveal ${shown ? "in" : ""} ${className}`}
      style={{ "--d": `${i * 0.12}s` }}
      onPointerMove={tilt}
      onPointerLeave={reset}
    >
      {children}
    </article>
  );
}

function Card({ review, tone, size, i }) {
  return (
    <Reveal i={i} className={`${tone} ${size}`}>
      {tone === "sky" && <span className="bn-grid" aria-hidden="true" />}

      <blockquote>« {review.text} »</blockquote>

      <div className="bn-foot">
        <div className="bn-who">
          <b>{review.author}</b>
          <small>{review.place}</small>
        </div>
        <span className="bn-av" aria-hidden="true">
          {review.author.charAt(0)}
        </span>
      </div>

      <Link
        className="bn-go"
        to={`/contact?destination=${encodeURIComponent(review.place)}`}
      >
        Voyager à {review.place} <span aria-hidden="true">→</span>
      </Link>
    </Reveal>
  );
}

export default function Reviews() {
  usePageMeta(
    "Avis voyageurs",
    "Ce que disent nos voyageurs de leur séjour avec DÉTOUR."
  );

  let n = 0;

  return (
    <main id="contenu">
      {/* ---------- Bandeau ---------- */}
      <section className="rv-hero">
        <div className="wrap">

          <span className="eyebrow">Avis voyageurs</span>
          <h1>
            Ils nous ont fait c<span className="o-jump">o</span>nfiance
          </h1>
          <p className="lead">
            Des week-ends, des détours et des adresses qu’un moteur ne trouve
            pas.
          </p>
          <p className="rv-meta">
          </p>
        </div>
      </section>

      {/* ---------- Mosaïque d'avis ---------- */}
      <section className="wrap bn" aria-label="Avis des voyageurs">
        {COLUMNS.map((col, c) => (
          <div className="bn-col" key={c}>
            {col.map((cell) => (
              <Card
                key={cell.r}
                review={REVIEWS[cell.r]}
                tone={cell.tone}
                size={cell.size}
                i={n++}
              />
            ))}
          </div>
        ))}
      </section>

      {/* ---------- Appel à l'action ---------- */}
      <section className="wrap">
        <div className="rv-cta">
          <h2>À votre tour de prendre le pas de côté.</h2>
          <div>
            <p>
              Un conseiller vous répond sous 48 h ouvrées, avec une proposition
              signée de son prénom.
            </p>
            <Link className="pill" to="/contact">
              Demander un devis
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}