process.env.SUPPORT_AI_RATE_LIMIT = "1000";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
process.env.SUPPORT_PREPARATIONS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "detour-programmes-test-"));
process.env.SUPPORT_DEMANDES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "detour-no-demandes-test-"));
require.cache[require.resolve("./emails")] = { exports: { planifierEmail: () => { throw Error("Aucun email ne doit être planifié par la génération"); } } };
process.env.GEMINI_API_KEY = "simulated";
process.env.GEMINI_MODEL = "modele-simule";
const { app } = require("./server");
const { validerProgramme, problemesPreferences } = require("./programmes");
const voyage = { destination: "Lyon", dates: "en mai, 2 jours", participants: 2, budget: "500 EUR", activites: "culture", experience: "détente", rythme: "calme", contraintes: "aucune" };
const programme = { statut: "proposition", titre: "Lyon indicatif", resume: "Suggestions à vérifier", itineraire: [{ jour: 1, titre: "Découverte", etapes: [{ lieu: "Lyon", activites: ["Promenade"] }] }], transports: ["Train à vérifier"], hebergements: ["Hôtel suggéré"], budget: { minimum: 300, maximum: 500, devise: "EUR", hypotheses: ["Deux voyageurs, hors acheminement"] }, informationsManquantes: [], pointsAVerifier: ["Disponibilités et tarifs non vérifiés"] };
test("validation stricte et dates impossibles/inversées", () => {
  assert.deepEqual(validerProgramme(programme), programme);
  for (const invalide of [null, {}, { ...programme, itineraire: [{ ...programme.itineraire[0], jour: 2 }] }, { ...programme, titre: "a".repeat(201) }, { ...programme, budget: { ...programme.budget, maximum: -1 } }, { ...programme, budget: { ...programme.budget, devise: 123 } }, { ...programme, itineraire: Array(31).fill(programme.itineraire[0]) }, { ...programme, transports: [123] }, { ...programme, statut: "precisions" }]) assert.throws(() => validerProgramme(invalide));
  assert.ok(problemesPreferences({ ...voyage, dates: "2027-02-30 au 2027-03-05" }).some(p => p.includes("impossible")));
  assert.ok(problemesPreferences({ ...voyage, dates: "20/05/2027 au 10/05/2027" }).some(p => p.includes("inversées")));
  assert.equal(problemesPreferences(voyage).length, 0);
});
test("API programmes : accès, contexte, versions, échecs, persistance et concurrence", async () => {
  const nativeFetch = global.fetch;
  let mode = "valide", finir, debut, requeteIA;
  global.fetch = async (url, options) => {
    if (!String(url).startsWith("https://generativelanguage.googleapis.com/")) return nativeFetch(url, options);
    requeteIA = { url, corps: JSON.parse(options.body) };
    if (mode === "attente") { debut(); await new Promise(r => { finir = r; }); }
    if (mode.startsWith("http")) return { ok: false, status: Number(mode.slice(4)) };
    if (mode === "timeout") { const e = new Error("secret-client-ne-pas-journaliser"); e.name = "TimeoutError"; throw e; }
    if (mode === "tronquee") return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: "MAX_TOKENS" }] }) };
    if (mode === "vide") return { ok: true, status: 200, json: async () => ({ candidates: [] }) };
    if (mode === "enveloppe") return { ok: true, status: 200, json: async () => { throw new SyntaxError("secret-client-ne-pas-journaliser"); } };
    if (mode === "panne") throw Error("panne simulée");
    let contenu = mode === "json" ? "{invalide" : mode === "structure" ? JSON.stringify({ titre: "incomplet" }) : JSON.stringify(mode === "dates" ? { ...programme, resume: "Départ le 2027-05-01" } : programme);
    if (mode === "fenced") contenu = "```json\n" + contenu + "\n```";
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: contenu }] } }] }) };
  };
  const serveur = app.listen(0, "127.0.0.1");
  await new Promise(r => serveur.once("listening", r));
  const base = "http://127.0.0.1:" + serveur.address().port;
  const req = (route, method, body, jeton) => fetch(base + route, { method, headers: { "Content-Type": "application/json", ...(jeton ? { Authorization: "Bearer " + jeton } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const a = await (await req("/api/support/preparations", "POST")).json();
    const b = await (await req("/api/support/preparations", "POST")).json();
    const route = "/api/support/preparations/" + a.id;
    const generer = (version, jeton = a.jeton, plus = {}) => req(route + "/programme", "POST", { versionAttendue: version, ...plus }, jeton);
    assert.equal((await generer(0, "")).status, 404);
    assert.equal((await generer(0, b.jeton)).status, 404);
    assert.equal((await generer(0)).status, 422);
    await req(route, "PATCH", { voyage }, a.jeton);
    assert.equal((await req(route + "/programme", "POST", {}, a.jeton)).status, 400);
    const valide = await generer(0, a.jeton, { voyage: { destination: "INJECTION_NAVIGATEUR" } });
    assert.equal(valide.status, 200);
    assert.equal((await valide.json()).programme.version, 1);
    assert.match(requeteIA.url, /modele-simule/);
    assert.match(requeteIA.corps.systemInstruction.parts[0].text, /Lyon/);
    assert.doesNotMatch(JSON.stringify(requeteIA), /INJECTION_NAVIGATEUR/);
    assert.equal(requeteIA.corps.generationConfig.maxOutputTokens, 16000);
    assert.equal(requeteIA.corps.generationConfig.responseMimeType, "application/json");
    const fichier = path.join(process.env.SUPPORT_PREPARATIONS_DIR, a.id + ".json");
    const original = fs.readFileSync(fichier, "utf8");
    const logs = [];
    const consoleInfo = console.info;
    console.info = ligne => logs.push(JSON.parse(ligne));
    try {
    for (const [m, statut] of [["json",502],["structure",502],["dates",502],["panne",503],["http400",503],["http429",503],["http503",503],["timeout",504],["tronquee",502],["vide",503],["enveloppe",503]]) {
      mode = m;
      assert.equal((await generer(1)).status, statut);
      assert.equal(fs.readFileSync(fichier, "utf8"), original);
    }
    } finally { console.info = consoleInfo; }
    for (const etape of ["programme_json", "schema", "dates", "appel_gemini", "http_gemini", "extraction", "enveloppe_json"]) assert.ok(logs.some(l => l.etape === etape), etape);
    assert.ok(logs.some(l => l.statutHTTP === 429));
    assert.ok(logs.some(l => l.fin === "MAX_TOKENS"));
    assert.ok(logs.some(l => l.code === "AI_TIMEOUT"));
    assert.ok(logs.some(l => l.code === "AI_NETWORK"));
    assert.doesNotMatch(JSON.stringify(logs), /secret-client|Lyon|simulated|Bearer|INJECTION_NAVIGATEUR/);
    mode = "attente";
    let commence = new Promise(r => { debut = r; });
    const enCours = generer(1);
    await commence;
    assert.equal((await generer(1)).status, 409);
    assert.equal((await req(route, "PATCH", { voyage: { ...voyage, rythme: "rapide" } }, a.jeton)).status, 409);
    finir();
    assert.equal((await enCours).status, 200);
    assert.equal((await generer(1)).status, 409);
    let restauree = await (await req(route, "GET", null, a.jeton)).json();
    assert.equal(restauree.programme.version, 2);
    assert.deepEqual(restauree.programme.contenu, programme);
    assert.equal(restauree.programmeObsolete, false);
    // Simuler un changement externe pendant le calcul : la réponse tardive est refusée.
    commence = new Promise(r => { debut = r; });
    const obsolete = generer(2);
    await commence;
    const externe = JSON.parse(fs.readFileSync(fichier));
    externe.voyage.destination = "Nantes";
    fs.writeFileSync(fichier, JSON.stringify(externe));
    finir();
    assert.equal((await obsolete).status, 409);
    restauree = await (await req(route, "GET", null, a.jeton)).json();
    assert.equal(restauree.programme.version, 2);
    assert.equal(restauree.voyage.destination, "Nantes");
    assert.equal(restauree.programmeObsolete, true);
    mode = "valide";
    assert.equal((await generer(2)).status, 200);
    assert.equal((await (await req(route, "GET", null, a.jeton)).json()).programme.version, 3);
    mode = "fenced";
    assert.equal((await generer(3)).status, 200);
    const avantSauvegarde = fs.readFileSync(fichier, "utf8");
    const renommer = fs.renameSync;
    fs.renameSync = () => { throw Error("secret stockage, ne pas afficher"); };
    try {
      const echecDisque = await generer(4);
      assert.equal(echecDisque.status, 500);
      const detail = await echecDisque.json();
      assert.equal(detail.error.code, "PROGRAMME_STORAGE");
      assert.doesNotMatch(JSON.stringify(detail), /secret stockage/);
      assert.equal(fs.readFileSync(fichier, "utf8"), avantSauvegarde);
    } finally { fs.renameSync = renommer; }
    assert.deepEqual(fs.readdirSync(process.env.SUPPORT_DEMANDES_DIR), []);
  } finally { global.fetch = nativeFetch; serveur.closeAllConnections(); await new Promise(r => serveur.close(r)); }
});
