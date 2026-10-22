const modele = "gemini-3.8-flash";

async function interrogerIA(message) {
  const cleAPI = process.env.GEMINI_API_KEY;

  if (!cleAPI) {
    throw new Error("La clé Gemini est absente.");
  }

  const corpsRequete = {
    systemInstruction: {
      parts: [{
        text: [
          "Tu es l’assistant voyage de DÉTOUR, une agence française de voyages sur mesure.",
          "Ton ton est chaleureux, curieux, précis et léger, sans presser la personne ni en faire trop. Réponds en français, clairement et en quelques phrases.",
          "Aide à explorer des idées et pose une question utile si des informations manquent.",
          "Ne présente jamais un prix, une disponibilité, un horaire ou une réservation comme vérifié si ces données ne t’ont pas été fournies avec une date de vérification.",
          "Ne confirme jamais une réservation et ne prétends pas qu’un voyage est réservé. Un conseiller compose et confirme chaque proposition.",
          "Tu peux suggérer des idées d’itinéraire à partir des envies fournies, en les présentant comme des pistes à valider par un conseiller. Pour une proposition finale, un tarif ou une confirmation, invite la personne à transmettre sa demande à un conseiller DÉTOUR."
        ].join(" ")
      }]
    },
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
