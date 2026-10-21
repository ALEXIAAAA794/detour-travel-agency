const { interrogerIA } = require("./gemini");

async function main() {
  const reponse = await interrogerIA(
    "Réponds uniquement par : Gemini fonctionne."
  );

  console.log("Test Gemini réussi.");
  console.log("Réponse :", reponse);
}

main().catch((erreur) => {
  console.error(
    "Test Gemini échoué :",
    erreur instanceof Error ? erreur.message : erreur
  );
  process.exitCode = 1;
});
