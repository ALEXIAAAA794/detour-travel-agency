// Dates civiles ISO : calcul UTC uniquement, sans conversion vers le fuseau local.
function dateValide(v) {
  if (typeof v !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v) || v.slice(0,4) === "0000") return false;
  const d = new Date(v + "T00:00:00.000Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v;
}
function problemesDates(v, complet = false) {
  const erreurs = [];
  for (const k of ["dateDepart", "dateRetour"]) {
    if (v[k] === undefined || v[k] === "") { if (complet) erreurs.push("Précisez " + k + " / Please enter both travel dates."); }
    else if (!dateValide(v[k])) erreurs.push("Date impossible / Invalid calendar date : " + k);
  }
  if (dateValide(v.dateDepart) && dateValide(v.dateRetour) && v.dateRetour < v.dateDepart) erreurs.push("Dates inversées / Return date must not precede departure.");
  return erreurs;
}
function dureeJours(v) {
  if (problemesDates(v, true).length) return null;
  return Math.round((Date.parse(v.dateRetour + "T00:00:00Z") - Date.parse(v.dateDepart + "T00:00:00Z")) / 86400000) + 1;
}
module.exports = { dateValide, problemesDates, dureeJours };
