// Compteurs bornés du processus, sans IP ni jeton persisté, trust proxy reste désactivé.
const crypto = require("node:crypto");
function limiteur({ maximum = Number(process.env.SUPPORT_AI_RATE_LIMIT || 20), horloge = Date.now, maximumCles = 10000, portee = "ip" } = {}) {
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 10000) throw Error("INVALID_RATE_LIMIT");
  const compteurs = new Map();
  return (req, res, next) => {
    const maintenant = horloge();
    for (const [k,v] of compteurs) if (v.fin <= maintenant) compteurs.delete(k);
    const ip = crypto.createHash("sha256").update(req.socket.remoteAddress || "local").digest("hex");
    // Une requête anonyme avec un ID deviné ne doit pas épuiser le quota d'un autre client.
    const id = req.preparation?.id;
    if (portee === "preparation" && !id) return next();
    const ids = [portee === "preparation" ? "preparation:" + id : "ip:" + ip];
    const bloque = ids.map(k=>compteurs.get(k)).find(v=>v?.nombre >= maximum);
    if (bloque || compteurs.size + ids.filter(k=>!compteurs.has(k)).length > maximumCles) {
      const secondes = bloque ? Math.max(1,Math.ceil((bloque.fin-maintenant)/1000)) : 60;
      return res.status(429).set("Retry-After",String(secondes)).json({error:{code:"RATE_LIMITED",message:"Trop d’appels. Réessayez après " + secondes + " secondes. / Too many requests; please wait.",reessaiApresSecondes:secondes}});
    }
    for (const k of ids) { const v=compteurs.get(k)||{nombre:0,fin:maintenant+60000};v.nombre++;compteurs.set(k,v); }
    next();
  };
}
module.exports = { limiteur, limiterRequetes: limiteur(), limiterPreparation: limiteur({portee:"preparation"}) };
