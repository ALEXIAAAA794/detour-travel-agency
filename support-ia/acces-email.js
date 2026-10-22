// Capacités email distinctes des jetons de session historiques ; jamais dans une demande conseiller.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {execFileSync} = require("node:child_process");
const proteges = new Set();
let sid;
function protegerDossier(dir) {
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  if(fs.lstatSync(dir).isSymbolicLink()) throw Error("UNSAFE_DIRECTORY");
  if(proteges.has(dir))return;
  if(process.platform==="win32") {
    sid ||= execFileSync("whoami.exe",["/user","/fo","csv","/nh"],{encoding:"utf8",windowsHide:true}).match(/S-1-5-[0-9-]+/)?.[0];
    if(!sid)throw Error("NO_SID");
    execFileSync("icacls.exe",[dir,"/inheritance:r","/grant:r","*"+sid+":(OI)(CI)F","*S-1-5-18:(OI)(CI)F","/Q"],{stdio:"ignore",windowsHide:true});
  } else fs.chmodSync(dir,0o700);
  proteges.add(dir);
}
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const secret = /^[a-f0-9]{64}$/;
const accesDir = () => process.env.SUPPORT_EMAIL_ACCESS_DIR || path.join(__dirname, "data", "acces-preparations");
const liensDir = () => process.env.SUPPORT_EMAIL_LINKS_DIR || path.join(__dirname, "data", "liens-email");
function origine() {
  const u = new URL(process.env.SUPPORT_PUBLIC_URL || "http://127.0.0.1:3001");
  if ((u.protocol !== "https:" && !(u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))) || u.username || u.password || u.search || u.hash || u.pathname !== "/") throw Error("INVALID_PUBLIC_URL");
  return u.origin;
}
function creerLien(reference, preparationId) {
  if (!uuid.test(reference) || !uuid.test(preparationId)) throw Error("INVALID_ID");
  const base = origine();
  const ttl = Number(process.env.SUPPORT_EMAIL_LINK_TTL_SECONDS || 86400);
  if (!Number.isSafeInteger(ttl) || ttl < 300 || ttl > 604800) throw Error("INVALID_TTL");
  protegerDossier(liensDir());
  const fichier = path.join(liensDir(), reference + ".json");
  if (fs.existsSync(fichier)) {
    const existant = JSON.parse(fs.readFileSync(fichier, "utf8"));
    if (existant.preparationId !== preparationId) throw Error("LINK_CONFLICT");
    return; // même événement email => même lien, sans prolonger sa validité
  }
  const jeton = crypto.randomBytes(32).toString("hex");
  const empreinte = crypto.createHash("sha256").update(jeton).digest("hex");
  const expireLe = new Date(Date.now() + ttl * 1000).toISOString();
  const dossier = path.join(accesDir(), preparationId);
  protegerDossier(accesDir());
  protegerDossier(dossier);
  fs.writeFileSync(path.join(dossier, empreinte + ".json"), JSON.stringify({ preparationId, expireLe }), { flag: "wx", mode: 0o600 });
  const fragment = new URLSearchParams({ preparation: preparationId, jeton }).toString();
  try {
    fs.writeFileSync(fichier, JSON.stringify({ reference, preparationId, expireLe, url: base + "/assistant#" + fragment }), { flag: "wx", mode: 0o600 });
  } catch (e) { if (e.code !== "EEXIST") throw e; }
}
function verifierLien(preparationId, jeton, maintenant = Date.now()) {
  if (!uuid.test(preparationId) || !secret.test(jeton)) return "invalide";
  try {
    const empreinte = crypto.createHash("sha256").update(jeton).digest("hex");
    const d = JSON.parse(fs.readFileSync(path.join(accesDir(), preparationId, empreinte + ".json"), "utf8"));
    if (d.preparationId !== preparationId || !Number.isFinite(Date.parse(d.expireLe))) return "invalide";
    return Date.parse(d.expireLe) <= maintenant ? "expire" : "valide";
  } catch { return "invalide"; }
}
module.exports = { creerLien, verifierLien };
