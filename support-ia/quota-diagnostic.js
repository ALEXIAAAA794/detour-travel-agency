// Liste blanche commune aux erreurs, au journal privé et à la commande de quota.
const entier = v => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 1e15;
function dateISO(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)) return undefined;
  const n = Date.parse(v); return Number.isFinite(n) ? new Date(n).toISOString() : undefined;
}
function indicesQuota(reponse, metadata = {}) {
  const d = {};
  const get = n => reponse?.headers?.get?.(n);
  const retry = get("retry-after");
  if (typeof retry === "string" && /^\d{1,9}$/.test(retry)) d.reessaiApresSecondes = Number(retry);
  else if (typeof retry === "string" && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(retry) && Number.isFinite(Date.parse(retry))) d.reessaiApresDate = new Date(Date.parse(retry)).toISOString();
  for (const [header, champ] of [["x-ratelimit-limit", "quotaLimite"], ["x-ratelimit-remaining", "quotaRestant"], ["x-ratelimit-reset", "quotaReset"]]) {
    const v = get(header);
    if (typeof v === "string" && /^\d{1,15}$/.test(v) && entier(Number(v))) d[champ] = Number(v);
  }
  // Garder le reset numérique tel que reçu : unité non présumée.
  if (dateISO(get("x-ratelimit-reset"))) d.quotaResetDate = dateISO(get("x-ratelimit-reset"));
  if (["openrouter_guardrail_budget", "openrouter_workspace_budget", "openrouter_key_limit", "openrouter_in_flight_budget"].includes(metadata?.limit_source)) d.sourceLimite = metadata.limit_source;
  if (["workspace_default_member", "workspace_default_key", "member", "api_key", "workspace", "key_limit"].includes(metadata?.scope)) d.porteeLimite = metadata.scope;
  if (["rate_limit_exceeded", "provider_overloaded", "provider_unavailable", "payment_required", "authentication", "permission_denied", "not_found", "invalid_request", "timeout", "server", "unmapped"].includes(metadata?.error_type)) d.typeErreur = metadata.error_type;
  if (["rate_limited", "rate_limit_exceeded", "too_many_requests", "quota_exceeded"].includes(metadata?.provider_code)) d.codeAmont = metadata.provider_code;
  if (metadata?.reason === "in_flight_budget_exhausted") d.raisonLimite = metadata.reason;
  if (dateISO(metadata?.resets_at)) d.reinitialisationDate = dateISO(metadata.resets_at);
  for (const k of ["limit_usd", "spend_usd"]) if (typeof metadata?.[k] === "number" && Number.isFinite(metadata[k]) && metadata[k] >= 0 && metadata[k] <= 1e12) d[k === "limit_usd" ? "budgetLimiteUSD" : "budgetUtiliseUSD"] = metadata[k];
  return d;
}
function champsQuota(d) {
  // Revalider aussi au point de journalisation : pas de confiance dans l'appelant.
  const headers = new Map();
  if (entier(d.reessaiApresSecondes)) headers.set("retry-after", String(d.reessaiApresSecondes));
  else if (dateISO(d.reessaiApresDate)) headers.set("retry-after", new Date(d.reessaiApresDate).toUTCString());
  for (const [k,h] of [["quotaLimite","x-ratelimit-limit"],["quotaRestant","x-ratelimit-remaining"],["quotaReset","x-ratelimit-reset"]]) if (entier(d[k])) headers.set(h,String(d[k]));
  if (dateISO(d.quotaResetDate)) headers.set("x-ratelimit-reset",d.quotaResetDate);
  return indicesQuota({ headers }, { limit_source:d.sourceLimite, scope:d.porteeLimite, error_type:d.typeErreur, provider_code:d.codeAmont, reason:d.raisonLimite, resets_at:d.reinitialisationDate, limit_usd:d.budgetLimiteUSD, spend_usd:d.budgetUtiliseUSD });
}
const messages = {
  ACCOUNT_DAILY_QUOTA: "Le fournisseur signale une limite quotidienne de requêtes gratuites atteinte.",
  TEMPORARY_RATE_LIMIT: "Le fournisseur signale une limitation temporaire du débit.",
  PROVIDER_RATE_LIMIT: "Le fournisseur amont signale une limitation de débit ou une surcharge.",
  HTTP_429_UNSPECIFIED: "HTTP 429 : restriction de débit ou de quota dont la portée n’est pas précisée.",
};
function preciser429(message, statut, metadata = {}) {
  if (statut !== 429) return {};
  let categorieFournisseur = "HTTP_429_UNSPECIFIED";
  if (/free.models.per.day|daily.*(?:quota|limit)|(?:quota|limit).*per.day|requests.per.day/i.test(message)) categorieFournisseur = "ACCOUNT_DAILY_QUOTA";
  else if (/temporarily rate.limited|rate.limited upstream/i.test(message) || ["provider_overloaded","provider_unavailable"].includes(metadata?.error_type)) categorieFournisseur = "PROVIDER_RATE_LIMIT";
  else if (/per.minute|per.second|requests.per.min/i.test(message)) categorieFournisseur = "TEMPORARY_RATE_LIMIT";
  return { categorieFournisseur, messageExpurge: messages[categorieFournisseur] };
}
module.exports = { entier, dateISO, indicesQuota, champsQuota, messages, preciser429 };
