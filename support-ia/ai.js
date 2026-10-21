const { echec } = require("./diagnostic");
function fournisseurConfigure() {
  const fournisseur = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (!["gemini", "openrouter"].includes(fournisseur)) throw echec("AI_CONFIGURATION", "configuration", { fournisseur: "inconnu" });
  return fournisseur;
}
function nomFournisseur(fournisseur) { return fournisseur === "gemini" ? "Gemini" : fournisseur === "openrouter" ? "OpenRouter" : "Fournisseur IA"; }
async function interrogerIA(message, preparation, options = {}) {
  const fournisseur = fournisseurConfigure();
  try {
    const api = fournisseur === "gemini" ? require("./gemini") : require("./openrouter");
    return await api.interrogerIA(message, preparation, options);
  } catch (e) {
    // Ne pas copier l’erreur brute ni la configuration dans les diagnostics.
    if (!e.code) e = echec("AI_NETWORK", "extraction");
    e.diagnostic = { ...e.diagnostic, fournisseur };
    throw e;
  }
}
module.exports = { fournisseurConfigure, nomFournisseur, interrogerIA };
