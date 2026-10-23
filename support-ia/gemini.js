const { ORIGINE, modeleConfigure, lireErreurFournisseur } = require("./gemini-http");
const { instructionSysteme } = require("./ai-context");
const { echec } = require("./diagnostic");


async function interrogerIA(message, preparation, options = {}) {
  const cleAPI = process.env.GEMINI_API_KEY || process.env.IA_API_KEY;
  if (!cleAPI) {
    throw echec("AI_CONFIGURATION", "configuration");
      }
  let modele;
  try { modele = modeleConfigure(); }
  catch { throw echec("AI_CONFIGURATION", "configuration"); }
      const corpsRequete = {
    systemInstruction: { parts: [{ text: instructionSysteme(preparation, options) }] },
    ...(options.programme || options.nicia ? { generationConfig: { maxOutputTokens: options.nicia ? 4096 : 16000, responseMimeType: "application/json" } } : {}),
    contents: [
      ...(preparation?.historique || []).slice(-40).map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: message }] }
    ]
  };

  const debutAppel = Date.now();
  let reponse;
  try {

  reponse = await fetch(
    ORIGINE + "/models/" + encodeURIComponent(modele) + ":generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": cleAPI
      },
      body: JSON.stringify(corpsRequete),
      signal: AbortSignal.timeout(options.programme ? 90000 : 60000)
    }
  );

  } catch (e) {
    throw echec(e.name === "TimeoutError" || e.name === "AbortError" ? "AI_TIMEOUT" : "AI_NETWORK", "appel_gemini", { dureeAppelMs: Date.now() - debutAppel });
  }
  const details = { statutHTTP: reponse.status, dureeAppelMs: Date.now() - debutAppel };
  if (!reponse.ok) {
    // Lire une enveloppe bornée, ne conserver que les détails techniques expurgés.
    const fournisseur = await lireErreurFournisseur(reponse);
    throw echec("AI_HTTP", "http_gemini", { ...details, ...fournisseur });
  }
  try {
  let donnees;
  if ((options.programme || options.nicia) && reponse.body?.getReader) {
    const lecteur = reponse.body.getReader();
    const morceaux = [];
    let taille = 0;
    try {
      while (true) {
        const { done, value } = await lecteur.read();
        if (done) break;
        taille += value.byteLength;
        if (taille > 512000) { await lecteur.cancel(); throw echec("AI_RESPONSE_TOO_LARGE", "taille", details); }
        morceaux.push(Buffer.from(value));
      }
      donnees = JSON.parse(Buffer.concat(morceaux).toString("utf8"));
    } finally { lecteur.releaseLock(); }
  } else donnees = await reponse.json();
  if ((options.programme || options.nicia) && donnees.candidates?.[0]?.finishReason && donnees.candidates[0].finishReason !== "STOP") throw echec("AI_INCOMPLETE", "extraction", { ...details, fin: donnees.candidates[0].finishReason });

    const parties = donnees.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parties)) {
    throw echec("AI_NO_CONTENT", "extraction", details);
  }

  const texte = parties
    .filter((partie) => typeof partie.text === "string" && !partie.thought)
    .map((partie) => partie.text)
    .join("")
    .trim();

  if (texte === "") {
    throw echec("AI_EMPTY", "extraction", details);
  }

  return texte;
  } catch (e) {
    if (e.diagnostic) throw e;
    throw echec(e.name === "TimeoutError" || e.name === "AbortError" ? "AI_TIMEOUT" : "AI_RESPONSE_INVALID", e.name === "SyntaxError" ? "enveloppe_json" : "extraction", { ...details, dureeAppelMs: Date.now() - debutAppel });
  }
  }


module.exports = { interrogerIA };