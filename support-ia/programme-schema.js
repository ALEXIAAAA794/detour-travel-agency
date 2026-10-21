// Contraintes de format envoyées au modèle. La validation métier de programmes.js
// reste obligatoire (ordre des jours, bornes croisées, informations indispensables, dates).
const texte = (maxLength = 1000) => ({ type: "string", minLength: 1, maxLength });
const objet = properties => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const liste = (items, maxItems, minItems = 0) => ({ type: "array", items, minItems, maxItems });
const textes = () => liste(texte(), 30);
const programmeSchema = objet({
  statut: { type: "string", enum: ["proposition", "precisions"] },
  titre: texte(200), resume: texte(3000),
  itineraire: liste(objet({ jour: { type: "integer", minimum: 1, maximum: 30 }, titre: texte(200), etapes: liste(objet({ lieu: texte(200), activites: liste(texte(), 10) }), 10, 1) }), 30),
  transports: textes(), hebergements: textes(),
  budget: objet({ minimum: { type: "number", minimum: 0, maximum: 100000000 }, maximum: { type: "number", minimum: 0, maximum: 100000000 }, devise: { type: "string", pattern: "^[A-Z]{3}$" }, hypotheses: liste(texte(), 30, 1) }),
  informationsManquantes: textes(), pointsAVerifier: textes()
});
module.exports = { programmeSchema };
