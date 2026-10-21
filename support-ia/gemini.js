const modele = "gemini-3.8-flash";

async function interrogerIA(message) {
  const cleAPI = process.env.GEMINI_API_KEY;

  if (!cleAPI) {
    throw new Error("La clé Gemini est absente.");
  }

  const corpsRequete = {
    contents: [
      {
        role: "user",
        parts: [
          { text: message }
        ]
      }
    ]
  };

  console.log(`Envoi de la requête à Gemini (${modele}).`);

  const reponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": cleAPI
      },
      body: JSON.stringify(corpsRequete),
      signal: AbortSignal.timeout(60000)
    }
  );

  if (!reponse.ok) {
    const corpsErreur = await reponse.text();
    let detail = "";

    try {
      detail = JSON.parse(corpsErreur).error?.message || "";
    } catch {
      detail = corpsErreur;
    }

    throw new Error(
      `Erreur du service Gemini : HTTP ${reponse.status}` +
        (detail ? ` — ${detail}` : "")
    );
  }

  const donnees = await reponse.json();

  const parties = donnees.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parties)) {
    throw new Error("Gemini n’a pas fourni de réponse exploitable.");
  }

  const texte = parties
    .filter((partie) => typeof partie.text === "string" && !partie.thought)
    .map((partie) => partie.text)
    .join("")
    .trim();

  if (!texte) {
    throw new Error("Gemini a renvoyé une réponse vide.");
  }

  return texte;
}

module.exports = { interrogerIA };