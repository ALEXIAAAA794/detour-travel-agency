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
  if (bouton.disabled || envoiEnCours) return;

  projetVoyage = {};
  etapeVoyage = 0;

  recapitulatif.hidden = true;
  detailsVoyage.replaceChildren();

  boutonValider.disabled = false;
  recapitulatif.querySelectorAll("input").forEach((champ) => {
    champ.disabled = false;
  });

  etatDemande.textContent =
    "Brouillon : votre demande n’a pas encore été envoyée.";

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

    const etiquette = document.createElement("label");
    etiquette.htmlFor = "voyage-" + question.cle;
    etiquette.textContent = question.titre;

    const champ = document.createElement("input");
    champ.id = "voyage-" + question.cle;
    champ.value = String(projetVoyage[question.cle]);
    champ.maxLength = 2000;

    if (question.cle === "participants") {
      champ.type = "number";
      champ.min = "1";
      champ.step = "1";
    } else {
      champ.type = "text";
    }

    champ.style.width = "100%";
    champ.style.padding = "12px";
    champ.style.font = "inherit";
    champ.style.boxSizing = "border-box";

    champ.addEventListener("input", () => {
      const valeur = champ.value.trim();

      const valide = question.cle === "participants"
        ? /^[1-9]\d*$/.test(valeur) &&
          Number.isSafeInteger(Number(valeur))
        : valeur.length > 0 && valeur.length <= 2000;

      champ.setCustomValidity(
        valide ? "" : "Veuillez renseigner une réponse valide."
      );

      projetVoyage[question.cle] =
        question.cle === "participants" && valide
          ? Number(valeur)
          : valeur;
    });

    ligne.append(etiquette, champ);
    detailsVoyage.appendChild(ligne);
  }

  recapitulatif.hidden = false;
    afficherMessage(
    "Assistant",
    "Votre récapitulatif est prêt. Vous pouvez modifier directement chaque réponse. Votre demande n’a pas encore été envoyée."
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

const boutonValider = document.querySelector("#valider-demande");
const etatDemande = document.querySelector("#etat-demande");

let envoiEnCours = false;
let dernierContenu = "";
let referenceEnvoi = "";

boutonValider.addEventListener("click", async () => {
  if (envoiEnCours) return;

  const champs = recapitulatif.querySelectorAll("input");

  for (const champ of champs) {
    if (!champ.reportValidity()) return;
  }

  const contenu = {
    client: {
      nom: document.querySelector("#client-nom").value.trim(),
      email: document.querySelector("#client-email").value.trim()
    },
    voyage: { ...projetVoyage }
  };

  const signature = JSON.stringify(contenu);

  if (signature !== dernierContenu) {
    referenceEnvoi = crypto.randomUUID();
    dernierContenu = signature;
  }

  envoiEnCours = true;
  boutonValider.disabled = true;
  boutonVoyage.disabled = true;
  boutonModifier.disabled = true;
  champs.forEach((champ) => { champ.disabled = true; });
  etatDemande.textContent = "Enregistrement de votre demande…";

  try {
    const reponse = await fetch("/api/support/demandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: referenceEnvoi,
        ...contenu
      }),
      signal: AbortSignal.timeout(15000)
    });

    const donnees = await reponse.json();

    if (!reponse.ok) {
      throw new Error(
        donnees.error?.message || "L’enregistrement a échoué."
      );
    }

    etatDemande.textContent =
      "Demande enregistrée. Référence : " + donnees.reference +
      ". Aucune réservation ni aucun paiement n’a été effectué.";

    afficherMessage(
      "Assistant",
      "Votre demande a été enregistrée sous la référence " +
      donnees.reference + "."
    );
  } catch (erreur) {
    etatDemande.textContent =
      "Enregistrement non confirmé. Vous pouvez réessayer avec les mêmes réponses.";

    boutonValider.disabled = false;
    champs.forEach((champ) => { champ.disabled = false; });
  } finally {
    envoiEnCours = false;
    boutonVoyage.disabled = false;
    boutonModifier.disabled = false;
  }
});