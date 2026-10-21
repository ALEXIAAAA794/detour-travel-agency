const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const demandesRouter = express.Router();
const dossierDemandes = path.join(__dirname, "data", "demandes");

const champsVoyage = [
  "destination",
  "dates",
  "budget",
  "activites",
  "experience"
];

function texteValide(valeur, maximum) {
  return typeof valeur === "string" &&
    valeur.trim().length > 0 &&
    valeur.trim().length <= maximum;
}

demandesRouter.post("/", (req, res, next) => {
  const donnees = req.body;

  if (!donnees || typeof donnees !== "object" || Array.isArray(donnees)) {
    return res.status(400).json({
      error: { message: "La demande est invalide." }
    });
  }

  const { requestId, client, voyage } = donnees;

  const identifiantValide =
    typeof requestId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId);

  if (
    !identifiantValide ||
    !client ||
    !texteValide(client.nom, 120) ||
    !texteValide(client.email, 254) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim()) ||
    !voyage ||
    !champsVoyage.every((cle) => texteValide(voyage[cle], 2000)) ||
    !Number.isSafeInteger(voyage.participants) ||
    voyage.participants < 1
  ) {
    return res.status(400).json({
      error: {
        message: "Vérifiez les coordonnées et les réponses du voyage."
      }
    });
  }

  const contenu = {
    client: {
      nom: client.nom.trim(),
      email: client.email.trim()
    },
    voyage: {
      destination: voyage.destination.trim(),
      dates: voyage.dates.trim(),
      participants: voyage.participants,
      budget: voyage.budget.trim(),
      activites: voyage.activites.trim(),
      experience: voyage.experience.trim()
    }
  };

  const demande = {
    reference: requestId,
    statut: "RECUE",
    creeLe: new Date().toISOString(),
    ...contenu
  };

  try {
    fs.mkdirSync(dossierDemandes, { recursive: true });

    const fichier = path.join(dossierDemandes, requestId + ".json");

    try {
      fs.writeFileSync(
        fichier,
        JSON.stringify(demande, null, 2),
        { encoding: "utf8", flag: "wx", mode: 0o600 }
      );
    } catch (erreur) {
      if (erreur.code !== "EEXIST") throw erreur;

      const existante = JSON.parse(fs.readFileSync(fichier, "utf8"));

      const memeContenu =
        JSON.stringify({
          client: existante.client,
          voyage: existante.voyage
        }) === JSON.stringify(contenu);

      if (!memeContenu) {
        return res.status(409).json({
          error: {
            message: "Cette référence correspond déjà à une autre demande."
          }
        });
      }

      return res.status(200).json({
        reference: existante.reference,
        statut: existante.statut
      });
    }

    return res.status(201).json({
      reference: demande.reference,
      statut: demande.statut
    });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = { demandesRouter };