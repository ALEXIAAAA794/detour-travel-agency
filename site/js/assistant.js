const formulaire = document.querySelector("#formulaire");
const champMessage = document.querySelector("#message");
const bouton = document.querySelector("#envoyer");
const messages = document.querySelector("#messages");
const statut = document.querySelector("#statut");

function afficherMessage(auteur, texte) {
  const element = document.createElement("p");
  element.className = "message";

  if (auteur === "Vous") {
    element.classList.add("utilisateur");
  }

  element.textContent = auteur + " : " + texte;
  messages.appendChild(element);
  messages.scrollTop = messages.scrollHeight;
}

afficherMessage(
  "Assistant",
  "Bonjour ! Je peux vous aider à préparer votre demande de voyage. Quelle est votre envie ?"
);

const boutonVoyage = document.querySelector("#preparer-voyage");
const recapitulatif = document.querySelector("#recapitulatif");
const detailsVoyage = document.querySelector("#details-voyage");
const boutonModifier = document.querySelector("#modifier-voyage");

const questions = [
  {
    cle: "destination",
    titre: "Destination",
    texte: "Où aimeriez-vous aller ? Vous pouvez aussi répondre : à conseiller."
  },
  {
    cle: "dates",
    titre: "Dates et durée",
    texte: "Quand souhaitez-vous partir et pour combien de temps ? Vos dates sont-elles flexibles ?"
  },
  {
    cle: "participants",
    titre: "Nombre de voyageurs",
    texte: "Combien de personnes participeront ? Indiquez un nombre entier."
  },
  {
    cle: "budget",
    titre: "Budget",
    texte: "Quel budget envisagez-vous ? Précisez la devise et si le montant est total ou par personne. Vous pouvez répondre : à définir."
  },
  {
    cle: "activites",
    titre: "Activités",
    texte: "Quelles activités aimeriez-vous faire ?"
  },
  {
    cle: "experience",
    titre: "Expérience recherchée",
    texte: "Quelle expérience recherchez-vous : détente, aventure, culture, gastronomie ou autre ?"
  }
];

let etapeVoyage = -1;
let projetVoyage = {};

function commencerVoyage() {
  if (bouton.disabled) return;

  projetVoyage = {};
  etapeVoyage = 0;
  recapitulatif.hidden = true;
  statut.textContent = "";
  champMessage.value = "";

  afficherMessage("Assistant", questions[0].texte);
  champMessage.focus();
}

function traiterReponseVoyage(message) {
  const question = questions[etapeVoyage];

  if (
    question.cle === "participants" &&
    (!/^[1-9]\d*$/.test(message) ||
      !Number.isSafeInteger(Number(message)))
  ) {
    afficherMessage(
      "Assistant",
      "Merci d’indiquer un nombre entier positif, par exemple 2."
    );
    return;
  }

  projetVoyage[question.cle] =
    question.cle === "participants" ? Number(message) : message;

  etapeVoyage += 1;

  if (etapeVoyage < questions.length) {
    afficherMessage("Assistant", questions[etapeVoyage].texte);
    return;
  }

  etapeVoyage = -1;
  detailsVoyage.replaceChildren();

  for (const question of questions) {
    const ligne = document.createElement("p");
    ligne.textContent =
      question.titre + " : " + projetVoyage[question.cle];
    detailsVoyage.appendChild(ligne);
  }

  recapitulatif.hidden = false;
  afficherMessage(
    "Assistant",
    "Votre récapitulatif est prêt. Vous pouvez le relire ou reprendre vos réponses. Rien n’a encore été envoyé au conseiller."
  );
  recapitulatif.scrollIntoView({ behavior: "smooth", block: "start" });
}

boutonVoyage.addEventListener("click", commencerVoyage);
boutonModifier.addEventListener("click", commencerVoyage);

formulaire.addEventListener("submit", async (evenement) => {
  evenement.preventDefault();

  const message = champMessage.value.trim();
  if (!message || bouton.disabled) return;

  afficherMessage("Vous", message);
  champMessage.value = "";

    if (etapeVoyage >= 0) {
    traiterReponseVoyage(message);
    return;
  }
  bouton.disabled = true;
  statut.textContent = "Réponse en cours…";

  try {
    const reponse = await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(70000)
    });

    const donnees = await reponse.json();

    if (!reponse.ok) {
      throw new Error(
        donnees.error?.message || "Le service est indisponible."
      );
    }

    if (typeof donnees.reply?.content !== "string") {
      throw new Error("La réponse reçue est inexploitable.");
    }

    afficherMessage("Assistant", donnees.reply.content);
    statut.textContent = "";
  } catch (erreur) {
    statut.textContent =
      "Réponse non obtenue. Votre message reste visible ; vous pouvez réessayer ou contacter un conseiller.";
  } finally {
    bouton.disabled = false;
    champMessage.focus();
  }
});