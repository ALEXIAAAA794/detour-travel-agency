const express = require("express");

const app = express();

app.use(express.json({ limit: "16kb" }));

app.get("/api/support/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "detour-support-ia"
  });
});

app.post("/api/support/messages", (req, res) => {
  const donnees = req.body;

  if (
    donnees === null ||
    typeof donnees !== "object" ||
    Array.isArray(donnees) ||
    typeof donnees.message !== "string"
  ) {
    return res.status(400).json({
      error: {
        code: "INVALID_MESSAGE",
        message: "La requête doit contenir un message de type texte."
      }
    });
  }

  const message = donnees.message.trim();

  if (message.length === 0 || message.length > 2000) {
    return res.status(400).json({
      error: {
        code: "INVALID_MESSAGE",
        message: "Le message doit contenir entre 1 et 2 000 caractères."
      }
    });
  }

  return res.status(200).json({
    status: "validated",
    receivedMessage: message
  });
});

app.use((erreur, req, res, next) => {
  if (res.headersSent) {
    return next(erreur);
  }

  if (erreur.type === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Le corps de la requête dépasse la limite de 16 Kio."
      }
    });
  }

  if (erreur.type === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "Le corps de la requête doit être un JSON valide."
      }
    });
  }

  console.error("Erreur interne du support IA.");

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Une erreur interne est survenue."
    }
  });
});

app.listen(3001, "127.0.0.1", () => {
  console.log("Support IA démarré sur http://127.0.0.1:3001");
});