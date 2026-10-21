const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dossier = process.env.SUPPORT_DEMANDES_DIR || path.join(__dirname, "data", "demandes");
function verrouiller() {
  fs.mkdirSync(dossier, { recursive: true });
  const verrou = path.join(dossier, ".ecriture.lock");
  fs.closeSync(fs.openSync(verrou, "wx", 0o600));
  let libere = false;
  return () => { if (!libere) { fs.unlinkSync(verrou); libere = true; } };
}
function trouver(preparationId) {
  if (!fs.existsSync(dossier)) return null;
  const correspondances = fs.readdirSync(dossier).filter(n => /^[0-9a-f-]{36}\.json$/i.test(n)).map(n => JSON.parse(fs.readFileSync(path.join(dossier,n), "utf8"))).filter(d => d.preparationId === preparationId);
  if (correspondances.length > 1) { const e = new Error("Plusieurs demandes liées à cette préparation : contactez le conseiller."); e.status = 409; throw e; }
  return correspondances[0] || null;
}
function ecrire(d) {
  const fichier = path.join(dossier, d.reference + ".json");
  const temp = fichier + "." + crypto.randomUUID() + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(d, null, 2), { mode: 0o600 });
  fs.renameSync(temp, fichier);
}
module.exports = { dossier, verrouiller, trouver, ecrire };
