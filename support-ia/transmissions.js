const { verrouiller, trouver, ecrire } = require("./stockage-demandes");
const { validerProgramme, empreinteVoyage, problemesPreferences } = require("./programmes");
const { planifierEmail } = require("./emails");
function clientValide(c) {
  return c && typeof c.nom === "string" && c.nom.trim().length > 0 && c.nom.trim().length <= 120 && typeof c.email === "string" && c.email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(c.email.trim());
}
async function transmettre(req, res) {
  const erreur = (s, m) => res.status(s).json({ error: { message: m } });
  const p = req.preparation, b = req.body;
  if (!b || b.accord !== true || !Number.isSafeInteger(b.versionAcceptee) || !clientValide(b.client)) return erreur(400, "Coordonnées, version et accord explicite obligatoires.");
  const client = { nom: b.client.nom.trim(), email: b.client.email.trim() };
  let liberer, demande;
  try {
    liberer = verrouiller();
    demande = trouver(p.id);
    if (demande && (demande.client.nom !== client.nom || demande.client.email !== client.email)) return erreur(409, "Les coordonnées diffèrent de la demande existante. Contactez le conseiller.");
    if (demande?.programmeAccepte) {
      if (demande.programmeAccepte.version !== b.versionAcceptee) return erreur(409, "Une autre version est déjà transmise. Contactez le conseiller.");
      // Réessai après coupure : ne modifier ni l’instantané ni le travail du conseiller.
    } else {
      if (demande && (!["RECUE", "EN_ETUDE"].includes(demande.statut) || demande.proposition?.statut && demande.proposition.statut !== "BROUILLON")) return erreur(409, "Le traitement commercial ne permet plus de rattacher un programme.");
      if (!p.programme || p.programme.version !== b.versionAcceptee || p.programme.empreinteVoyage !== empreinteVoyage(p.voyage)) return erreur(409, "Programme absent, obsolète ou version différente. Rechargez et vérifiez votre programme.");
      let contenu;
      try { contenu = validerProgramme(p.programme.contenu); } catch { return erreur(422, "Programme invalide."); }
      if (contenu.statut !== "proposition" || problemesPreferences(p.voyage).length) return erreur(422, "Précisez les informations indispensables avant de valider.");
      demande ||= { reference: require("node:crypto").randomUUID(), preparationId: p.id, client, voyage: structuredClone(p.voyage), statut: "RECUE", creeLe: new Date().toISOString() };
      demande.programmeAccepte = { version: p.programme.version, valideLe: new Date().toISOString(), accord: true, preparationId: p.id, demandeReference: demande.reference, voyage: structuredClone(p.voyage), contenu };
      ecrire(demande);
    }
  } catch (e) { return erreur(e.code === "EEXIST" ? 409 : e.status || 500, e.status ? e.message : "Transmission non confirmée. Réessayez sans changer de version."); }
  finally { if (liberer) liberer(); }
  const email = await planifierEmail(demande.reference, "reception");
  return res.json({ reference: demande.reference, statut: demande.statut, versionAcceptee: demande.programmeAccepte.version, valideLe: demande.programmeAccepte.valideLe, email });
}
module.exports = { transmettre };
