import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { usePageMeta } from "../components/Common.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const DEMO_REVIEWS = [
  {
    content: "Nous avons adoré notre escapade à Lille grâce à Detour. L’agence a pris en compte toutes nos préférences et nous a proposé un programme parfait. Merci pour cette expérience unique !",
    clientName: "Alice et Maxime",
    destination: "Lille",
  },
  {
    content: "L’agence “Voyages Detour” a été impeccable du début à la fin. Réponses ultra rapides, bons conseils sur les activités, et transfert aéroport parfaitement organisé. L’hôtel était super, mais c’est vraiment le suivi de l’agence qui a fait la différence.",
    clientName: "Julie et Marc",
    destination: "Nantes",
  },
  {
    content: "L’équipe de Detour a été exceptionnelle. Tout était parfait : vol, hôtel, et même une visite privée du Louvre organisée à la dernière minute. Réactivité et professionnalisme au top.",
    clientName: "William",
    destination: "Barcelone",
  },
  {
    content: "Premier voyage organisé avec Detour et on ne reviendra plus en arrière. Itinéraire sur-mesure au Portugal, adresses insolites et un suivi impeccable. On a vraiment eu l’impression d’avoir un ami sur place.",
    clientName: "Léa et Antoine",
    destination: "Lisbonne",
  },
  {
    content: "Nous avons passé un excellent séjour à Barcelone grâce à Detour. L’organisation était parfaite, les activités proposées étaient originales et adaptées à nos envies. Nous recommandons vivement cette agence !",
    clientName: "Sophie et Thomas",
    destination: "Barcelone",
  },
  {
    content: "Un grand merci à l’équipe Detour pour ce week-end inoubliable à Lyon. Tout était parfaitement organisé, de l’hébergement aux activités. Nous avons pu profiter pleinement de notre séjour sans stress.",
    clientName: "Claire",
    destination: "Lyon",
  },
];

function ReviewCard({ review }) {
  const initials = review.clientName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase("fr-FR"))
    .join("");

  return (
    <article className="published-review-card">
      {review.rating && <p className="published-review-rating" aria-label={`${review.rating} étoiles sur 5`}>
        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
      </p>}
      <blockquote>« {review.content} »</blockquote>
      <div className="published-review-author">
        <span className="published-review-avatar" aria-hidden="true">{initials}</span>
        <div>
          <strong>{review.clientName}</strong>
          {review.destination && <small>{review.destination}</small>}
          {review.isExample && <small>Exemple</small>}
        </div>
      </div>
      {review.destination && (
        <Link className="published-review-link" to="/assistant">
          Imaginer un voyage à {review.destination} <span aria-hidden="true">→</span>
        </Link>
      )}
    </article>
  );
}

export default function Reviews() {
  usePageMeta(
    "Avis voyageurs",
    "Ce que disent nos voyageurs de leur séjour avec DÉTOUR."
  );
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${API}/reviews`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Les avis clients ne peuvent pas être chargés.");
        if (!Array.isArray(data.reviews)) throw new Error("La liste des avis reçue est invalide.");
        return data.reviews;
      })
      .then((data) => {
        if (active) setReviews(data);
      })
      .catch((error) => {
        if (active) setReviewError(error.message);
      });
    return () => { active = false; };
  }, []);

  async function submitReview(event) {
    event.preventDefault();
    setSubmitting(true);
    setReviewError("");
    setReviewNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("detour_token")}`,
        },
        body: JSON.stringify({
          destination: form.get("destination"),
          rating: Number(form.get("rating")),
          content: form.get("content"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Votre avis n’a pas pu être envoyé.");
      formElement.reset();
      setReviewNotice("Merci pour votre avis ! Il sera visible après validation par notre équipe.");
    } catch (error) {
      setReviewError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="contenu">
      <section className="rv-hero">
        <div className="wrap">
          <h1>
            Ils nous ont fait c<span className="o-jump">o</span>nfiance
          </h1>
          <p className="lead">
            Des week-ends, des détours et des adresses qu’un moteur ne trouve
            pas.
          </p>
          <div className="rv-hero-actions">
            <a className="pill" href="#laisser-un-avis">Donner mon avis</a>
          </div>
        </div>
      </section>

      <section className="wrap published-reviews" aria-label="Avis voyageurs publiés">
        <div className="published-reviews-heading">
          <span className="eyebrow">Leurs mots, leurs voyages</span>
          <h2>Les retours de nos voyageurs</h2>
        </div>
        {reviewError && <p role="alert" className="client-notice">{reviewError}</p>}
        {reviews.length || DEMO_REVIEWS.length ? (
          <div className="published-review-grid">
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            {DEMO_REVIEWS.map((review) => (
              <ReviewCard
                key={`example-${review.clientName}`}
                review={{ ...review, isExample: true }}
              />
            ))}
          </div>
        ) : !reviewError ? <p className="published-reviews-empty">Les avis de nos voyageurs apparaîtront ici après leur publication.</p> : null}
      </section>

      <section className="wrap client-card request-card" id="laisser-un-avis">
        <h2>Partagez votre expérience</h2>
        {user ? <form className="client-form" onSubmit={submitReview}>
          <div className="client-fields">
            <label>Destination (facultatif)<input name="destination" maxLength="160" /></label>
            <label>Votre note<select name="rating" defaultValue="5"><option value="5">5 étoiles</option><option value="4">4 étoiles</option><option value="3">3 étoiles</option><option value="2">2 étoiles</option><option value="1">1 étoile</option></select></label>
            <label className="span-two">Votre avis (20 à 2 000 caractères)<textarea name="content" minLength="20" maxLength="2000" rows="5" required /></label>
          </div>
          {reviewError && <p role="alert" className="client-notice">{reviewError}</p>}
          {reviewNotice && <p role="status" className="client-notice">{reviewNotice}</p>}
          <button className="pill" type="submit" disabled={submitting}>{submitting ? "Envoi…" : "Envoyer mon avis"}</button>
          <p className="client-small">Les avis envoyés sont relus par notre équipe avant publication.</p>
        </form> : (
          <div className="review-sign-in">
            <p>Connectez-vous ou créez un compte pour partager votre expérience de voyage.</p>
            <div className="review-sign-in-actions">
              <Link
                className="pill"
                to="/login"
                state={{ from: { pathname: "/avis", hash: "#laisser-un-avis" } }}
              >
                Se connecter
              </Link>
              <Link
                className="pill ghost"
                to="/register"
                state={{ from: { pathname: "/avis", hash: "#laisser-un-avis" } }}
              >
                Créer un compte
              </Link>
            </div>
          </div>
        )}
        {reviewError && !user && <p role="alert" className="client-notice">{reviewError}</p>}
      </section>

      <section className="wrap">
        <div className="rv-cta">
          <h2>À votre tour de prendre le pas de côté.</h2>
          <div>
            <p>
              Un conseiller vous répond sous 48 h ouvrées, avec une proposition
              signée de son prénom.
            </p>
            <Link className="pill" to="/assistant">
              Demander un devis
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
