// Réponses locales réservées au nouveau parcours, sans modifier les autres lots.
const {repondreFAQ}=require("./connaissances");
const contact={id:"contact-confirmation",titre:"Contact",url:"/contact"};
const normal=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function reponseLocale(message,langue){
 const en=langue==="en",m=normal(message);
 const prix=/\b(prix|tarifs?|prices?|pricing|rates?|fares?|devis|quote|combien (?:ca |cela )?coute|how much|what.*cost|estime|estimer|estimation|estimate)\b/.test(m);
 const disponibilite=/\b(disponibilites?|disponible|availability|available|places? restantes?|rooms? left)\b/.test(m);
 const reservation=/\b(reserv(?:e|er|ation|ations)|book(?:ing|ed)?|confirm(?:er|ez|e|ation)?)\b/.test(m) && /voyage|trip|reservation|booking|hotel|sejour|reserve|book/.test(m);
 const texte=prix?(en?"I can keep your desired budget as a preference. For a price, an adviser prepares and checks the commercial offer. Nothing has been sent or booked.":"Je peux conserver votre budget souhaité. Pour un tarif, un conseiller compose et vérifie l’offre commerciale. Rien n’a été envoyé ni réservé."):
 disponibilite?(en?"I cannot confirm availability. An adviser needs to check it for your dates. These are ideas to explore, not a verified offer.":"Je ne peux pas confirmer de disponibilité. Un conseiller doit la vérifier pour vos dates. Ces pistes sont des idées à examiner, pas une offre vérifiée."):
 reservation?(en?"I’m Nicia, your AI assistant. I collect your wishes and prepare a recap; I do not book anything. A person at DÉTOUR prepares the offer, checks it, signs it and confirms the booking. Nothing has been sent.":"Je suis Nicia, votre assistant IA. Je recueille vos envies et prépare un récapitulatif ; je ne réserve rien. Une personne de DÉTOUR compose l’offre, vérifie, signe et confirme la réservation. Rien n’a été transmis."):null;
 if(texte)return {content:texte,type:"limite",sources:[{...contact,titre:en?"Contact an adviser":"Contacter un conseiller"}]};
 const faq=repondreFAQ(message,langue,{nicia:true});
 if(!faq)return null;
 return {...faq,content:faq.content.replace(/(?:Lien Contact\s*:|Contact page\s*:)?\s*\/contact\.?/gi,"").trim(),sources:faq.sources.map(s=>s.url==="/contact"?{...s,titre:en?"Contact an adviser":"Contacter un conseiller"}:s)};
}
module.exports={reponseLocale};
