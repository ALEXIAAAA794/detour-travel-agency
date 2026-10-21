// Aucun import de serveur/programmes, aucune génération, un seul GET officiel.
const { lireJSONBorne, lireErreurFournisseur } = require("./gemini-http");
const { entier, dateISO } = require("./quota-diagnostic");
function quotaCompte(d = {}) {
  const sortie = {};
  if (typeof d.is_free_tier === "boolean") sortie.compteGratuit = d.is_free_tier;
  const q = d.free_model_daily_requests;
  if (q && [q.used, q.limit, q.remaining].every(entier)) sortie.requetesGratuitesDuJour = { utilisees: q.used, limite: q.limit, restantes: q.remaining };
  if (d.limit_remaining === null) sortie.creditRestantCle = null;
  else if (typeof d.limit_remaining === "number" && Number.isFinite(d.limit_remaining) && Math.abs(d.limit_remaining) <= 1e12) sortie.creditRestantCle = d.limit_remaining;
  if (["daily", "weekly", "monthly"].includes(d.limit_reset)) sortie.periodeCreditCle = d.limit_reset;
  const b = d.effective_budget;
  if (b && typeof b.remaining_usd === "number" && Number.isFinite(b.remaining_usd) && Math.abs(b.remaining_usd) <= 1e12) {
    sortie.budgetEffectif = { restantUSD: b.remaining_usd };
    if (["daily", "weekly", "monthly"].includes(b.reset_interval)) sortie.budgetEffectif.periode = b.reset_interval;
    if (dateISO(b.resets_at)) sortie.budgetEffectif.reinitialisationDate = dateISO(b.resets_at);
    else if (b.resets_at === null) sortie.budgetEffectif.reinitialisationDate = null;
  }
  return sortie;
}
function analyser(q, maintenant = new Date()) {
  const resultat = { cause429Historique: "NON_DETERMINEE_PAR_LE_QUOTA_ACTUEL" };
  if (q.requetesGratuitesDuJour?.restantes === 0) {
    resultat.constat = "QUOTA_QUOTIDIEN_GRATUIT_EPUISE_ACTUELLEMENT";
    const lendemain = new Date(maintenant);
    lendemain.setUTCHours(24,0,0,0);
    resultat.prochaineJourneeUTC = lendemain.toISOString();
    resultat.action = "Attendre la prochaine journée UTC ; changer de modèle ne rétablit pas ce quota de compte.";
  } else if (q.requetesGratuitesDuJour?.restantes > 0) {
    resultat.constat = "QUOTA_QUOTIDIEN_NON_EPUISE_ACTUELLEMENT";
    resultat.action = "Une limite temporaire de plateforme ou de fournisseur reste possible. Consulter le diagnostic 429 conservé ; ne pas changer de modèle sans preuve.";
  } else {
    resultat.constat = "QUOTA_QUOTIDIEN_NON_FOURNI_PAR_API";
    resultat.action = "Ne pas déduire un quota illimité ; consulter les indications du diagnostic 429.";
  }
  if (typeof q.creditRestantCle === "number" && q.creditRestantCle <= 0) resultat.limiteCreditCle = "PLAFOND_ATTEINT_OU_NEGATIF_APPLICABILITE_AUX_MODELES_GRATUITS_A_VERIFIER";
  if (q.budgetEffectif?.restantUSD <= 0) resultat.limiteBudget = "BUDGET_EFFECTIF_EPUISE_NE_PROUVE_PAS_LA_CAUSE_DU_429_GRATUIT";
  return resultat;
}
async function consulterQuota({ fetcher = fetch, cle = process.env.OPENROUTER_API_KEY } = {}) {
  if (typeof cle !== "string" || !cle.trim()) return { erreur: "OPENROUTER_API_KEY_ABSENTE", generations: 0 };
  try {
    const r = await fetcher("https://openrouter.ai/api/v1/key", { method: "GET", redirect: "error", headers: { Authorization: "Bearer " + cle }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { statutHTTP: r.status, erreur: await lireErreurFournisseur(r), generations: 0 };
    const d = await lireJSONBorne(r, 65536);
    if (!d?.data || typeof d.data !== "object" || Array.isArray(d.data)) return { erreur: "REPONSE_QUOTA_INVALIDE", generations: 0 };
    const quotas = quotaCompte(d.data);
    return { dateUTC: new Date().toISOString(), statutHTTP: r.status, quotas, analyse: analyser(quotas), generations: 0 };
  } catch (e) { return { erreur: ["TimeoutError", "AbortError"].includes(e?.name) ? "DELAI_QUOTA_DEPASSE" : "LECTURE_QUOTA_IMPOSSIBLE", generations: 0 }; }
}
async function executer(args) {
  if (args.length === 2 && args[0] === "--reference") {
    const diagnostics = require("./diagnostic-stockage").retrouver(args[1]);
    console.log(JSON.stringify({ reference: args[1], diagnostics, trouve: diagnostics.length > 0 }));
    return;
  }
  if (args.length !== 1 || args[0] !== "--quota") throw Error("USAGE");
  const resultat = await consulterQuota();
  console.log(JSON.stringify(resultat));
  if (resultat.erreur) process.exitCode = 1;
}
if (require.main === module) executer(process.argv.slice(2)).catch(() => { console.log(JSON.stringify({ erreur: "DIAGNOSTIC_LOCAL_IMPOSSIBLE" })); process.exitCode = 1; });
module.exports = { quotaCompte, analyser, consulterQuota };
