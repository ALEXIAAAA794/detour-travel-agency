const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
process.env.SUPPORT_PREPARATIONS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "detour-support-test-"));
process.env.GEMINI_API_KEY = "simulated-test-key";
process.env.GEMINI_MODEL = "test-model";
process.env.SUPPORT_DEMANDES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "detour-demandes-test-"));
require.cache[require.resolve("./emails")] = { exports: { planifierEmail: async () => ({ statut: "EN_ATTENTE" }) } };
const { app } = require("./server");
const nativeFetch = global.fetch;
let appels = [];
let panne = false;
global.fetch = async (url, options) => {
  if (String(url).startsWith("https://generativelanguage.googleapis.com/")) {
    appels.push({ url, body: JSON.parse(options.body) });
    if (panne) return { ok: false, status: 503 };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "Réponse simulée" }] } }] }) };
  }
  return nativeFetch(url, options);
};
test("préparations persistantes, contexte Gemini et accès confidentiel", async () => {
  const serveur = app.listen(0, "127.0.0.1");
  await new Promise(r => serveur.once("listening", r));
  const base = "http://127.0.0.1:" + serveur.address().port;
  async function requete(route, method = "GET", body, jeton) {
    return fetch(base + route, { method, headers: { "Content-Type": "application/json", ...(jeton ? { Authorization: "Bearer " + jeton } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  try {
    const a = await (await requete("/api/support/preparations", "POST")).json();
    const b = await (await requete("/api/support/preparations", "POST")).json();
    const route = "/api/support/preparations/" + a.id;
    assert.equal((await requete(route)).status, 404);
    assert.equal((await requete(route, "GET", null, b.jeton)).status, 404);
    assert.equal((await requete(route, "PATCH", { voyage: { participants: 0 } }, a.jeton)).status, 400);
    assert.equal((await requete(route, "PATCH", { voyage: { rythme: "tranquille", contraintes: "aucune" } }, a.jeton)).status, 200);
    for (const message of ["Bonjour", "Et mes préférences ?"]) {
      assert.equal((await requete("/api/support/messages", "POST", { message, preparationId: a.id }, a.jeton)).status, 200);
    }
    assert.match(appels[1].url, /test-model:generateContent/);
    assert.match(appels[1].body.systemInstruction.parts[0].text, /tranquille/);
    assert.ok(appels[1].body.contents.some(m => m.parts[0].text === "Bonjour"));
    assert.ok(appels[1].body.contents.some(m => m.role === "model" && m.parts[0].text === "Réponse simulée"));
    const reprise = await (await requete(route, "GET", null, a.jeton)).json();
    assert.equal(reprise.historique.length, 6);
    assert.equal(reprise.voyage.contraintes, "aucune");
    assert.equal(reprise.empreinte, undefined);
    const disque = JSON.parse(fs.readFileSync(path.join(process.env.SUPPORT_PREPARATIONS_DIR, a.id + ".json")));
    assert.equal(disque.jeton, undefined);
    assert.equal(disque.historique.length, 6);
    assert.equal((await (await requete("/api/support/preparations/" + b.id, "GET", null, b.jeton)).json()).historique.length, 0);
    assert.equal((await requete("/api/support/messages", "POST", { message: "privé", preparationId: a.id })).status, 404);
    const demande = {
      requestId: require("node:crypto").randomUUID(), preparationId: a.id,
      client: { nom: "Client test", email: "test@example.invalid" },
      voyage: { destination: "Lyon", dates: "mai", participants: 2, budget: "à définir", activites: "culture", experience: "détente", rythme: " tranquille ", contraintes: "aucune" }
    };
    assert.equal((await requete("/api/support/demandes", "POST", demande, b.jeton)).status, 404);
    assert.equal((await requete("/api/support/demandes", "POST", { ...demande, voyage: { ...demande.voyage, contraintes: " " } }, a.jeton)).status, 400);
    const creation = await requete("/api/support/demandes", "POST", demande, a.jeton);
    assert.equal(creation.status, 201);
    assert.equal((await creation.json()).email.statut, "EN_ATTENTE");
    assert.equal((await requete("/api/support/demandes", "POST", demande, a.jeton)).status, 200);
    const enregistree = JSON.parse(fs.readFileSync(path.join(process.env.SUPPORT_DEMANDES_DIR, demande.requestId + ".json")));
    assert.equal(enregistree.voyage.rythme, "tranquille");
    assert.equal(enregistree.preparationId, a.id);
    assert.equal(enregistree.jeton, undefined);
    assert.equal((await requete("/api/support/demandes", "POST", { ...demande, voyage: { ...demande.voyage, rythme: "soutenu" } }, a.jeton)).status, 409);
    panne = true;
    assert.equal((await requete("/api/support/messages", "POST", { message: "échec", preparationId: a.id }, a.jeton)).status, 503);
    assert.equal((await (await requete(route, "GET", null, a.jeton)).json()).historique.length, 6);
    assert.equal((await requete("/api/support/demandes", "POST", { requestId: "invalide" })).status, 400);
    assert.equal((await requete("/api/support/messages", "POST", { message: " " })).status, 400);
    assert.equal((await requete("/api/support/health")).status, 200);
  } finally { serveur.closeAllConnections(); await new Promise(r => serveur.close(r)); global.fetch = nativeFetch; }
});
