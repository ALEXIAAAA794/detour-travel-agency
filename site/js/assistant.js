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
  },
  { cle: "rythme", titre: "Rythme souhaité", texte: "Quel rythme souhaitez-vous : tranquille, équilibré ou soutenu ? Vous pouvez répondre : aucune préférence." },
  { cle: "contraintes", titre: "Contraintes particulières", texte: "Avez-vous des contraintes particulières à prendre en compte ? Vous pouvez répondre : aucune." }
];

let etapeVoyage = -1;
let projetVoyage = {};

let preparation = null;
let synchronisation = false;
let versionPreparation = 0;
let nouvellePreparation = false;
let chargementPreparation = null;
function lireAccesPreparation() {
  try {
    const acces = JSON.parse(sessionStorage.getItem("detour-preparation"));
    return acces && typeof acces.id === "string" && typeof acces.jeton === "string" ? acces : null;
  } catch { return null; }
}
async function ouvrirPreparation() {
  if (preparation) return preparation;
  if (chargementPreparation) return chargementPreparation;
  const version = versionPreparation;
  const sauvegarde = nouvellePreparation ? null : lireAccesPreparation();
  const chargement = (async () => {
    const r = await fetch(sauvegarde ? "/api/support/preparations/" + sauvegarde.id : "/api/support/preparations", {
      method: sauvegarde ? "GET" : "POST",
      ...(sauvegarde ? { headers: { Authorization: "Bearer " + sauvegarde.jeton } } : {}),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error("Préparation inaccessible");
    const donnees = await r.json();
    const candidate = { ...donnees, jeton: sauvegarde ? sauvegarde.jeton : donnees.jeton };
    if (typeof candidate.id !== "string" || typeof candidate.jeton !== "string" ||
        !candidate.voyage || !Array.isArray(candidate.historique)) throw new Error("Préparation invalide");
    // Une restauration tardive ne doit jamais remplacer le nouveau questionnaire.
    if (version !== versionPreparation) throw new Error("Préparation remplacée");
    preparation = candidate;
    nouvellePreparation = false;
    try {
      sessionStorage.setItem("detour-preparation", JSON.stringify({ id: preparation.id, jeton: preparation.jeton }));
    } catch {
      statut.textContent = "Stockage du navigateur indisponible : gardez cette page ouverte pour conserver votre préparation.";
    }
    return preparation;
  })();
  chargementPreparation = chargement;
  try { return await chargement; }
  finally { if (chargementPreparation === chargement) chargementPreparation = null; }
}
async function sauverPreferences(voyage) {
  await ouvrirPreparation();
  const r = await fetch("/api/support/preparations/" + preparation.id, {
    method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + preparation.jeton },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ voyage })
  });
  if (!r.ok) throw new Error("Sauvegarde impossible");
}
function commencerVoyage() {
  if (envoiEnCours || (bouton.disabled && !synchronisation)) return;
  versionPreparation += 1;
  preparation = null;
  chargementPreparation = null;
  nouvellePreparation = true;
  synchronisation = false;
  bouton.disabled = false;

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

    champ.addEventListener("change", async () => {
      if (!champ.checkValidity()) return;
      try { await sauverPreferences(projetVoyage); }
      catch { statut.textContent = "Modification non enregistrée. Réessayez avant de quitter la page."; }
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
    const cle = questions[etapeVoyage].cle;
    const valide = message.length <= 2000 && (cle !== "participants" || (/^[1-9]\d*$/.test(message) && Number.isSafeInteger(Number(message))));
    if (!valide) { statut.textContent = "Réponse invalide (2 000 caractères maximum ; nombre entier positif pour les voyageurs)."; return; }
    bouton.disabled = true;
    traiterReponseVoyage(message);
    try {
      await sauverPreferences({ ...projetVoyage });
      statut.textContent = "";
    } catch {
      statut.textContent = "Réponses conservées dans cette page uniquement. Sauvegarde serveur indisponible ; gardez la page ouverte. Vérifiez que le serveur Express à jour est démarré.";
    }
    finally { bouton.disabled = false; }
    return;
  }
  bouton.disabled = true;
  statut.textContent = "Réponse en cours…";

  try {
    await ouvrirPreparation();
    if (Object.keys(projetVoyage).length) await sauverPreferences(projetVoyage);
    const reponse = await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + preparation.jeton },
      body: JSON.stringify({ message, preparationId: preparation.id }),
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
    await sauverPreferences(projetVoyage);
    const reponse = await fetch("/api/support/demandes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + preparation.jeton },
      body: JSON.stringify({
        preparationId: preparation.id,
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

    const confirmation =
      "Votre demande de voyage a bien été reçue. Référence : " +
      donnees.reference +
      ". Un conseiller vous répondra sous 24 heures maximum. " +
      "Aucune réservation ni aucun paiement n’a été effectué.";

    const etatEmail = donnees.email?.statut;
    const informationEmail = etatEmail === "ACCEPTE_SMTP"
      ? " L’accusé de réception a été accepté par le service email. Vérifiez aussi vos courriers indésirables."
      : ["EN_ATTENTE", "EN_COURS"].includes(etatEmail)
        ? " Un accusé de réception par email est en cours de préparation."
        : " L’envoi de l’accusé de réception par email n’est pas confirmé ; votre demande reste enregistrée.";

    etatDemande.textContent = confirmation + informationEmail;
    afficherMessage("Assistant", confirmation + informationEmail);
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

// Ne pas créer de préparation au chargement d’une page sans session à restaurer.
if (lireAccesPreparation()) {
  synchronisation = true;
  bouton.disabled = true;
  statut.textContent = "Restauration de votre préparation…";
  const version = versionPreparation;
  ouvrirPreparation().then((restauree) => {
    if (version !== versionPreparation) return;
    for (const m of restauree.historique) afficherMessage(m.role === "user" ? "Vous" : "Assistant", m.content);
    projetVoyage = { ...restauree.voyage };
    // Reprendre la première réponse manquante, y compris pour un ancien brouillon.
    const manquante = questions.findIndex(q => projetVoyage[q.cle] === undefined);
    if (manquante === -1) {
      etapeVoyage = questions.length - 1;
      traiterReponseVoyage(String(projetVoyage[questions[etapeVoyage].cle]));
    } else if (Object.keys(projetVoyage).length) {
      etapeVoyage = manquante;
      afficherMessage("Assistant", questions[manquante].texte);
    }
    statut.textContent = "";
  }).catch(() => {
    if (version === versionPreparation) statut.textContent = "Préparation inaccessible. Cliquez sur « Personnaliser mon voyage » pour commencer un nouveau questionnaire. Vos données existantes sont conservées.";
  }).finally(() => {
    if (version === versionPreparation) { synchronisation = false; bouton.disabled = false; }
  });
}
