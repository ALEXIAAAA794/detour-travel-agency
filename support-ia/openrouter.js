const { instructionSysteme } = require("./ai-context");
const { echec } = require("./diagnostic");
const { lireJSONBorne, lireErreurFournisseur } = require("./gemini-http");
const { programmeSchema } = require("./programme-schema");
const URL = "https://openrouter.ai/api/v1/chat/completions";
function modeleConfigure() {
  const modele = (process.env.OPENROUTER_MODEL || "").trim();
  // Pas de routeur auto, de modèle payant, de liste de secours ou d’URL configurable.
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/.test(modele)) throw echec("AI_CONFIGURATION", "configuration");
  return modele;
}
async function interrogerIA(message, preparation, options = {}) {
  const cle = process.env.OPENROUTER_API_KEY;
  if (!cle || !cle.trim()) throw echec("AI_CONFIGURATION", "configuration");
  const model = modeleConfigure();
  const corps = {
    model, stream: false, max_tokens: options.programme ? 8192 : 2000,
    provider: { require_parameters: true, allow_fallbacks: false, max_price: { prompt: 0, completion: 0, request: 0 } },
    messages: [
      { role: "system", content: instructionSysteme(preparation, options) },
      ...(preparation?.historique || []).slice(-40).filter(m => typeof m.content === "string").map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
      { role: "user", content: message }
    ],
    ...(options.programme ? { response_format: { type: "json_schema", json_schema: { name: "detour_programme", strict: true, schema: programmeSchema } } } : {})
  };
  const debut = Date.now();
  let r;
  try {
    r = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + cle }, body: JSON.stringify(corps), signal: AbortSignal.timeout(options.programme ? 90000 : 60000) });
  } catch (e) { throw echec(["TimeoutError", "AbortError"].includes(e?.name) ? "AI_TIMEOUT" : "AI_NETWORK", "appel_openrouter", { dureeAppelMs: Date.now() - debut }); }
  const details = { statutHTTP: r.status, dureeAppelMs: Date.now() - debut, modele: model, formatReponse: options.programme ? "json_schema" : "texte", routageGratuit: true };
  if (!r.ok) throw echec("AI_HTTP", "http_openrouter", { ...details, ...await lireErreurFournisseur(r) });
  let d;
  try { d = await lireJSONBorne(r, 512000); }
  catch (e) { throw echec(["TimeoutError", "AbortError"].includes(e?.name) ? "AI_TIMEOUT" : e.message === "RESPONSE_TOO_LARGE" ? "AI_RESPONSE_TOO_LARGE" : "AI_RESPONSE_INVALID", "enveloppe_json", details); }
  // OpenRouter peut signaler une erreur dans une enveloppe HTTP 200.
  if (d?.error) {
    const fournisseur = await lireErreurFournisseur({ status: r.status, json: async () => d, headers: r.headers });
    throw echec("AI_HTTP", "http_openrouter", { ...details, ...fournisseur });
  }
  const choix = d?.choices?.[0];
  if (!choix) throw echec("AI_NO_CONTENT", "extraction", details);
  if (choix.finish_reason !== "stop") throw echec("AI_INCOMPLETE", "extraction", { ...details, fin: choix.finish_reason === "length" ? "MAX_TOKENS" : choix.finish_reason === "content_filter" ? "SAFETY" : "OTHER" });
  const texte = choix.message?.content;
  if (typeof texte !== "string" || !texte.trim()) throw echec("AI_EMPTY", "extraction", details);
  return texte.trim();
}
module.exports = { interrogerIA, modeleConfigure };
