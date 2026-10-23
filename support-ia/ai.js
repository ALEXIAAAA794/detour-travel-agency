const { echec } = require("./diagnostic");
function fournisseurConfigure() {
  const fournisseur = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (!["gemini", "openrouter", "groq"].includes(fournisseur)) throw echec("AI_CONFIGURATION", "configuration", { fournisseur: "inconnu" });
  return fournisseur;
}
function nomFournisseur(fournisseur) { return fournisseur === "gemini" ? "Gemini" : fournisseur === "openrouter" ? "OpenRouter" : fournisseur === "groq" ? "Groq" : "Fournisseur IA"; }
async function interrogerIA(message, preparation, options = {}) {
  const fournisseur = fournisseurConfigure();
  try {
    const api = fournisseur === "gemini" ? require("./gemini") : fournisseur === "groq" ? require("./groq") : require("./openrouter");
    return await api.interrogerIA(message, preparation, options);
  } catch (e) {
    // Ne pas copier l’erreur brute ni la configuration dans les diagnostics.
    if (!e.code && !["INVALID_EXTRACTION","UNSAFE_REPLY"].includes(e.message)) e = echec("AI_NETWORK", "extraction");
    e.diagnostic = { ...e.diagnostic, fournisseur };
    throw e;
  }
}
module.exports = { fournisseurConfigure, nomFournisseur, interrogerIA };
