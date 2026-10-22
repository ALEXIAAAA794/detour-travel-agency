const { indicesQuota, preciser429 } = require("./quota-diagnostic");
const ORIGINE = "https://generativelanguage.googleapis.com/v1beta";
function modeleConfigure() {
  const modele = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim().replace(/^models\//, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(modele)) throw new Error("INVALID_MODEL_CONFIGURATION");
  return modele;
}
async function lireJSONBorne(reponse, maximum = 65536) {
  if (!reponse.body?.getReader) return reponse.json();
  const lecteur = reponse.body.getReader();
  const morceaux = [];
  let taille = 0;
  try {
    while (true) {
      const { value, done } = await lecteur.read();
      if (done) break;
      taille += value.byteLength;
      if (taille > maximum) { await lecteur.cancel(); throw Error("RESPONSE_TOO_LARGE"); }
      morceaux.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(morceaux).toString("utf8"));
  } finally { lecteur.releaseLock(); }
}
async function lireErreurFournisseur(reponse) {
  let corps;
  try { corps = await lireJSONBorne(reponse); } catch { corps = {}; }
  const e = corps?.error;
  const resultat = { statutHTTP: reponse.status };
  if (Number.isInteger(e?.code)) resultat.codeFournisseur = e.code;
  const statuts = ["INVALID_ARGUMENT", "UNAUTHENTICATED", "PERMISSION_DENIED", "NOT_FOUND", "RESOURCE_EXHAUSTED", "INTERNAL", "UNAVAILABLE", "DEADLINE_EXCEEDED", "FAILED_PRECONDITION"];
  if (statuts.includes(e?.status)) resultat.statutFournisseur = e.status;
  // Transformer le message en catégorie technique connue plutôt que risquer de
  // journaliser un prompt, un identifiant projet ou une clé renvoyés par Google.
  const message = typeof e?.message === "string" ? e.message : "";
  const categories = [
    [/no endpoints? found.*(?:data policy|privacy|zdr)|no endpoints? matching.*(?:data policy|privacy|zdr)/i, "NO_ENDPOINT_POLICY", "Aucun endpoint ne respecte les règles de confidentialité ou de routage du compte."],
    [/no endpoints? found|no available (?:model )?providers?|no endpoints? matching/i, "NO_COMPATIBLE_ENDPOINT", "Aucun fournisseur disponible ne satisfait les paramètres et contraintes de routage ; cela ne prouve pas que le modèle est absent."],
    [/not a valid model|invalid model (?:id|identifier)|model.*(?:does not exist|not found)|not found.*model/i, "MODEL_NOT_FOUND", "Identifiant de modèle refusé ou modèle introuvable ; vérifier le catalogue public."],
    [/high demand|overload|capacity/i, "MODEL_HIGH_DEMAND", "Le fournisseur signale une forte demande ou une capacité insuffisante."],
    [/service.*unavailable|temporarily unavailable/i, "SERVICE_UNAVAILABLE", "Le fournisseur indique que le service est indisponible."],
    [/quota|rate limit|resource.*exhaust/i, "QUOTA_OR_RATE_LIMIT", "Le fournisseur signale un quota ou une limitation de débit."],
    [/api.?key.*(?:not valid|invalid|expired)|invalid.*api.?key/i, "INVALID_API_KEY", "Le fournisseur refuse la clé API."],
    [/model.*(?:not found|not supported)|not found.*model/i, "MODEL_NOT_SUPPORTED", "Modèle introuvable ou non compatible avec cette méthode/version API."],
    [/invalid.*(?:argument|field|request)|unknown name|not supported/i, "INVALID_REQUEST", "Un champ, argument ou format de la requête est refusé."],
    [/permission|denied|billing|prepay/i, "ACCESS_OR_BILLING", "Accès ou configuration de facturation refusé ; aucune activation automatique."],
  ];
  const categorie = categories.find(([r]) => r.test(message));
  resultat.categorieFournisseur = categorie?.[1] || "UNCLASSIFIED";
  resultat.messageTechnique = categorie?.[2] || "Aucun message technique reconnu ne peut être affiché sans exposer de données brutes.";
  const retry = reponse.headers?.get?.("retry-after");
  if (typeof retry === "string" && /^\d{1,6}$/.test(retry)) resultat.reessaiApresSecondes = Number(retry);
  const info = Array.isArray(e?.details) ? e.details.find(d => d?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo") : null;
  if (typeof info?.retryDelay === "string" && /^\d{1,6}(?:\.\d{1,9})?s$/.test(info.retryDelay)) resultat.delaiReessai = info.retryDelay;
  Object.assign(resultat, indicesQuota(reponse, e?.metadata), preciser429(message, e?.code || reponse.status, e?.metadata));
  return resultat;
}
module.exports = { ORIGINE, modeleConfigure, lireJSONBorne, lireErreurFournisseur };
