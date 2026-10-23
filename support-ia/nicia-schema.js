// Contrat unique du dialogue : fournisseur, instructions et validation locale.
const texte=maxLength=>({type:"string",maxLength});
const proprietes=Object.fromEntries(["destination","villeDepart","dates","activites","experience","rythme","contraintes"].map(k=>[k,texte(2000)]));
Object.assign(proprietes,{budget:texte(300),dateDepart:{type:"string",pattern:"^(?:|[0-9]{4}-[0-9]{2}-[0-9]{2})$"},dateRetour:{type:"string",pattern:"^(?:|[0-9]{4}-[0-9]{2}-[0-9]{2})$"},participants:{type:"integer",minimum:1,maximum:1000},devise:{type:"string",pattern:"^[A-Z]{3}$"},baseBudget:{type:"string",enum:["total","personne","a_preciser"]}});
const preferencesSchema={type:"object",properties:proprietes,additionalProperties:false};
const dialogueSchema={type:"object",required:["reponse","preferences","pointsForts"],additionalProperties:false,properties:{reponse:{type:"string",minLength:1,maxLength:2400,pattern:"\\S"},preferences:preferencesSchema,pointsForts:{type:"array",maxItems:6,items:{type:"string",minLength:1,maxLength:180,pattern:"\\S"}}}};
// Uniquement les mots-clés de ce contrat. Aucun contenu ou nom de clé inconnu dans les erreurs.
function erreursSchema(value,schema=dialogueSchema,chemin="$"){
 const erreurs=[];const erreur=regle=>erreurs.push({chemin,regle});
 const bonType=schema.type==="object"?value!==null&&typeof value==="object"&&!Array.isArray(value):schema.type==="array"?Array.isArray(value):schema.type==="integer"?Number.isSafeInteger(value):typeof value===schema.type;
 if(!bonType){erreur("type");return erreurs;}
 if(schema.type==="object"){
  for(const k of schema.required||[])if(!Object.hasOwn(value,k))erreurs.push({chemin:chemin+"."+k,regle:"required"});
  for(const k of Object.keys(value))if(!Object.hasOwn(schema.properties,k))erreurs.push({chemin:chemin+".*",regle:"additionalProperties"});else erreurs.push(...erreursSchema(value[k],schema.properties[k],chemin+"."+k));
 }
 if(schema.type==="array"){
  if(value.length>schema.maxItems)erreur("maxItems");
  value.slice(0,7).forEach((x,i)=>erreurs.push(...erreursSchema(x,schema.items,chemin+"["+i+"]")));
 }
 if(schema.type==="string"){
  if(schema.minLength!==undefined&&value.length<schema.minLength)erreur("minLength");
  if(schema.maxLength!==undefined&&value.length>schema.maxLength)erreur("maxLength");
  if(schema.pattern&&!new RegExp(schema.pattern).test(value))erreur("pattern");
  if(schema.enum&&!schema.enum.includes(value))erreur("enum");
 }
 if(schema.type==="integer"&&(value<schema.minimum||value>schema.maximum))erreur("range");
 return erreurs.slice(0,24);
}
function extractionInvalide(erreurs,etape="schema"){
 const e=Error("INVALID_EXTRACTION");e.diagnostic={etape};e.validationErrors=erreurs;return e;
}
module.exports={dialogueSchema,preferencesSchema,erreursSchema,extractionInvalide};
