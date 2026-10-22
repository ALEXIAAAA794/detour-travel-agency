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
  '<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F1E7"/><stop offset="1" stop-color="#BCD3EA"/></linearGradient></defs><rect width="400" height="200" fill="url(#a)"/>';
const SKY_BLUE =
  '<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BCD3EA"/><stop offset="1" stop-color="#F6F1E7"/></linearGradient></defs><rect width="400" height="200" fill="url(#a)"/>';

export const SCENES = {
  nantes: scene(
    SKY_BLUE +
    '<path d="M0 136h400v64H0z" fill="#BCD3EA"/>' +
    '<path d="M0 145l55-18 44 14 50-34 46 32 44-20 53 19 48-31 60 26v67H0z" fill="#16233F"/>' +
    '<path d="M32 200v-42h32v42m38 0v-63h28v63m46 0v-48h32v48m44 0v-77h30v77m40 0v-55h30v55" fill="#F6F1E7"/>'
  ),
  lyon: scene(
    SKY_SAND +
    '<path d="M0 147h400v53H0z" fill="#BCD3EA"/>' +
    '<path d="M0 128l44-22 44 22 44-34 48 34 42-28 45 28 44-42 50 42 39-18v72H0z" fill="#16233F"/>' +
    '<path d="M0 158q50-16 100 0t100 0 100 0 100 0v42H0z" fill="#6B7385"/>' +
    '<path d="M90 144v-36h16v36m95 0v-40h16v40m78 0v-44h16v44" stroke="#F6F1E7" stroke-width="5"/>'
  ),
  lille: scene(
    SKY_BLUE +
    '<path d="M0 200V93h65v107zm80 0V76h57v124zm75 0V105h52v95zm70 0V84h58v116zm74 0V119h49v81z" fill="#16233F"/>' +
    '<path d="M170 79V42l10-11 10 11v38h-7V51h-7v28zm-8 26 28-25 28 25v10h-56z" fill="#6B7385"/>' +
    '<path d="M0 200h400" stroke="#F6F1E7" stroke-width="4"/>'
  ),
  barcelone: scene(
    SKY_SAND +
    '<circle cx="310" cy="64" r="28" fill="#BCD3EA"/>' +
    '<path d="M110 200V92l8-48 8 48v108zM140 200V70l9-58 9 58v130zM176 200V96l7-38 7 38v104zM212 200V74l9-52 9 52v126zM246 200V104l6-30 6 30v96zM272 200V120l5-22 5 22v80z" fill="#16233F"/>' +
    '<rect y="178" width="400" height="22" fill="#16233F"/>'
  ),
  grece: scene(
    SKY_BLUE +
    '<circle cx="64" cy="44" r="20" fill="#F6F1E7"/>' +
    '<rect y="110" width="400" height="90" fill="#6B7385"/>' +
    '<path d="M0 200V150l70-24 90 14 80-30 90 28 70-8v70z" fill="#BCD3EA"/>' +
    '<rect x="48" y="126" width="46" height="44" fill="#F6F1E7"/><rect x="100" y="116" width="36" height="52" fill="#F6F1E7"/>' +
    '<rect x="150" y="136" width="52" height="34" fill="#F6F1E7"/><rect x="238" y="96" width="64" height="74" fill="#F6F1E7"/>' +
    '<path d="M246 96a24 24 0 0148 0z" fill="#16233F"/><rect x="314" y="118" width="44" height="52" fill="#F6F1E7"/>' +
    '<rect x="256" y="120" width="12" height="22" fill="#6B7385"/><rect x="272" y="120" width="12" height="22" fill="#6B7385"/>'
  ),
  perou: scene(
    SKY_SAND +
    '<circle cx="92" cy="62" r="24" fill="#BCD3EA"/>' +
    '<path d="M0 142L90 84l60 40 70-62 80 72 100-42v110H0z" fill="#BCD3EA"/>' +
    '<path d="M0 200v-48l120-50 80 40 90-60 110 80v38z" fill="#16233F"/>' +
    '<path d="M226 162h126M240 176h112M256 190h96" stroke="#BCD3EA" stroke-width="5" fill="none"/>'
  ),
};

export const DESTINATIONS = [
  {
    id: "nantes", name: "Nantes", tag: "Créatif", filters: ["insolite", "creatif"],
    short: "Machines imaginaires et nuit à l'Hôtel des Machines.",
    eyebrow: "Week-end créatif", title: "Nantes, la ville des machines",
    desc: "Un week-end créatif et décalé dans la cité des ducs, entre éléphant géant et ateliers imaginaires.",
    program: [
      ["Transport", "Train A/R depuis Paris"],
      ["Hébergement", "1 nuit à l'Hôtel des Machines", "Centre-ville"],
      ["Activité", "Atelier de machines imaginaires", "Sans effort sportif"],
    ],
    cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#BCD3EA,#6B7385 60%,#BCD3EA)", scene: SCENES.nantes,
  },
  {
    id: "lyon", name: "Lyon", tag: "Enquête", filters: ["insolite", "aventure"],
    short: "Enquête dans les traboules et hôtel au cœur de la ville.",
    eyebrow: "Jeu de piste", title: "Lyon, entre traboules et lumières",
    desc: "Partez à l'aventure dans le Vieux-Lyon avec notre jeu de piste exclusif, puis dormez au cœur de la Presqu'île.",
    program: [
      ["Transport", "Train A/R depuis Paris"],
      ["Hébergement", "1 nuit à l'Hôtel des Lumières", "Presqu'île"],
      ["Activité", "Enquête des traboules", "En extérieur"],
    ],
    cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#F6F1E7,#BCD3EA 60%,#6B7385)", scene: SCENES.lyon,
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
    cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#BCD3EA,#BCD3EA 50%,#BCD3EA)", scene: SCENES.lille,
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
    cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#F6F1E7,#BCD3EA 60%,#16233F)",
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
    cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#BCD3EA,#6B7385 60%,#16233F)",
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
    cta: "Demander ce voyage",
    g: "linear-gradient(160deg,#F6F1E7,#BCD3EA 55%,#16233F)",
    scene: SCENES.perou,
  },
];

export const FILTERS = [
  ["all", "Toutes"], ["insolite", "Insolite"], ["creatif", "Créatif"],
  ["aventure", "Aventure"], ["gourmand", "Gourmand"], ["lointain", "Grands voyages"],
];

export const REVIEWS = [
  { quote: "L’agence “Voyages Detour” a été impeccable du début à la fin. Réponses ultra rapides, bons conseils sur les activités, et transfert aéroport parfaitement organisé. L’hôtel était super, mais c’est vraiment le suivi de l’agence qui a fait la différence.", name: "Julie et Marc", title: "Nantes" },
  { quote: "L’equipe de Detour a été exceptionnelle. Tout était parfait : vol, hôtel, et même une visite privée du Louvre organisée à la dernière minute. Réactivité et professionnalisme au top.", name: "William", title: "Barcelone" },
  { quote: "Nous avons passé un excellent séjour à Barcelone grâce à Detour. L’organisation était parfaite, les activités proposées étaient originales et adaptées à nos envies. Nous recommandons vivement cette agence !", name: "Sophie et Thomas", title: "Lyon" },
  { quote: "Un grand merci à l’équipe de Detour pour ce week-end inoubliable à Lyon. Tout était parfaitement organisé, de l’hôtel aux activités. Nous avons pu profiter pleinement de notre séjour sans stress.", name: "Claire", title: "Lille" },
  { quote: "Detour a su créer un itinéraire sur mesure pour notre voyage en Grèce. Les conseils étaient précieux et nous avons découvert des endroits magnifiques que nous n’aurions jamais trouvés seuls.", name: "Lucas", title: "Grèce" },
  { quote: "Nous avons adoré notre escapade à Lille grâce à Detour. L’agence a pris en compte toutes nos préférences et nous a proposé un programme parfait. Merci pour cette expérience unique !", name: "Alice et Maxime", title: "Pérou" },
];

export const ICONS = {
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  headset: "M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1zM20 14h-3v5h2a1 1 0 001-1zM17 19c0 1.5-2 2-5 2",
  leaf: "M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8",
  shield: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z",
};
