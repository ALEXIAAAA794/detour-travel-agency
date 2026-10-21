// Client commun au widget et à la page : aucun programme navigateur n’est transmis.
export function createSupportClient({ fetchImpl = fetch, storage } = {}) {
  let current = null, creating = null;
  const key = "detour-preparation";
  function readAccess() { try { const p = JSON.parse(storage?.getItem(key)); return p && typeof p.id === "string" && typeof p.jeton === "string" ? p : null; } catch { return null; } }
  async function request(route, body, access, timeout = 15000, method = "POST") {
    const r = await fetchImpl("/api/support/" + route, { method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(access ? { Authorization: "Bearer " + access.jeton } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(timeout) });
    const data = await r.json();
    if (!r.ok) throw new Error((data.error?.message || "Service indisponible. Réessayez.") + (Array.isArray(data.error?.precisions) ? " " + data.error.precisions.join(" ") : ""));
    return data;
  }
  function remember(p, jeton = p.jeton) {
    if (!p || typeof p.id !== "string" || typeof jeton !== "string" || !p.voyage || !Array.isArray(p.historique)) throw new Error("Préparation reçue invalide.");
    current = { ...p, jeton };
    try { storage?.setItem(key, JSON.stringify({ id: current.id, jeton })); } catch { /* La session en mémoire reste utilisable. */ }
    return current;
  }
  async function ensure() {
    if (current) return current;
    if (!creating) creating = (async () => {
      const acces = readAccess();
      return acces ? remember(await request("preparations/" + acces.id, null, acces, 8000, "GET"), acces.jeton) : remember(await request("preparations", null, null, 8000));
    })().finally(() => { creating = null; });
    return creating;
  }
  return {
    get current() { return current; },
    async restore() { return readAccess() ? ensure() : null; },
    async start() { return remember(await request("preparations", null, null, 8000)); },
    async save(voyage) { const p = await ensure(); return remember(await request("preparations/" + p.id, { voyage }, p, 8000, "PATCH"), p.jeton); },
    async ask(message) { const p = await ensure(); return request("messages", { message, preparationId: p.id }, p, 70000); },
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
    async sendPreferences(client, voyage, requestId) { const p = await ensure(); return request("demandes", { preparationId: p.id, requestId, client, voyage }, p); }
  };
}
