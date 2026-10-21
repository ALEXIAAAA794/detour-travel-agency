const { champsQuota, messages } = require("./quota-diagnostic");
const { enregistrer } = require("./diagnostic-stockage");
const crypto = require("node:crypto");
function echec(code, etape, details = {}) {
  const e = new Error(code);
  e.code = code;
  e.diagnostic = { etape, ...details };
  return e;
}
function tracer(reference, debut, resultat, details = {}) {
  // Liste blanche stricte : jamais d’erreur brute, URL, corps, clé ou identifiant client.
  const entree = { service: "programme", referenceDiagnostic: reference, resultat, dureeMs: Date.now() - debut };
  if (["gemini", "openrouter", "inconnu"].includes(details.fournisseur)) entree.fournisseur = details.fournisseur;
  if (details.fournisseur === "openrouter") {
    if (typeof details.modele === "string" && details.modele.length <= 160 && /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/.test(details.modele)) entree.modele = details.modele;
    if (["json_schema", "texte"].includes(details.formatReponse)) entree.formatReponse = details.formatReponse;
    if (details.routageGratuit === true) entree.routageGratuit = true;
  }
  const etapes = ["configuration", "appel_gemini", "http_gemini", "appel_openrouter", "http_openrouter", "enveloppe_json", "extraction", "programme_json", "schema", "dates", "taille", "sauvegarde", "preferences", "conflit", "termine"];
  if (["AI_CONFIGURATION", "AI_TIMEOUT", "AI_NETWORK", "AI_HTTP", "AI_INCOMPLETE", "AI_NO_CONTENT", "AI_EMPTY", "AI_RESPONSE_INVALID", "AI_RESPONSE_TOO_LARGE", "INVALID_PROGRAMME", "PROGRAMME_STORAGE"].includes(details.code)) entree.code = details.code;
  if (etapes.includes(details.etape)) entree.etape = details.etape;
  if (Number.isInteger(details.codeFournisseur) && details.codeFournisseur >= 100 && details.codeFournisseur <= 599) entree.codeFournisseur = details.codeFournisseur;
  if (["INVALID_ARGUMENT", "UNAUTHENTICATED", "PERMISSION_DENIED", "NOT_FOUND", "RESOURCE_EXHAUSTED", "INTERNAL", "UNAVAILABLE", "DEADLINE_EXCEEDED", "FAILED_PRECONDITION"].includes(details.statutFournisseur)) entree.statutFournisseur = details.statutFournisseur;
  if (["MODEL_HIGH_DEMAND", "SERVICE_UNAVAILABLE", "QUOTA_OR_RATE_LIMIT", "INVALID_API_KEY", "MODEL_NOT_SUPPORTED", "MODEL_NOT_FOUND", "NO_COMPATIBLE_ENDPOINT", "NO_ENDPOINT_POLICY", "INVALID_REQUEST", "ACCESS_OR_BILLING", "ACCOUNT_DAILY_QUOTA", "TEMPORARY_RATE_LIMIT", "PROVIDER_RATE_LIMIT", "HTTP_429_UNSPECIFIED", "UNCLASSIFIED"].includes(details.categorieFournisseur)) entree.categorieFournisseur = details.categorieFournisseur;
  if (Number.isSafeInteger(details.reessaiApresSecondes) && details.reessaiApresSecondes >= 0 && details.reessaiApresSecondes <= 999999) entree.reessaiApresSecondes = details.reessaiApresSecondes;
  if (typeof details.delaiReessai === "string" && /^\d{1,6}(?:\.\d{1,9})?s$/.test(details.delaiReessai)) entree.delaiReessai = details.delaiReessai;
  if (Number.isInteger(details.statutHTTP)) entree.statutHTTP = details.statutHTTP;
  if (["STOP", "MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"].includes(details.fin)) entree.fin = details.fin;
  if (Number.isSafeInteger(details.dureeAppelMs)) entree.dureeAppelMs = details.dureeAppelMs;
  Object.assign(entree, champsQuota(details));
  if (messages[entree.categorieFournisseur]) entree.messageExpurge = messages[entree.categorieFournisseur];
  entree.dateUTC = new Date().toISOString();
  console.info(JSON.stringify(entree));
  try { enregistrer(entree); } catch { console.error("Diagnostic privé non enregistré : vérifier le dossier et les permissions."); }

}
module.exports = { echec, tracer, referenceDiagnostic: () => crypto.randomUUID() };
