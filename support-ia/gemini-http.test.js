const { test } = require("node:test");
const assert = require("node:assert/strict");
const { modeleConfigure, lireJSONBorne, lireErreurFournisseur } = require("./gemini-http");
const { tracer } = require("./diagnostic");
test("modèle configurable : défaut conservé, préfixe models/ accepté, nom invalide refusé sans fuite", () => {
  const avant = process.env.GEMINI_MODEL;
  try {
    delete process.env.GEMINI_MODEL;
    assert.equal(modeleConfigure(), "gemini-3.8-flash");
    process.env.GEMINI_MODEL = "models/gemini-3.1-flash-lite";
    assert.equal(modeleConfigure(), "gemini-3.1-flash-lite");
    process.env.GEMINI_MODEL = "secret?key=confidentiel";
    assert.throws(modeleConfigure, { message: "INVALID_MODEL_CONFIGURATION" });
  } finally { if (avant === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = avant; }
});
test("erreur Google expurgée : statut, message technique connu et RetryInfo sans données brutes", async () => {
  const details = await lireErreurFournisseur(new Response(JSON.stringify({ error: { code: 503, status: "UNAVAILABLE", message: "High demand. key=secret-tres-confidentiel, client@example.invalid, projet/prive", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "3.5s" }, { "@type": "type.googleapis.com/google.rpc.ErrorInfo", metadata: { apiKey: "secret-tres-confidentiel" } }] } }), { status: 503, headers: { "Retry-After": "4" } }));
  assert.equal(details.codeFournisseur, 503);
  assert.equal(details.statutFournisseur, "UNAVAILABLE");
  assert.equal(details.categorieFournisseur, "MODEL_HIGH_DEMAND");
  assert.equal(details.reessaiApresSecondes, 4);
  assert.equal(details.delaiReessai, "3.5s");
  assert.match(details.messageTechnique, /forte demande/);
  assert.doesNotMatch(JSON.stringify(details), /confidentiel|client@example|projet\/prive/);
  const initial = console.info;
  let log;
  console.info = s => { log = s; };
  try { tracer("diagnostic-local", Date.now(), "echec", { ...details, messageTechnique: "secret-tres-confidentiel" }); }
  finally { console.info = initial; }
  assert.doesNotMatch(log, /confidentiel/);
  assert.match(log, /MODEL_HIGH_DEMAND/);
});
test("erreur non reconnue, non JSON et réponse volumineuse : lecture bornée sans fuite", async () => {
  const inconnue = await lireErreurFournisseur(new Response(JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT", message: "client@example.invalid a demandé une conversation privée" } }), { status: 400 }));
  assert.equal(inconnue.categorieFournisseur, "UNCLASSIFIED");
  assert.doesNotMatch(JSON.stringify(inconnue), /client@example|conversation privée/);
  const nonJson = await lireErreurFournisseur(new Response("<html>secret</html>", { status: 503 }));
  assert.equal(nonJson.statutHTTP, 503);
  assert.doesNotMatch(JSON.stringify(nonJson), /secret/);
  await assert.rejects(lireJSONBorne(new Response("a".repeat(100)), 10), /RESPONSE_TOO_LARGE/);
});

test("OpenRouter 404 : modèle absent, routage incompatible et politique restent distincts et expurgés", async () => {
  const cas = [
    ["No endpoints found that support the requested parameters. secret@example.invalid", "NO_COMPATIBLE_ENDPOINT"],
    ["No endpoints found matching your data policy. secret@example.invalid", "NO_ENDPOINT_POLICY"],
    ["unknown/model:free is not a valid model ID. secret@example.invalid", "MODEL_NOT_FOUND"],
    ["Model does not exist. secret@example.invalid", "MODEL_NOT_FOUND"],
    ["secret@example.invalid", "UNCLASSIFIED"]
  ];
  const info = console.info;
  const logs = [];
  console.info = s => logs.push(s);
  try {
    for (const [message, categorie] of cas) {
      const d = await lireErreurFournisseur(Response.json({ error: { code: 404, message, metadata: { raw: 'conversation-privee' } } }, { status: 404 }));
      assert.equal(d.codeFournisseur, 404);
      assert.equal(d.categorieFournisseur, categorie);
      assert.doesNotMatch(JSON.stringify(d), /example.invalid|conversation-privee|unknown\/model/);
      tracer('test-404', Date.now(), 'echec', { ...d, fournisseur: 'openrouter', modele: 'xingchen-agi/xing4.0-29b-a4b:free', formatReponse: 'json_schema', routageGratuit: true });
    }
    tracer('test-secret', Date.now(), 'echec', { fournisseur: 'openrouter', modele: 'https://secret?key=prive', formatReponse: 'conversation-privee' });
  } finally { console.info = info; }
  assert.match(logs.join('\n'), /NO_COMPATIBLE_ENDPOINT/);
  assert.match(logs.join('\n'), /MODEL_NOT_FOUND/);
  assert.doesNotMatch(logs.join('\n'), /example.invalid|conversation-privee|secret\?key/);
});
