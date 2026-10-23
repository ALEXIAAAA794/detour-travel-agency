const crypto=require("node:crypto");
const idsSources=new Set([...require("./connaissances.json").entrees.map(e=>e.id),"contact-confirmation"]);
function sourcesUtiles(sources){
 if(!Array.isArray(sources))return [];
 return sources.filter(s=>s&&idsSources.has(s.id)&&["/contact","/destinations"].includes(s.url)&&typeof s.titre==="string"&&s.titre.length<=180).map(s=>({id:s.id,titre:s.titre,url:s.url}));
}
function creerMessage(role,content,extras={}){
 if(!["user","model"].includes(role)||typeof content!=="string")throw Error("INVALID_HISTORY_MESSAGE");
 return {id:crypto.randomUUID(),role,content,horodatage:new Date().toISOString(),etat:role==="user"?"recu":"complet",...(extras.tourId?{tourId:extras.tourId}:{}),...(extras.sources?{sources:sourcesUtiles(extras.sources)}:{}),...(extras.baseVersion!==undefined?{baseVersion:extras.baseVersion}:{})};
}
function tracePublique(preparation){
 return (preparation.historique||[]).flatMap((m,i)=>{
  if(!m||!["user","model","assistant"].includes(m.role)||typeof m.content!=="string")return [];
  const id=typeof m.id==="string"&&/^[a-f0-9-]{36}$/i.test(m.id)?m.id:"legacy-"+crypto.createHash("sha256").update(JSON.stringify([preparation.id,i,m.role,m.content])).digest("hex").slice(0,32);
  const timestamp=typeof m.horodatage==="string"&&/^\d{4}-\d{2}-\d{2}T/.test(m.horodatage)&&Number.isFinite(Date.parse(m.horodatage))?m.horodatage:null;
  return [{id,role:m.role==="user"?"client":"assistant",message:m.content,horodatage:timestamp,statut:m.etat==="recu"?"message_recu":m.etat==="complet"?"reponse_complete":"historique_ancien",sources:sourcesUtiles(m.sources),...(typeof m.baseVersion==="number"?{versionBase:m.baseVersion}:{})}];
 });
}
module.exports={creerMessage,tracePublique,sourcesUtiles};
