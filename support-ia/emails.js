const path = require("node:path");
const { execFile } = require("node:child_process");

// Python est déjà utilisé par le back-office : ce module partage sa file d'emails.
function planifierEmail(reference, type, preparationId) {
  if (type === "reception" && preparationId) {
    try { require("./acces-email").creerLien(reference, preparationId); }
    catch { return Promise.resolve({ statut: "NON_PLANIFIE" }); }
  }
  return new Promise((resolve) => {
    const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "py" : "python3");
    execFile(python, [path.join(__dirname, "notifications.py"), "--enqueue", reference, type],
      { timeout: 5000, maxBuffer: 16384, windowsHide: true }, (erreur, sortie) => {
        if (erreur) return resolve({ statut: "NON_PLANIFIE" });
        try {
          const valeur = JSON.parse(sortie.trim());
          resolve({ statut: typeof valeur.statut === "string" ? valeur.statut : "NON_PLANIFIE" });
        } catch {
          resolve({ statut: "NON_PLANIFIE" });
        }
      });
  });
}

module.exports = { planifierEmail };
