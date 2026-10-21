const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../site/js/assistant.js"), "utf8");
function page({ acces = null, fetch = async () => ({ ok: false }), stockageBloque = false } = {}) {
  const elements = new Map();
  class Element {
    constructor() { this.listeners = {}; this.children = []; this.style = {}; this.classList = { add() {} }; this.value = ""; this.disabled = false; }
    addEventListener(type, f) { this.listeners[type] = f; }
    appendChild(e) { this.children.push(e); }
    append(...e) { this.children.push(...e); }
    replaceChildren() { this.children = []; }
    querySelectorAll() { return []; }
    focus() {}
    scrollIntoView() {}
    setCustomValidity() {}
  }
  const document = { querySelector(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement() { return new Element(); } };
  const contexte = vm.createContext({ document, fetch, AbortSignal, sessionStorage: {
    getItem() { if (stockageBloque) throw Error("Storage denied"); return acces ? JSON.stringify(acces) : null; },
    setItem() { if (stockageBloque) throw Error("Storage denied"); }
  } });
  vm.runInContext(source, contexte);
  const texte = () => elements.get("#messages").children.map(e => e.textContent).join("\n");
  return { elements, contexte, texte, click: () => elements.get("#preparer-voyage").listeners.click(),
    async repondre(texte) { elements.get("#message").value = texte; await elements.get("#formulaire").listeners.submit({ preventDefault() {} }); } };
}
const tick = () => new Promise(r => setImmediate(r));
test("script référencé et bouton fonctionnel sans serveur de préparations", async () => {
  assert.match(fs.readFileSync(path.join(__dirname, "../site/assistant.html"), "utf8"), /<script src="\/js\/assistant.js"><\/script>/);
  let appels = 0;
  const p = page({ fetch: async () => { appels++; return { ok: false }; } });
  assert.equal(appels, 0);
  p.click();
  assert.match(p.texte(), /Où aimeriez-vous aller/);
  await p.repondre("Lyon");
  assert.match(p.texte(), /Quand souhaitez-vous partir/);
  assert.match(p.elements.get("#statut").textContent, /page uniquement/);
  assert.equal(p.elements.get("#envoyer").disabled, false);
});
test("stockage bloqué : le questionnaire reste utilisable", async () => {
  const p = page({ stockageBloque: true, fetch: async () => ({ ok: true, json: async () => ({ id: "nouvelle", jeton: "confidentiel", voyage: {}, historique: [] }) }) });
  p.click();
  await p.repondre("Lyon");
  assert.match(p.texte(), /Quand souhaitez-vous partir/);
  assert.equal(vm.runInContext("preparation.id", p.contexte), "nouvelle");
});
test("restauration refusée : erreur explicite et nouveau clic possible", async () => {
  const p = page({ acces: { id: "ancienne", jeton: "secret" } });
  await tick();
  assert.match(p.elements.get("#statut").textContent, /Préparation inaccessible/);
  p.click();
  assert.match(p.texte(), /Où aimeriez-vous aller/);
});
test("clic pendant restauration : aucune restauration tardive ne remplace le questionnaire", async () => {
  let terminer;
  const p = page({ acces: { id: "ancienne", jeton: "secret" }, fetch: () => new Promise(r => { terminer = r; }) });
  p.click();
  terminer({ ok: true, json: async () => ({ id: "ancienne", voyage: { destination: "ancienne destination" }, historique: [{ role: "user", content: "ancien échange" }] }) });
  await tick();
  assert.match(p.texte(), /Où aimeriez-vous aller/);
  assert.doesNotMatch(p.texte(), /ancien échange/);
  assert.equal(vm.runInContext("etapeVoyage", p.contexte), 0);
  assert.equal(p.elements.get("#envoyer").disabled, false);
});
test("restauration du brouillon : première préférence manquante et historique", async () => {
  const p = page({ acces: { id: "ancienne", jeton: "secret" }, fetch: async () => ({ ok: true, json: async () => ({ id: "ancienne", voyage: { destination: "Lyon", experience: "culture" }, historique: [{ role: "user", content: "Lyon" }] }) }) });
  await tick();
  assert.match(p.texte(), /Vous : Lyon/);
  assert.match(p.texte(), /Quand souhaitez-vous partir/);
  assert.equal(vm.runInContext("etapeVoyage", p.contexte), 1);
});
