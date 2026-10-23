const { problemesDates, dateValide } = require("./dates");
const {preferencesSchema,erreursSchema,extractionInvalide}=require("./nicia-schema");
function preferencesValides(v, actuel = {}) {
  const erreurs=erreursSchema(v,preferencesSchema,"$.preferences");
  if(erreurs.length)throw extractionInvalide(erreurs);
  const copie=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,typeof x==="string"?x.trim():x]));
  const complet = {...actuel,...copie};
  if(problemesDates(complet).length){
    const invalides=["dateDepart","dateRetour"].filter(k=>complet[k]!==undefined&&complet[k]!==""&&!dateValide(complet[k])).map(k=>({chemin:"$.preferences."+k,regle:"calendar"}));
    throw extractionInvalide(invalides.length?invalides:[{chemin:"$.preferences.dateRetour",regle:"order"}]);
  }
  return copie;
}
function extraire(brut, actuel) {
  if(typeof brut!=="string" || Buffer.byteLength(brut)>24000) throw extractionInvalide([{chemin:"$",regle:typeof brut!=="string"?"type":"maxBytes"}],"taille");
  let d;try{d=JSON.parse(brut.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,"$1"));}catch{throw extractionInvalide([{chemin:"$",regle:"invalid_json"}],"dialogue_json");}
  const erreurs=erreursSchema(d);
  if(erreurs.length)throw extractionInvalide(erreurs);
  if((d.reponse.match(/\?/g)||[]).length>2)throw extractionInvalide([{chemin:"$.reponse",regle:"question_limit"}]);
  // Les montants communiqués par le client sont affichés séparément dans le récapitulatif.
  // Nicia ne chiffre pas ses pistes : refus local des montants et affirmations explicites.
  const preferences=preferencesValides(d.preferences,actuel);
  const budget={...actuel,...preferences};
  // Seule une reformulation explicitement étiquetée du souhait client est permise.
  const brutSortie=[d.reponse,...d.pointsForts].join(" ");
  if(/(?:prix|tarif|coût|cout|price|fare|cost)\s*(?:est|sera|is|will be|:)\s*.{0,40}budget/i.test(brutSortie))throw Error("UNSAFE_REPLY");
  const sortie=brutSortie.replace(/(?:votre budget souhaité|votre souhait de budget|your desired budget|your budget preference|(?:(?:un|le|votre|a|the|your) )?budget(?: total| global| souhaité| par personne)?|(?:(?:a|the|your) )?total budget)\s*(?:est|is|:)?\s*(?:de |of )?(\d+(?:[.,]\d{1,2})?)\s*(euros?|EUR|USD|dollars?|GBP|pounds?|CHF|CAD|JPY|€|\$|£)(?:\s*(?:au total|total|par personne|per person))?/gi,(match,montant,devise)=>{
    if(!((budget.budget||"").match(/\d+(?:[.,]\d+)?/g)||[]).includes(montant))throw Error("UNSAFE_REPLY");
    const monnaie={euro:"EUR",euros:"EUR","€":"EUR",dollar:"USD",dollars:"USD","$":"USD",pound:"GBP",pounds:"GBP","£":"GBP"}[devise.toLowerCase()]||devise.toUpperCase();
    if(budget.devise!==monnaie && !(budget.budget||"").toLowerCase().includes(devise.toLowerCase()))throw Error("UNSAFE_REPLY");
    if(/par personne|per person/i.test(match)&&budget.baseBudget!=="personne" || /au total|\btotal\b/i.test(match)&&budget.baseBudget!=="total")throw Error("UNSAFE_REPLY");
    return "votre souhait de budget";
  });
  if(/(?:le prix|le tarif|le coût|le cout|cela coûte|cela coute|the price|the fare|the cost|it costs|trip costs|estimated (?:price|cost)|estimation (?:du prix|du coût|du cout))\s*(?:est|sera|is|will be|:)?\s*(?:de |of )?(?:\d|cent|mille|cinq|huit|hundred|thousand|eight|five)/i.test(sortie))throw Error("UNSAFE_REPLY");
  if(/à partir de|a partir de|sous réserve|sous reserve|starting (?:at|from)|prices? from|subject to|\*|je suis (?:votre |un |une )?conseill|I(?:’m| am) (?:your |an? )?(?:travel )?advis[oe]r|(?:j.ai|nous avons|I have|we have).{0,25}(?:transmis|transferred|envoy|sent|reserved|confirmed)|(?:vol|flight).{0,35}(?:part à|depart(?:s|ure)? at|confirmed)|(?:disponibilité|availability|booking|réservation).{0,20}(?:confirmée|confirmed|garantie|guaranteed)|(?:HTTP\s*\d{3}|Error:|\bat \w+.*:\d+:\d+|systemInstruction|system prompt)/i.test(sortie))throw Error("UNSAFE_REPLY");
  if(/€|\$|£|\b(?:EUR|USD|GBP|CHF|CAD|JPY|euros?|dollars?|francs?|yens?|pounds?)\b|\b\d[\d .,]*\s*(?:euros?|dollars?|par personne|per person)\b|je confirme (?:la|votre) r[eé]servation|I confirm (?:your|the) booking|j.ai r[eé]serv[eé]|I have booked|\b(?:prix|co[uû]t|cost|estimate|estimation|tarif)\b.{0,35}\d/i.test(sortie)) throw Error("UNSAFE_REPLY");
  return {reponse:d.reponse.trim().replace(/\/contact\b/g,"Contact"),preferences,pointsForts:d.pointsForts.map(x=>x.trim())};
}
// Les points forts décrivent l’état courant, pas les anciennes destinations du journal.
function pointsFortsCourants(points, avant, apres) {
  if(!avant.destination || avant.destination===apres.destination)return points;
  const normaliser=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const ancien=normaliser(avant.destination);
  const gardes=points.filter(x=>!normaliser(x).includes(ancien));
  if(apres.destination&&!gardes.some(x=>normaliser(x).includes(normaliser(apres.destination))))
    gardes.unshift(apres.destination.slice(0,180));
  return gardes.slice(0,6);
}
function nomValide(v){return typeof v==="string"&&v.trim().length>0&&v.trim().length<=60&&/^[\p{L}\p{N} .’'_-]+$/u.test(v);}
function profilDepuisMessage(message, profil) {
  const refusal = /(?:pas|not|no).{0,35}(?:pr[eé]nom|pseudo|nom|name)|(?:pr[eé]nom|pseudo|nom|name).{0,25}(?:pas|not)|sans pr[eé]nom|rester anonyme|anonymous|prefer not to say|rather not say|pr[eé]f[eè]re ne pas (?:le donner|r[eé]pondre)/i.test(message);
  if(refusal) return {profil:{etat:"refuse",nomUsage:null},seul:message.length<85 && !/voyag|week|partir|trip|travel|go to|je veux|I want|j.aimerais/i.test(message)};
  const explicite=message.match(/^(?:je m.appelle|appel(?:le|ez)[ -]moi|mon (?:pr[eé]nom|pseudo) est|my name is|call me)\s+(.+?)(?=,|;|\s+(?:et|and|je|j.aimerais|I want)\b|[.!?]|$)/i);
  const simple=!profil?.etat && message.match(/^([\p{L}’'-]{2,30})(?:,|$)/u);
  const m=explicite||simple;
  if(m && nomValide(m[1]) && !/^(?:Lyon|Paris|Nantes|Lille|Hello|Bonjour|Voyage|Travel|aucune?|none|oui|non|yes|no|nature|culture|calme|balanced|relaxed|famille|family|train|mer|sea)$/i.test(m[1])) {
    return {profil:{etat:"choisi",nomUsage:m[1].trim()},seul:message.replace(m[0],"").replace(/^[\s.!?,;:]+$/,"").trim().length===0};
  }
  return {profil:profil||{etat:null,nomUsage:null},seul:false};
}
function datesExplicites(texte) {
  const normal=texte.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),resultat=new Set();
  const mois=["janvier|january|jan","fevrier|february|feb","mars|march|mar","avril|april|apr","mai|may","juin|june|jun","juillet|july|jul","aout|august|aug","septembre|september|sept|sep","octobre|october|oct","novembre|november|nov","decembre|december|dec"];
  const ajouter=(a,m,j)=>{const iso=a+"-"+String(m).padStart(2,"0")+"-"+String(j).padStart(2,"0");if(require("./dates").dateValide(iso))resultat.add(iso);};
  for(const m of normal.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g))ajouter(m[1],m[2],m[3]);
  for(const m of normal.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g))ajouter(m[3],m[2],m[1]);
  mois.forEach((nom,i)=>{
    for(const m of normal.matchAll(new RegExp("\\b(\\d{1,2})\\s+(?:"+nom+")\\s+(\\d{4})\\b","g")))ajouter(m[2],i+1,m[1]);
    for(const m of normal.matchAll(new RegExp("\\b(?:"+nom+")\\s+(\\d{1,2}),?\\s+(\\d{4})\\b","g")))ajouter(m[2],i+1,m[1]);
    for(const m of normal.matchAll(new RegExp("\\b(?:du|from)\\s+(\\d{1,2})\\s+(?:au|to)\\s+(\\d{1,2})\\s+(?:"+nom+")\\s+(\\d{4})\\b","g"))){ajouter(m[3],i+1,m[1]);ajouter(m[3],i+1,m[2]);}
  });
  return resultat;
}
function verifierAncrage(preferences, historique, actuel, reponse="") {
  const source=historique.filter(m=>m.role==="user").map(m=>m.content).join(" ");
  if(preferences.budget && preferences.budget!==actuel.budget) {
    const chiffres=preferences.budget.match(/\d+(?:[.,]\d+)?/g)||[];
    if(chiffres.some(n=>!source.includes(n))) throw extractionInvalide([{chemin:"$.preferences.budget",regle:"grounding"}]);
  }
  if(preferences.devise && preferences.devise!==actuel.devise) {
    const mentions={EUR:/\bEUR\b|euros?|€/i,USD:/\bUSD\b|US dollars|dollars am[eé]ricains/i,GBP:/\bGBP\b|pounds?|livres sterling|£/i,CAD:/\bCAD\b|Canadian dollars|dollars canadiens/i,CHF:/\bCHF\b|Swiss francs|francs suisses/i};
    const re=mentions[preferences.devise]||new RegExp("\\b"+preferences.devise+"\\b","i");
    if(!re.test(source))throw extractionInvalide([{chemin:"$.preferences.devise",regle:"grounding"}]);
  }
  if(preferences.baseBudget && preferences.baseBudget!==actuel.baseBudget && preferences.baseBudget!=="a_preciser") {
    const re=preferences.baseBudget==="personne"?/par personne|per person|chacun|each traveller/i:/total|global|ensemble|pour nous|pour tout|all travellers|overall|everyone/i;
    if(!re.test(source))throw extractionInvalide([{chemin:"$.preferences.baseBudget",regle:"grounding"}]);
  }
  const datesSource=datesExplicites(source);
  for(const k of ["dateDepart","dateRetour"]) {
    const date=preferences[k];
    if(date && date!==actuel[k] && !datesSource.has(date))throw extractionInvalide([{chemin:"$.preferences."+k,regle:"grounding"}]);
  }
  const voyage={...actuel,...preferences};
  for(const date of datesExplicites(reponse)) {
    const dansPeriode=voyage.dateDepart&&voyage.dateRetour&&date>=voyage.dateDepart&&date<=voyage.dateRetour;
    if(!datesSource.has(date)&&!dansPeriode)throw extractionInvalide([{chemin:"$.reponse",regle:"date_grounding"}]);
  }
}
function langueClient(message, repli="fr") {
  const texte=typeof message==="string"?message:"";
  const fr=/\b(je|vous|voudrais|souhaite|bonjour|pr[eé]f[eè]re|appelle|nous|quels?|quelles?|comment|votre|vos|mes|mon)\b|j[’']/i.test(texte);
  const en=/\b(I|my|would|please|hello|where|what|which|how|your|want|prefer|travellers|adults|children)\b/i.test(texte);
  return en&&!fr?"en":fr&&!en?"fr":repli;
}
const suggestions = {
 imaginer:{fr:["Imaginer mon voyage","Parlons de votre envie de voyage. Quelle ambiance recherchez-vous, et d’où aimeriez-vous partir ?"],en:["Imagine my trip","Let’s explore your travel idea. What kind of experience would you like, and where would you leave from?"]},
 destination:{fr:["Trouver une destination","Cherchons une destination qui vous ressemble. Préférez-vous la ville, la nature ou le bord de l’eau ?"],en:["Find a destination","Let’s find a place that suits you. Would you prefer a city, nature or somewhere by the water?"]},
 weekend:{fr:["Partir le temps d’un week-end","Une petite escapade, un vrai pas de côté. Quelle est votre ville de départ, et avez-vous un week-end en tête ?"],en:["Get away for a weekend","A short getaway can be a real change of pace. Where would you leave from, and which weekend do you have in mind?"]},
 famille:{fr:["Voyager en famille","Imaginons une escapade pour toute la famille. Combien serez-vous, et quelles envies souhaitez-vous partager ?"],en:["Travel as a family","Let’s think about a family getaway. How many of you will travel, and what would you enjoy together?"]},
 detour:{fr:["Une question sur DÉTOUR","Je peux répondre à partir des informations vérifiées de DÉTOUR. Quelle est votre question ? La page Contact vous permet aussi de joindre l’équipe."],en:["A question about DÉTOUR","I can answer using DÉTOUR’s verified information. What would you like to know? You can also reach the team through the Contact page."]}
};
module.exports={pointsFortsCourants,preferencesValides,extraire,profilDepuisMessage,nomValide,suggestions,verifierAncrage,langueClient};
