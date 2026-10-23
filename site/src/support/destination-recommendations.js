import { DESTINATIONS } from "../data.js";

const EXPERIENCE_GROUPS = [
  {
    filter: "aventure",
    terms: ["aventure", "randonnee", "randonner", "trek", "nature", "plein air", "hiking", "outdoor"],
  },
  {
    filter: "gourmand",
    terms: ["gourmand", "gastronomie", "cuisine", "culinaire", "tapas", "food", "cooking"],
  },
  {
    filter: "creatif",
    terms: ["creatif", "creative", "creation", "artistique", "atelier", "art", "design", "craft"],
  },
  {
    filter: "insolite",
    terms: ["insolite", "original", "atypique", "different", "unusual", "unique"],
  },
  {
    filter: "lointain",
    terms: ["lointain", "grand voyage", "long voyage", "ailleurs", "far away", "long-haul"],
  },
];

const THEMES = [
  {
    terms: ["culture", "patrimoine", "architecture", "musee", "history", "historic"],
    destinations: ["lyon", "barcelone", "perou", "grece"],
  },
  {
    terms: ["detente", "repos", "relax", "slow", "calme", "mer", "plage", "sea"],
    destinations: ["grece", "barcelone", "nantes"],
  },
];

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesTerm(text, term) {
  return ` ${text} `.includes(` ${normalize(term)} `);
}

export function recommendDestinations(experience = "", activities = "") {
  const text = normalize(`${experience} ${activities}`.trim());
  if (!text) return [];

  const scores = new Map();
  const reasons = new Map();
  for (const group of EXPERIENCE_GROUPS) {
    if (!group.terms.some((term) => includesTerm(text, term))) continue;
    for (const destination of DESTINATIONS.filter((item) => item.filters.includes(group.filter))) {
      scores.set(destination.id, (scores.get(destination.id) || 0) + 1);
      reasons.set(destination.id, group.filter);
    }
  }

  for (const theme of THEMES) {
    if (!theme.terms.some((term) => includesTerm(text, term))) continue;
    for (const id of theme.destinations) {
      scores.set(id, (scores.get(id) || 0) + 1);
      if (!reasons.has(id)) reasons.set(id, "theme");
    }
  }

  return DESTINATIONS
    .filter((destination) => scores.has(destination.id))
    .sort((a, b) => scores.get(b.id) - scores.get(a.id))
    .slice(0, 3)
    .map((destination) => ({
      ...destination,
      matchReason: reasons.get(destination.id),
    }));
}
