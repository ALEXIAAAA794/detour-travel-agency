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
  const etapes = ["configuration", "appel_gemini", "http_gemini", "enveloppe_json", "extraction", "programme_json", "schema", "dates", "taille", "sauvegarde", "preferences", "conflit", "termine"];
  if (["AI_CONFIGURATION", "AI_TIMEOUT", "AI_NETWORK", "AI_HTTP", "AI_INCOMPLETE", "AI_NO_CONTENT", "AI_EMPTY", "AI_RESPONSE_INVALID", "AI_RESPONSE_TOO_LARGE", "INVALID_PROGRAMME", "PROGRAMME_STORAGE"].includes(details.code)) entree.code = details.code;
  if (etapes.includes(details.etape)) entree.etape = details.etape;
  if (Number.isInteger(details.statutHTTP)) entree.statutHTTP = details.statutHTTP;
  if (["STOP", "MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"].includes(details.fin)) entree.fin = details.fin;
  if (Number.isSafeInteger(details.dureeAppelMs)) entree.dureeAppelMs = details.dureeAppelMs;
  console.info(JSON.stringify(entree));
}
module.exports = { echec, tracer, referenceDiagnostic: () => crypto.randomUUID() };
