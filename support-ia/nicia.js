const express=require("express"),crypto=require("node:crypto");
const {autoriser,sauver,occupes,publique}=require("./preparations");
const {interrogerIA,nomFournisseur}=require("./ai");
const {repondreFAQ}=require("./connaissances");
const {preferencesValides,extraire,profilDepuisMessage,nomValide,suggestions,verifierAncrage,langueClient}=require("./nicia-preferences");
const relais=require("./nicia-relais");
const router=express.Router();
const erreur=(res,s,code,message)=>res.status(s).json({error:{code,message}});
const uuid=x=>typeof x==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
router.get("/config",(_req,res)=>res.set("Cache-Control","no-store").json({prereservation:relais.etat()}));
function init(p){p.nicia||={profil:{etat:null,nomUsage:null},pointsForts:[],revision:0,tours:[]};p.nicia.tours||=[];return p.nicia;}
async function verrou(req,res,action) {
 const p=req.preparation;if(occupes.has(p.id))return erreur(res,409,"PREPARATION_BUSY","Une opération est en cours. / An operation is already in progress.");
 occupes.add(p.id);try{return await action(p);}finally{occupes.delete(p.id);}
}
router.post("/:id/conversation",autoriser,require("./limitation").limiterPreparation,async(req,res)=>verrou(req,res,async p=>{
 const b=req.body;
 if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).some(k=>!["tourId","message","suggestion","profil","langue"].includes(k))||!uuid(b.tourId)||!["fr","en"].includes(b.langue)||["message","suggestion","profil"].filter(k=>b[k]!==undefined).length!==1)return erreur(res,400,"INVALID_TURN","Message invalide / Invalid turn.");
 const langue=b.message?langueClient(b.message,b.langue):b.langue;
 const en=langue==="en",n=init(p);const avant=JSON.stringify({voyage:p.voyage,profil:n.profil,pointsForts:n.pointsForts});let message,local,profil=n.profil;
 if(b.profil!==undefined){
  if(!b.profil||typeof b.profil!=="object"||Array.isArray(b.profil)||Object.keys(b.profil).some(k=>k!=="nomUsage")||(b.profil.nomUsage!==null&&!nomValide(b.profil.nomUsage)))return erreur(res,400,"INVALID_PROFILE","Prénom ou pseudonyme invalide / Invalid name.");
  profil={etat:b.profil.nomUsage===null?"refuse":"choisi",nomUsage:b.profil.nomUsage?.trim()||null};
  message=profil.nomUsage?(en?"Please call me ":"Appelez-moi ")+profil.nomUsage:(en?"I prefer not to give a name.":"Je préfère ne pas donner de prénom.");
  local=en?"Noted. You can change this at any time. Your previous travel wishes are kept.":"C’est noté. Vous pouvez le corriger à tout moment. Vos envies de voyage précédentes sont conservées.";
 }else if(b.suggestion!==undefined){
  if(typeof b.suggestion!=="string"||!Object.hasOwn(suggestions,b.suggestion))return erreur(res,400,"INVALID_SUGGESTION","Suggestion inconnue / Unknown suggestion.");
  [message,local]=suggestions[b.suggestion][b.langue];
  if(Object.keys(p.voyage).length)local=en?"Your previous preferences are kept. What would you like to explore next?":"Vos envies précédentes sont conservées. Quel aspect souhaitez-vous explorer maintenant ?";
 }else{
  if(typeof b.message!=="string"||!b.message.trim()||b.message.trim().length>2000)return erreur(res,400,"INVALID_MESSAGE","Message requis, 2 000 caractères maximum / Message required, up to 2,000 characters.");
  message=b.message.trim();const identification=profilDepuisMessage(message,profil);profil=identification.profil;
  if(identification.seul && Object.keys(p.voyage).length)local=en?"Noted. Your previous travel wishes are kept.":"C’est noté. Vos envies de voyage précédentes sont conservées.";
  else if(identification.seul)local=en?"Noted. Tell me a travel idea, a destination or a period you have in mind.":"C’est noté. Parlez-moi d’une envie, d’une destination ou d’une période de voyage.";
 }
 const signature=crypto.createHash("sha256").update(JSON.stringify({tourId:b.tourId,langue:b.langue,message:b.message,suggestion:b.suggestion,profil:b.profil?{nomUsage:b.profil.nomUsage}:undefined})).digest("hex");
 const ancien=n.tours.find(t=>t.id===b.tourId);
 if(ancien)return ancien.signature===signature?res.json({preparation:publique(p),reply:ancien.reply}):erreur(res,409,"TURN_CONFLICT","Ce message a changé / This turn has changed.");
 if(n.enAttente?.id===b.tourId&&n.enAttente.signature!==signature)return erreur(res,409,"TURN_CONFLICT","Ce message a changé / This turn has changed.");
 if(p.historique.length+(n.enAttente?.id===b.tourId?1:2)>200)return erreur(res,409,"HISTORY_FULL","Préparation complète / Preparation is full.");
 if(n.enAttente?.id!==b.tourId){p.historique.push({role:"user",content:message});n.enAttente={id:b.tourId,signature,message,langue:b.langue,requete:structuredClone(b)};}
 n.profil=profil;n.langue=langue;sauver(p); // Le message client survit à une panne ou un rechargement.
 try{
  let reply;
  const faq=local?null:repondreFAQ(message,langue);
  if(local)reply={role:"assistant",content:local,type:"local"};
  else if(faq){
   const prix=/€|\$|\b(?:prix|tarifs?|prices?|rates?|budget|estimat)/i.test(message+" "+faq.content);
   reply={role:"assistant",content:prix?(en?"Nicia does not price a trip. You can share your desired budget; an adviser will verify the commercial offer. /contact":"Nicia ne chiffre pas un voyage. Vous pouvez indiquer votre budget souhaité ; un conseiller vérifiera la proposition commerciale. /contact"):faq.content,type:faq.type,sources:faq.sources};
  }else{
   const contexte={...p,historique:p.historique.slice(0,-1)};
   const d=extraire(await interrogerIA(message,contexte,{nicia:true,langue}),p.voyage);
   verifierAncrage(d.preferences,p.historique,p.voyage,[d.reponse,...d.pointsForts].join(" "));
   p.voyage={...p.voyage,...d.preferences};n.pointsForts=d.pointsForts;
   reply={role:"assistant",content:d.reponse,type:"conversation"};
  }
  p.historique.push({role:"model",content:reply.content,...(reply.sources?{sources:reply.sources}:{})});
  if(JSON.stringify({voyage:p.voyage,profil:n.profil,pointsForts:n.pointsForts})!==avant)n.revision++;n.tours=[...n.tours,{id:b.tourId,signature,reply}].slice(-10);delete n.enAttente;sauver(p);
  return res.json({preparation:publique(p),reply});
 }catch(e){
  // Pas de corps fournisseur, de conversation ou de secret dans les journaux.
  const invalid=["INVALID_EXTRACTION","UNSAFE_REPLY"].includes(e.message);
  return erreur(res,invalid?502:503,invalid?"INVALID_EXTRACTION":"AI_UNAVAILABLE",invalid?(en?"Nicia’s reply could not be validated. Your message and previous preferences are kept. Please retry.":"La réponse de Nicia n’a pas pu être validée. Votre message et vos préférences précédentes sont conservés. Réessayez."):nomFournisseur(e.diagnostic?.fournisseur)+(en?" is temporarily unavailable. Your message is kept; you can retry.":" est temporairement indisponible. Votre message est conservé ; vous pouvez réessayer."));
 }
}));
router.patch("/:id/envies",autoriser,async(req,res)=>verrou(req,res,async p=>{
 try{
  if(!req.body||Object.keys(req.body).some(k=>k!=="preferences"))throw Error();
  const v=preferencesValides(req.body.preferences,p.voyage);const n=init(p);
  const nouveau={...p.voyage,...v};if(JSON.stringify(nouveau)!==JSON.stringify(p.voyage))n.revision++;p.voyage=nouveau;sauver(p);return res.json(publique(p));
 }catch{return erreur(res,400,"INVALID_PREFERENCES","Vérifiez les dates et les envies / Check your dates and preferences.");}
}));
router.post("/:id/relais",autoriser,async(req,res)=>verrou(req,res,async p=>{
 const n=init(p);
 if(!req.body||Object.keys(req.body).some(k=>k!=="revisionAttendue")||req.body.revisionAttendue!==n.revision)return erreur(res,409,"STALE_PREPARATION","La préparation a changé / The preparation has changed.");
 if(n.enAttente)return erreur(res,409,"TURN_PENDING","Terminez ou réessayez le dernier échange / Complete or retry the last exchange first.");
 if(!relais.etat().disponible)return erreur(res,409,"HANDOFF_UNAVAILABLE","La pré-réservation n’est pas encore raccordée. / Pre-booking is not connected yet.");
 if(!p.voyage.destination||!p.voyage.participants||!p.voyage.villeDepart||!(p.voyage.dates||p.voyage.dateDepart&&p.voyage.dateRetour))return erreur(res,422,"PREFERENCES_INCOMPLETE","Précisez destination, départ, période et voyageurs / Please specify destination, departure city, period and travellers.");
 if(n.relais?.revision===n.revision)return res.json(n.relais);
 try{
  const ack=await relais.passer({preparationId:p.id,revision:n.revision,voyage:p.voyage,profil:n.profil,pointsForts:n.pointsForts,idempotence:p.id+":"+n.revision});
  n.relais={...ack,revision:n.revision};sauver(p);return res.json(n.relais);
 }catch{return erreur(res,503,"HANDOFF_FAILED","Le passage n’a pas été confirmé. Réessayez. / Handoff was not confirmed. Please retry.");}
}));
module.exports={niciaRouter:router};
