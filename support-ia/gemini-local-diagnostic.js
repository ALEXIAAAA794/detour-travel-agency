// Outil manuel autonome : aucune préparation, demande, notification ou conversation lue.
const { ORIGINE, modeleConfigure, lireJSONBorne, lireErreurFournisseur } = require("./gemini-http");
async function executer() {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) { console.log(JSON.stringify({ erreur: "GEMINI_API_KEY absente du processus" })); process.exitCode = 1; return; }
  const mode = process.argv[2] || "--list";
  if (!["--list", "--minimal", "--json"].includes(mode)) throw Error("INVALID_MODE");
  const modele = modeleConfigure();
  console.log(JSON.stringify({ dateUTC: new Date().toISOString(), mode, modeleConfigure: modele, origine: ORIGINE, configurationClePresente: true, generationsMaximales: mode === "--list" ? 0 : 1 }));
  const debut = Date.now();
  const corps = mode === "--list" ? null : {
    contents: [{ role: "user", parts: [{ text: mode === "--minimal" ? 'Return exactly {"ok":true} and nothing else.' : 'Return only this tiny valid JSON travel programme, with no additional fields: {"statut":"proposition","titre":"Diagnostic","resume":"Synthetic test, not a real booking","itineraire":[{"jour":1,"titre":"Walk","etapes":[{"lieu":"City centre","activites":["Walk"]}]}],"transports":["Walking suggestion"],"hebergements":["To verify"],"budget":{"minimum":0,"maximum":10,"devise":"EUR","hypotheses":["Synthetic estimate"]},"informationsManquantes":[],"pointsAVerifier":["No availability verified"]}' }] }],
    generationConfig: { maxOutputTokens: mode === "--minimal" ? 256 : 2048, ...(mode === "--json" ? { responseMimeType: "application/json" } : {}) }
  };
  const r = await fetch(mode === "--list" ? ORIGINE + "/models?pageSize=1000" : ORIGINE + "/models/" + encodeURIComponent(modele) + ":generateContent", {
    method: corps ? "POST" : "GET", headers: { "x-goog-api-key": cle, ...(corps ? { "Content-Type": "application/json" } : {}) },
    ...(corps ? { body: JSON.stringify(corps) } : {}), signal: AbortSignal.timeout(30000)
  });
  if (!r.ok) { console.log(JSON.stringify({ dureeMs: Date.now() - debut, ...await lireErreurFournisseur(r) })); process.exitCode = 2; return; }
  const donnees = await lireJSONBorne(r, 1048576);
  if (mode === "--list") {
    const modeles = (donnees.models || []).filter(m => /^models\/[a-zA-Z0-9._-]+$/.test(m.name) && m.supportedGenerationMethods?.includes("generateContent")).map(m => ({ modele: m.name.replace(/^models\//,""), limiteEntree: m.inputTokenLimit, limiteSortie: m.outputTokenLimit }));
    console.log(JSON.stringify({ statutHTTP: r.status, dureeMs: Date.now() - debut, modeles, paginationRestante: Boolean(donnees.nextPageToken) }));
  } else {
    const candidat = donnees.candidates?.[0];
    const texte = candidat?.content?.parts?.filter(p => typeof p.text === "string" && !p.thought).map(p => p.text).join("") || "";
    let jsonValide = false, schemaProgrammeValide = false;
    try {
      const objet = JSON.parse(texte);
      jsonValide = true;
      if (mode === "--json") { require("./programmes").validerProgramme(objet); schemaProgrammeValide = true; }
    } catch {}
    console.log(JSON.stringify({ statutHTTP: r.status, dureeMs: Date.now() - debut, fin: ["STOP", "MAX_TOKENS", "SAFETY"].includes(candidat?.finishReason) ? candidat.finishReason : "OTHER", textePresent: Boolean(texte), jsonValide, ...(mode === "--json" ? { schemaProgrammeValide } : {}), ...(Number.isSafeInteger(donnees.usageMetadata?.totalTokenCount) ? { jetonsTotal: donnees.usageMetadata.totalTokenCount } : {}) }));
  }
}
if (require.main === module) executer().catch(e => { console.log(JSON.stringify({ erreur: ["TimeoutError","AbortError"].includes(e?.name) ? "NETWORK_TIMEOUT" : "LOCAL_DIAGNOSTIC_FAILED" })); process.exitCode = 1; });
