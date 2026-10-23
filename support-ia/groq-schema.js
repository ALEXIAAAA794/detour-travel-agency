// Le schéma Groq strict exige tous les champs ; null = aucune modification extraite.
const {dialogueSchema,preferencesSchema,erreursSchema,extractionInvalide}=require("./nicia-schema");
const keys=Object.keys(preferencesSchema.properties);
const properties=Object.fromEntries(keys.map(k=>{
 const original=preferencesSchema.properties[k];
 return [k,{type:[original.type,"null"],...(original.enum?{enum:[...original.enum,null]}:{}),description:"Valeur explicitement exprimée pour "+k+" ; null si inconnue ou inchangée. Aucun montant estimé."}];
}));
const groqDialogueSchema={type:"object",additionalProperties:false,required:["reponse","preferences","pointsForts"],properties:{reponse:{type:"string",description:"Réponse courte FR/EN, au plus deux questions, 2400 caractères maximum, aucun prix inventé."},preferences:{type:"object",additionalProperties:false,required:keys,properties},pointsForts:{type:"array",items:{type:"string"},description:"Au plus six envies exprimées, 180 caractères chacune."}}};
function normaliserDialogue(brut){
 let d;try{d=JSON.parse(brut);}catch{throw extractionInvalide([{chemin:"$",regle:"invalid_json"}],"dialogue_json");}
 const root=erreursSchema(d&&typeof d==="object"&&!Array.isArray(d)?{...d,preferences:{}}:d);
 if(root.length)throw extractionInvalide(root);
 if(!Object.hasOwn(d,"preferences"))throw extractionInvalide([{chemin:"$.preferences",regle:"required"}]);
 if(!d.preferences||typeof d.preferences!=="object"||Array.isArray(d.preferences))throw extractionInvalide([{chemin:"$.preferences",regle:"type"}]);
 const errors=[];for(const k of keys)if(!Object.hasOwn(d.preferences,k))errors.push({chemin:"$.preferences."+k,regle:"required"});
 for(const k of Object.keys(d.preferences))if(!keys.includes(k))errors.push({chemin:"$.preferences.*",regle:"additionalProperties"});
 const patch={};for(const k of keys)if(Object.hasOwn(d.preferences,k)&&d.preferences[k]!==null){errors.push(...erreursSchema(d.preferences[k],preferencesSchema.properties[k],"$.preferences."+k));patch[k]=d.preferences[k];}
 if(errors.length)throw extractionInvalide(errors.slice(0,24));
 // Seul null documenté est omis ; aucune conversion ou suppression de valeur invalide.
 return JSON.stringify({...d,preferences:patch});
}
module.exports={groqDialogueSchema,normaliserDialogue};
