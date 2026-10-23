// Point d’intégration explicite : aucune pré-réservation n’existe dans ce checkout.
// Le collaborateur enregistre son adaptateur seulement APRÈS avoir livré sa route.
let integration = null;
function configurerRelais({chemin,recevoir,contrat}) {
  if(contrat!=="nicia-preparation-v1" || typeof recevoir!=="function" || typeof chemin!=="string" || !/^\/[a-zA-Z0-9/_-]+$/.test(chemin) || chemin.startsWith("//") || chemin.length>180) throw Error("INVALID_HANDOFF_CONFIG");
  integration={chemin,recevoir};
}
function etat(){return {disponible:!!integration,contrat:"nicia-preparation-v1"};}
async function passer(preparation) {
  if(!integration) throw Error("HANDOFF_UNAVAILABLE");
  const ack=await integration.recevoir(structuredClone(preparation));
  if(!ack || typeof ack.reference!=="string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(ack.reference)) throw Error("INVALID_HANDOFF_ACK");
  return {chemin:integration.chemin,reference:ack.reference};
}
module.exports={configurerRelais,etat,passer};
