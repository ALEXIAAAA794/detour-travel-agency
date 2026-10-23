/* Illustrations de secours, aux couleurs de la charte (affichées tant qu'il n'y a pas de photo). */
function scene(svg) {
  const s =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">' +
    svg +
    "</svg>";
  return (
    "url(data:image/svg+xml," +
    encodeURIComponent(s).replace(/\(/g, "%28").replace(/\)/g, "%29") +
    ")"
  );
}

const SKY_SAND =
  '<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6ecdc"/><stop offset="1" stop-color="#D8C3A5"/></linearGradient></defs><rect width="400" height="200" fill="url(#a)"/>';
const SKY_BLUE =
  '<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e8eb"/><stop offset="1" stop-color="#f6efe3"/></linearGradient></defs><rect width="400" height="200" fill="url(#a)"/>';

export const SCENES = {
  barcelone: scene(
    SKY_SAND +
    '<circle cx="310" cy="64" r="28" fill="#C58B62"/>' +
    '<path d="M110 200V92l8-48 8 48v108zM140 200V70l9-58 9 58v130zM176 200V96l7-38 7 38v104zM212 200V74l9-52 9 52v126zM246 200V104l6-30 6 30v96zM272 200V120l5-22 5 22v80z" fill="#34495a"/>' +
    '<rect y="178" width="400" height="22" fill="#142B3A"/>'
  ),
  grece: scene(
    SKY_BLUE +
    '<circle cx="64" cy="44" r="20" fill="#C58B62"/>' +
    '<rect y="110" width="400" height="90" fill="#647985"/>' +
    '<path d="M0 200V150l70-24 90 14 80-30 90 28 70-8v70z" fill="#D8C3A5"/>' +
    '<rect x="48" y="126" width="46" height="44" fill="#fff"/><rect x="100" y="116" width="36" height="52" fill="#fff"/>' +
    '<rect x="150" y="136" width="52" height="34" fill="#fff"/><rect x="238" y="96" width="64" height="74" fill="#fff"/>' +
    '<path d="M246 96a24 24 0 0148 0z" fill="#4d6574"/><rect x="314" y="118" width="44" height="52" fill="#fff"/>' +
    '<rect x="256" y="120" width="12" height="22" fill="#647985"/><rect x="272" y="120" width="12" height="22" fill="#647985"/>'
  ),
  perou: scene(
    SKY_SAND +
    '<circle cx="92" cy="62" r="24" fill="#C58B62"/>' +
    '<path d="M0 142L90 84l60 40 70-62 80 72 100-42v110H0z" fill="#8da1ad"/>' +
    '<path d="M0 200v-48l120-50 80 40 90-60 110 80v38z" fill="#4d6574"/>' +
    '<path d="M226 162h126M240 176h112M256 190h96" stroke="#D8C3A5" stroke-width="5" fill="none"/>'
  ),
};

export const DESTINATIONS = [
  {
    id: "nantes", name: "Nantes", tag: "Nouveau", filters: ["insolite", "creatif"],
    short: "Machines imaginaires et nuit à l'Hôtel des Machines.",
    eyebrow: "Week-end créatif", title: "Nantes, la ville des machines",
    desc: "Un week-end créatif et décalé dans la cité des ducs, entre éléphant géant et ateliers imaginaires.",
    program: [
      ["Transport", "Train A/R depuis Paris"],
      ["Hébergement", "1 nuit à l'Hôtel des Machines", "Centre-ville"],
      ["Activité", "Atelier de machines imaginaires", "Sans effort sportif"],
    ],
    price: 179, cta: "Réserver ce week-end",
    g: "linear-gradient(160deg,#dfe5e9,#647985 60%,#D8C3A5)",
  },
  {
    id: "lyon", name: "Lyon", tag: "Top ventes", filters: ["insolite", "aventure"],
    short: "Enquête dans les traboules et hôtel au cœur de la ville.",
    eyebrow: "Jeu de piste", title: "Lyon, entre traboules et lumières",
    desc: "Partez à l'aventure dans le Vieux-Lyon avec notre jeu de piste exclusif, puis dormez au cœur de la Presqu'île.",
    program: [
      ["Transport", "Train A/R depuis Paris"],
      ["Hébergement", "1 nuit à l'Hôtel des Lumières", "Presqu'île"],
      ["Activité", "Enquête des traboules", "En extérieur"],
    ],
    price: 179, cta: "Réserver ce week-end",
    g: "linear-gradient(160deg,#ecdcc4,#C58B62 60%,#647985)",
  },
  {
    id: "lille", name: "Lille", tag: "Gourmand", filters: ["gourmand"],
    short: "Atelier gaufres et nuit au pied du Beffroi.",
    eyebrow: "Week-end gourmand", title: "Lille, gourmande et chaleureuse",
    desc: "Le Nord a du cœur ! Mettez la main à la pâte dans notre atelier gaufres puis flânez sur la Grand-Place.",
    program: [
      ["Transport", "Train A/R depuis Paris"],
      ["Hébergement", "1 nuit à l'Hôtel du Beffroi"],
      ["Activité", "Fabrique de gaufres", "Atelier culinaire"],
    ],
    price: 148, cta: "Réserver ce week-end",
    g: "linear-gradient(160deg,#e3e8eb,#8da1ad 50%,#D8C3A5)",
  },
  {
    id: "barcelone", name: "Barcelone", tag: "Soleil", filters: ["insolite", "gourmand"],
    short: "Gaudí, tapas et nuit à deux pas de la mer, en train de nuit ou de jour.",
    eyebrow: "Week-end au soleil", title: "Barcelone, entre Gaudí et tapas",
    desc: "Sagrada Família, ruelles du Born et dîner de tapas : un week-end dépaysant, sans prendre l'avion.",
    program: [
      ["Transport", "Train A/R depuis Paris", "Trajet direct"],
      ["Hébergement", "2 nuits en hôtel de charme", "Quartier gothique"],
      ["Activité", "Visite guidée de l'œuvre de Gaudí", "Suivie d'un atelier tapas"],
    ],
    price: 249, cta: "Réserver ce week-end",
    g: "linear-gradient(160deg,#f6ecdc,#C58B62 60%,#142B3A)",
    scene: SCENES.barcelone,
  },
  {
    id: "grece", name: "Grèce", tag: "Îles", filters: ["lointain", "gourmand"],
    short: "Ruelles blanches, criques secrètes et dîner face à la mer Égée.",
    eyebrow: "Grand voyage", title: "Grèce, la mer Égée à votre rythme",
    desc: "Ruelles blanches, criques secrètes et dîners face à la mer : une escapade dans les Cyclades, sans courir.",
    program: [
      ["Transport", "Vol A/R depuis Paris", "Ferry entre les îles"],
      ["Hébergement", "4 nuits en hôtel de charme", "Vue mer"],
      ["Activité", "Balade en bateau et dîner chez l'habitant", "Cuisine locale"],
    ],
    price: 499, cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#e3e8eb,#647985 60%,#142B3A)",
    scene: SCENES.grece,
  },
  {
    id: "perou", name: "Pérou", tag: "Grand voyage", filters: ["lointain", "aventure", "insolite"],
    short: "Cuzco, vallée sacrée et sentiers incas, à votre rythme.",
    eyebrow: "Aventure", title: "Pérou, sur les sentiers incas",
    desc: "Cuzco, vallée sacrée et terrasses de pierre : un voyage en altitude, préparé étape par étape pour arriver sereinement.",
    program: [
      ["Transport", "Vol A/R depuis Paris", "Train panoramique vers le Machu Picchu"],
      ["Hébergement", "8 nuits en hôtels et lodges", "Cuzco, vallée sacrée"],
      ["Activité", "Randonnée guidée sur un sentier inca", "Rythme adapté"],
    ],
    price: 1290, cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#ecdcc4,#8da1ad 55%,#4d6574)",
    scene: SCENES.perou,
  },
];

export const FILTERS = [
  ["all", "Toutes"], ["insolite", "Insolite"], ["creatif", "Créatif"],
  ["aventure", "Aventure"], ["gourmand", "Gourmand"], ["lointain", "Grands voyages"],
];

export const ICONS = {
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  headset: "M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1zM20 14h-3v5h2a1 1 0 001-1zM17 19c0 1.5-2 2-5 2",
  leaf: "M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8",
  shield: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z",
};
