const express=require("express");
const {tracePublique}=require("./nicia-historique");
// Adaptateur serveur de l’authentification métier. Aucun en-tête client n’est une identité.
function creerTraceRouter({authentifierConseiller,resoudrePrereservation,peutConsulter,lirePreparation=require("./preparations").lirePreparation}={}){
 const router=express.Router();
 router.get("/:id/trace",async(req,res)=>{
  res.set({"Cache-Control":"no-store","Pragma":"no-cache"});
  const error=(status,code,message)=>res.status(status).json({error:{code,message}});
  if([authentifierConseiller,resoudrePrereservation,peutConsulter,lirePreparation].some(f=>typeof f!=="function"))return error(503,"TRACE_NOT_CONNECTED","Consultation conseiller non disponible.");
  try{
   const conseiller=await authentifierConseiller(req);
   if(!conseiller||typeof conseiller.id!=="string"||!conseiller.id)return error(401,"ADVISER_AUTH_REQUIRED","Authentification conseiller requise.");
   if(conseiller.role!=="conseiller")return error(403,"ADVISER_ROLE_REQUIRED","Accès réservé aux conseillers.");
   if(!/^[a-zA-Z0-9_-]{1,80}$/.test(req.params.id))return error(404,"TRACE_NOT_FOUND","Trace inaccessible.");
   const dossier=await resoudrePrereservation(req.params.id);
   if(!dossier||dossier.id!==req.params.id||await peutConsulter(conseiller,dossier)!==true)return error(404,"TRACE_NOT_FOUND","Trace inaccessible.");
   if(typeof dossier.preparationId!=="string"||!/^[a-f0-9-]{36}$/i.test(dossier.preparationId))return error(409,"TRACE_LINK_MISSING","Préparation non rattachée.");
   const p=await lirePreparation(dossier.preparationId);
   // Contrôle retour sur l’accusé métier déjà enregistré par le relais du lot 1.
   if(!p||p.id!==dossier.preparationId||p.nicia?.relais?.reference!==dossier.id)return error(409,"TRACE_LINK_MISSING","Rattachement de préparation non vérifiable.");
   return res.json({versionContrat:1,prereservationId:dossier.id,echanges:tracePublique(p)});
  }catch{return error(503,"TRACE_UNAVAILABLE","La trace ne peut pas être consultée pour le moment.");}
 });
 return router;
}
module.exports={creerTraceRouter};
