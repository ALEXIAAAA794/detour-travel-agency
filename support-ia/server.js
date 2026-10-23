const express = require("express");

const app = express();

const path = require("node:path");
const siteDist = process.env.SUPPORT_SITE_DIST_DIR || path.join(__dirname, "../site/dist");

const {creerMessage}=require("./nicia-historique");
const { demandesRouter } = require("./demandes");

app.use(express.json({ limit: "16kb" }));

app.use((req,res,next)=>{res.set("Referrer-Policy","no-referrer");next();});
app.use(express.static(siteDist));
const limiterIA = require("./limitation").limiterRequetes;
app.post("/api/chat", (req,res,next)=>{
  const b=req.body;
  const compose = typeof b?.jeton === "string" ? b.jeton.match(/^([a-f0-9-]{36})\.([a-f0-9]{64})$/i) : null;
  if (!b || typeof b !== "object" || Array.isArray(b)) return res.status(400).json({error:{code:"INVALID_REQUEST",message:"Requête invalide."}});
  const id=b.preparationId || compose?.[1];
  const token=compose?.[2] || b.jeton;
  if (typeof id!=="string" || typeof token!=="string") return res.status(401).json({error:{code:"PREPARATION_REQUIRED",message:"Une préparation et son jeton sont obligatoires."}});
  req.body={message:b.message,preparationId:id}; // historique navigateur volontairement ignoré
  req.headers.authorization="Bearer "+token;
  req.url="/api/support/messages";
  next();
});
app.post("/api/support/messages", limiterIA);
app.post(["/api/support/preparations/:id/programme", "/api/support/preparations/:id/programme/modifications"], limiterIA);


const { preparationsRouter, autoriser, sauver, occupes } = require("./preparations");
app.use("/api/support/preparations", preparationsRouter);
// Fermée tant que l’authentification conseiller et la relation métier ne sont pas raccordées.
app.use("/api/prereservations",require("./nicia-trace").creerTraceRouter());
app.post("/api/support/nicia/:id/conversation", limiterIA);
app.use("/api/support/nicia", require("./nicia").niciaRouter);
const { interrogerIA, nomFournisseur } = require("./ai");
const { repondreFAQ } = require("./connaissances");

app.get("/api/support/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "detour-support-ia"
  });
});

app.post("/api/support/messages", async (req, res, next) => {
  if (req.body?.preparationId) {
    req.params.id = req.body.preparationId;
    return autoriser(req, res, next);
  }
  next();
}, require("./limitation").limiterPreparation, async (req, res) => {
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

    const p = req.preparation;
    if (p && occupes.has(p.id)) return res.status(409).json({ error: { message: "Préparation occupée. Réessayez." } });
    if (p && p.historique.length >= 200) return res.status(409).json({ error: { message: "Préparation complète. Commencez une nouvelle préparation." } });
    if (p) occupes.add(p.id);
    try {
    const faq = repondreFAQ(message);
    const texte = faq ? faq.content : await interrogerIA(message, p);
    if (p) {
      p.historique.push(creerMessage("user",message),creerMessage("model",texte,faq||{}));
      sauver(p);
    }

    return res.status(200).json({
      reply: {
        role: "assistant",
        content: texte,
        ...(faq ? { type: faq.type, sources: faq.sources, informationsManquantes: faq.informationsManquantes, baseVersion: faq.baseVersion } : { type: "conversation" })
      }
    });
  } catch (erreur) {
    const fournisseur = nomFournisseur(erreur.diagnostic?.fournisseur);
    console.error("Échec de l’appel " + fournisseur + ".");

    return res.status(503).json({
      error: {
        code: "AI_UNAVAILABLE",
        message: fournisseur + " : l’assistant est temporairement indisponible. Réessayez.",
        fournisseur: erreur.diagnostic?.fournisseur || "inconnu"
      }
    });
  } finally {
    if (p) occupes.delete(p.id);
  }
});

app.use("/api/support/demandes", demandesRouter);

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile("index.html", { root: siteDist }, (erreur) => {
    if (erreur) next(erreur);
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

const port = Number(process.env.PORT || 3001);

if (require.main === module) app.listen(port, "0.0.0.0", () => {
  console.log(`Support IA démarré sur http://127.0.0.1:${port}`);
});
module.exports = { app };
