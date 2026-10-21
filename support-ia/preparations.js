const express = require("express");
const { tracer, referenceDiagnostic } = require("./diagnostic");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { genererProgramme, empreinteVoyage } = require("./programmes");
const dossier = process.env.SUPPORT_PREPARATIONS_DIR || path.join(__dirname, "data", "preparations");
const champs = ["destination", "dates", "participants", "budget", "activites", "experience", "rythme", "contraintes"];
const preparationsRouter = express.Router();
const occupes = new Set();
function fichier(id) { return path.join(dossier, id + ".json"); }
function sauver(p) {
  fs.mkdirSync(dossier, { recursive: true });
  const temporaire = fichier(p.id) + "." + crypto.randomUUID() + ".tmp";
  fs.writeFileSync(temporaire, JSON.stringify(p), { mode: 0o600 });
  fs.renameSync(temporaire, fichier(p.id));
}
function autoriser(req, res, next) {
  const id = req.params.id;
  const jeton = req.headers.authorization?.replace(/^Bearer /, "") || "";
  let p;
  try {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw Error();
    p = JSON.parse(fs.readFileSync(fichier(id), "utf8"));
    const empreinte = crypto.createHash("sha256").update(jeton).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(empreinte), Buffer.from(p.empreinte))) throw Error();
  } catch { return res.status(404).json({ error: { message: "Préparation inaccessible." } }); }
  res.set("Cache-Control", "no-store");
  req.preparation = p;
  next();
}
function publique(p) { return { id: p.id, voyage: p.voyage, historique: p.historique, programme: p.programme || null, programmeObsolete: Boolean(p.programme && p.programme.empreinteVoyage !== empreinteVoyage(p.voyage)) }; }
preparationsRouter.post("/", (req, res) => {
  const jeton = crypto.randomBytes(32).toString("hex");
  const p = { id: crypto.randomUUID(), empreinte: crypto.createHash("sha256").update(jeton).digest("hex"), voyage: {}, historique: [] };
  sauver(p);
  res.set("Cache-Control", "no-store").status(201).json({ ...publique(p), jeton });
});
preparationsRouter.get("/:id", autoriser, (req, res) => res.json(publique(req.preparation)));
preparationsRouter.patch("/:id", autoriser, (req, res) => {
  const p = req.preparation;
  if (occupes.has(p.id)) return res.status(409).json({ error: { message: "Préparation occupée. Réessayez." } });
  const voyage = req.body?.voyage;
  if (!voyage || typeof voyage !== "object" || Array.isArray(voyage) || Object.entries(voyage).some(([k,v]) => !champs.includes(k) || (k === "participants" ? !Number.isSafeInteger(v) || v < 1 : typeof v !== "string" || !v.trim() || v.trim().length > 2000))) {
    return res.status(400).json({ error: { message: "Préférences invalides." } });
  }
  const changements = Object.entries(voyage).filter(([k,v]) => p.voyage[k] !== v);
  if (changements.length) {
    if (p.historique.length >= 200) return res.status(409).json({ error: { message: "Préparation complète." } });
    p.historique.push({ role: "user", content: changements.map(([k,v]) => k + " : " + v).join("\n") }, { role: "model", content: "Préférences de voyage enregistrées." });
  }
  p.voyage = Object.fromEntries(Object.entries(voyage).map(([k,v]) => [k, typeof v === "string" ? v.trim() : v]));
  sauver(p);
  res.json(publique(p));
});
preparationsRouter.post("/:id/programme", autoriser, async (req, res, next) => {
  const p = req.preparation;
  const erreur = (statut, code, message, plus = {}) => res.status(statut).json({ error: { code, message, ...plus } });
  // La version attendue évite qu’un clic répété ou un autre onglet régénère silencieusement.
  if (!Number.isSafeInteger(req.body?.versionAttendue) || req.body.versionAttendue < 0) return erreur(400, "INVALID_VERSION", "Version attendue obligatoire.");
  if (occupes.has(p.id)) return erreur(409, "PREPARATION_BUSY", "Une opération est déjà en cours. Réessayez ensuite.");
  const version = p.programme?.version || 0;
  if (req.body.versionAttendue !== version) return erreur(409, "STALE_PROGRAMME", "Le programme a changé. Rechargez votre préparation.");
  occupes.add(p.id);
  const empreinte = empreinteVoyage(p.voyage);
  const reference = referenceDiagnostic();
  const debut = Date.now();
  let etape = "appel_gemini";
  tracer(reference, debut, "debut", { etape });
  try {
    const resultat = await genererProgramme(p);
    if (resultat.problemes) {
      tracer(reference, debut, "refus", { etape: "preferences" });
      return erreur(422, "PREFERENCES_INCOMPLETE", "Précisez ou corrigez les préférences avant la génération.", { precisions: resultat.problemes });
    }
    etape = "sauvegarde";
    const actuelle = JSON.parse(fs.readFileSync(fichier(p.id), "utf8"));
    if (empreinteVoyage(actuelle.voyage) !== empreinte || (actuelle.programme?.version || 0) !== version) return erreur(409, "STALE_PROGRAMME", "Les préférences ou le programme ont changé. Relancez la génération.");
    actuelle.programme = { version: version + 1, genereLe: new Date().toISOString(), empreinteVoyage: empreinte, contenu: resultat.programme };
    sauver(actuelle);
    tracer(reference, debut, "succes", { etape: "termine" });
    return res.json(publique(actuelle));
  } catch (e) {
    tracer(reference, debut, "echec", { ...(e.diagnostic || { etape }), code: etape === "sauvegarde" ? "PROGRAMME_STORAGE" : e.code });
    const suite = " Vos préférences et votre programme sont conservés. Vous pouvez réessayer. Référence diagnostic : " + reference;
    if (etape === "sauvegarde") return erreur(500, "PROGRAMME_STORAGE", "Le programme n’a pas pu être enregistré." + suite);
    if (e.code === "INVALID_PROGRAMME") return erreur(502, e.code, "Le programme reçu est invalide (JSON ou structure)." + suite);
    if (e.code === "AI_HTTP") return erreur(503, e.code, "Gemini a refusé l’appel (HTTP " + e.diagnostic.statutHTTP + ")." + suite);
    if (e.code === "AI_TIMEOUT") return erreur(504, e.code, "Le délai de réponse de Gemini est dépassé." + suite);
    if (e.code === "AI_INCOMPLETE") return erreur(502, e.code, "Gemini a renvoyé une réponse incomplète ou interrompue." + suite);
    if (e.code === "AI_CONFIGURATION") return erreur(503, e.code, "La configuration Gemini du serveur est absente." + suite);
    return erreur(503, "AI_UNAVAILABLE", "Génération indisponible (réseau ou réponse Gemini inexploitable)." + suite);
  } finally { occupes.delete(p.id); }
});
module.exports = { preparationsRouter, autoriser, sauver, occupes };
