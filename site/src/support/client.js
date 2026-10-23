// Client commun au widget et à la page : aucun programme navigateur n’est transmis.
// React StrictMode peut construire deux fois le client avant l'effet de restauration.
// Retenir le fragment retiré uniquement en mémoire pour la même fenêtre, jamais dans l'URL réseau.
const accesParHistorique = new WeakMap();
export function createSupportClient({ fetchImpl = fetch, storage, location, history } = {}) {
  let current = null, creating = null, accesEmail = null, lienInvalide = false, lastMessageRecorded = false;
  const precedent = history && accesParHistorique.get(history);
  if (precedent) ({accesEmail, lienInvalide} = precedent);
  if (location && ["/assistant", "/assistant.html"].includes(location.pathname) && location.hash) {
    const lien = new URLSearchParams(location.hash.slice(1));
    if (lien.has("jeton")) {
      const id=lien.get("preparation"), jeton=lien.get("jeton");
      if (/^[a-f0-9-]{36}$/i.test(id || "") && /^[a-f0-9]{64}$/.test(jeton || "")) accesEmail={id,jeton};
      else lienInvalide = true;
      if (history) accesParHistorique.set(history,{accesEmail,lienInvalide});
      history?.replaceState(null,"",location.pathname+location.search);
    }
  }
  const key = "detour-preparation";
  function readAccess() { try { const p = JSON.parse(storage?.getItem(key)); return p && typeof p.id === "string" && typeof p.jeton === "string" ? p : null; } catch { return null; } }
  async function request(route, body, access, timeout = 15000, method = "POST") {
    const r = await fetchImpl("/api/support/" + route, { method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(access ? { Authorization: "Bearer " + access.jeton } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(timeout) });
    const data = await r.json();
    if (!r.ok) {
      const e = new Error((data.error?.message || "Service indisponible. Réessayez.") + (Array.isArray(data.error?.precisions) ? " " + data.error.precisions.join(" ") : ""));
      e.code=data.error?.code; e.status=r.status; throw e;
    }
    return data;
  }
  function remember(p, jeton = p.jeton) {
    if (!p || typeof p.id !== "string" || typeof jeton !== "string" || !p.voyage || !Array.isArray(p.historique)) throw new Error("Préparation reçue invalide.");
    current = { ...p, jeton };
    try { storage?.setItem(key, JSON.stringify({ id: current.id, jeton })); } catch { /* La session en mémoire reste utilisable. */ }
    return current;
  }
  async function ensure() {
    if (lienInvalide) throw new Error("Lien de préparation invalide. Contactez un conseiller via /contact.");
    if (current) return current;
    if (!creating) creating = (async () => {
      const acces = accesEmail || readAccess();
      return acces ? remember(await request("preparations/" + acces.id, null, acces, 8000, "GET"), acces.jeton) : remember(await request("preparations", null, null, 8000));
    })().finally(() => { creating = null; });
    return creating;
  }
  return {
    get current() { return current; },
    get lastMessageRecorded() { return lastMessageRecorded; },
    async restore() { return lienInvalide || accesEmail || readAccess() ? ensure() : null; },
    async start() { accesEmail = null; lienInvalide = false; if(history) accesParHistorique.delete(history); return remember(await request("preparations", null, null, 8000)); },
    async save(voyage) { const p = await ensure(); return remember(await request("preparations/" + p.id, { voyage }, p, 8000, "PATCH"), p.jeton); },
    async ask(message) { const p = await ensure(); return request("messages", { message, preparationId: p.id }, p, 70000); },
    async niciaConfig() { return request("nicia/config", null, null, 8000, "GET"); },
    async converse(body) {
      lastMessageRecorded=false;
      let p, count=0;
      try {
        p=await ensure(); count=p.historique.length; lastMessageRecorded=p.nicia?.tourEnAttente?.id===body.tourId;
        const data=await request("nicia/"+p.id+"/conversation",body,p,70000);
        remember(data.preparation,p.jeton); lastMessageRecorded=true; return data;
      } catch(e) {
        // Un seul GET de réconciliation, jamais une nouvelle génération automatique.
        if(p)try {
          const saved=await request("preparations/"+p.id,null,p,8000,"GET");
          remember(saved,p.jeton); e.preparationChecked=true;
          lastMessageRecorded=saved.nicia?.tourEnAttente?.id===body.tourId || Boolean(body.message && saved.historique.slice(count).some(m=>m.role==="user"&&m.content===body.message.trim()));
        }catch { /* Une coupure ne prouve pas la sauvegarde : conserver le texte à saisir. */ }
        throw e;
      }
    },
    async saveWishes(preferences) { const p=await ensure(); return remember(await request("nicia/"+p.id+"/envies", {preferences}, p, 8000, "PATCH"), p.jeton); },
    async handoff() { const p=await ensure(); return request("nicia/"+p.id+"/relais", {revisionAttendue:p.nicia?.revision||0}, p); },
    async generate() { const p = await ensure(); return remember(await request("preparations/" + p.id + "/programme", { versionAttendue: p.programme?.version || 0 }, p, 100000), p.jeton); },
    async modify(modification, version) {
      const p = await ensure();
      if (p.programme?.version !== version || p.programmeObsolete) throw new Error("Le programme a changé ou est obsolète. Relisez-le après rechargement ou régénération.");
      return remember(await request("preparations/" + p.id + "/programme/modifications", { versionAttendue: version, modification }, p, 100000), p.jeton);
    },
    async transmit(client, version, accord) {
      const p = await ensure();
      if (p.programme?.version !== version || p.programmeObsolete) throw new Error("Le programme a changé ou est obsolète. Relisez-le après rechargement ou régénération.");
      return request("preparations/" + p.id + "/programme/transmission", { versionAcceptee: version, accord, client }, p);
    },
    async confirmationPreferences() {
      const p = await this.restore();
      if (!p) throw new Error("Aucun envoi vérifiable / No verified submission. Consultez votre préparation / Open your preparation.");
      const proof = await request("preparations/" + p.id + "/confirmation-preferences", null, p, 8000, "GET");
      if (proof.type !== "preferences" || typeof proof.reference !== "string" || !/^[a-f0-9-]{36}$/i.test(proof.reference)) throw new Error("Confirmation invalide / Invalid confirmation.");
      return { reference: proof.reference, transmisLe: proof.transmisLe };
    },
    async sendPreferences(client, voyage, requestId) { const p = await ensure(); return request("demandes", { preparationId: p.id, requestId, client, voyage }, p); }
  };
}
