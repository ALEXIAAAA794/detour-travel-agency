export function prebookingDraft(voyage = {}) {
  const exactDates = /^\d{4}-\d{2}-\d{2}$/.test(voyage.dateDepart || "")
    && /^\d{4}-\d{2}-\d{2}$/.test(voyage.dateRetour || "");
  const preferences = [
    ["Ville de départ", voyage.villeDepart],
    ["Activités", voyage.activites],
    ["Expérience recherchée", voyage.experience],
    ["Rythme", voyage.rythme],
    ["Contraintes", voyage.contraintes],
    ["Base du budget", voyage.baseBudget],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label} : ${value}`)
    .join("\n");

  return {
    destination: voyage.destination || "",
    departure: exactDates ? voyage.dateDepart : "",
    returnDate: exactDates ? voyage.dateRetour : "",
    datePreference: exactDates ? "" : voyage.dates || "",
    travelers: voyage.participants,
    budget: [voyage.budget, voyage.devise].filter(Boolean).join(" "),
    travelType: voyage.experience || "",
    preferences,
  };
}
