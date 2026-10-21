const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const MAXIMUM = 512 * 1024;
let dossierTest;
function dossier() {
  if (process.env.SUPPORT_DIAGNOSTICS_DIR) return path.resolve(process.env.SUPPORT_DIAGNOSTICS_DIR);
  if (process.env.NODE_TEST_CONTEXT) return dossierTest ||= fs.mkdtempSync(path.join(os.tmpdir(), "detour-diagnostics-test-"));
  return path.join(__dirname, "private-diagnostics");
}
let securise;
function preparer() {
  const dir = dossier();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dir).isSymbolicLink()) throw Error("UNSAFE_DIRECTORY");
  if (securise !== dir) {
    if (process.platform === "win32") {
      const identite = execFileSync("whoami.exe", ["/user", "/fo", "csv", "/nh"], { encoding: "utf8", windowsHide: true });
      const sid = identite.match(/S-1-5-[0-9-]+/)?.[0];
      if (!sid) throw Error("NO_SID");
      execFileSync("icacls.exe", [dir, "/inheritance:r", "/grant:r", "*" + sid + ":(OI)(CI)F", "*S-1-5-18:(OI)(CI)F", "/Q"], { stdio: "ignore", windowsHide: true });
    } else fs.chmodSync(dir, 0o700);
    securise = dir;
  }
  return dir;
}
function enregistrer(entree) {
  const dir = preparer();
  const fichier = path.join(dir, "diagnostics.jsonl"), ancien = fichier + ".1";
  for (const f of [fichier, ancien]) if (fs.existsSync(f) && fs.lstatSync(f).isSymbolicLink()) throw Error("UNSAFE_FILE");
  const ligne = JSON.stringify(entree) + "\n";
  if (Buffer.byteLength(ligne) > 8192) throw Error("DIAGNOSTIC_TOO_LARGE");
  if (fs.existsSync(fichier) && fs.statSync(fichier).size + Buffer.byteLength(ligne) > MAXIMUM) {
    if (fs.existsSync(ancien)) fs.unlinkSync(ancien); // rotation du journal uniquement
    fs.renameSync(fichier, ancien);
  }
  fs.appendFileSync(fichier, ligne, { mode: 0o600 });
  if (process.platform !== "win32") fs.chmodSync(fichier, 0o600);
}
function retrouver(reference) {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(reference)) throw Error("INVALID_REFERENCE");
  const trouves = [];
  for (const nom of ["diagnostics.jsonl.1", "diagnostics.jsonl"]) {
    const f = path.join(dossier(), nom);
    if (!fs.existsSync(f)) continue;
    const st = fs.lstatSync(f);
    if (!st.isFile() || st.isSymbolicLink() || st.size > MAXIMUM) throw Error("UNSAFE_FILE");
    for (const ligne of fs.readFileSync(f, "utf8").split("\n")) {
      try { const d = JSON.parse(ligne); if (d.referenceDiagnostic === reference) trouves.push(d); } catch {}
    }
  }
  return trouves;
}
module.exports = { enregistrer, retrouver, dossier, MAXIMUM };
