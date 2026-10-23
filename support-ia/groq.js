const {instructionSysteme}=require("./ai-context"),{echec}=require("./diagnostic"),{lireErreurFournisseur}=require("./gemini-http"),{lireReponse}=require("./openrouter-response");
const {groqDialogueSchema,normaliserDialogue}=require("./groq-schema");
const URL="https://api.groq.com/openai/v1/chat/completions",MAX_INPUT_BYTES=18000,MAX_OUTPUT_TOKENS=1536;
function modeleConfigure(){const m=(process.env.GROQ_MODEL||"openai/gpt-oss-120b").trim();if(!["openai/gpt-oss-120b","openai/gpt-oss-20b"].includes(m))throw echec("AI_CONFIGURATION","configuration");return m;}
function construireRequete(message,preparation,options={}){
 if(options.programme)throw echec("AI_MODE_UNSUPPORTED","configuration");
 const model=modeleConfigure();
 const messages=[{role:"system",content:instructionSysteme(preparation,{...options,contratGroq:options.nicia})},...(preparation?.historique||[]).filter(m=>["user","model","assistant"].includes(m.role)&&typeof m.content==="string").map(m=>({role:m.role==="user"?"user":"assistant",content:m.content})),{role:"user",content:message}];
 const body={model,messages,stream:false,max_completion_tokens:MAX_OUTPUT_TOKENS,reasoning_effort:"low",...(options.nicia?{response_format:{type:"json_schema",json_schema:{name:"nicia_dialogue",strict:true,schema:groqDialogueSchema}}}:{})};
 // Borne conservatrice en octets, pas une affirmation de comptage exact de tokens.
 // Aucun historique ni préférence n’est supprimé pour faire rentrer la requête.
 if(Buffer.byteLength(JSON.stringify(body))>MAX_INPUT_BYTES)throw echec("AI_CONTEXT_LIMIT","contexte",{fournisseur:"groq"});
 return body;
}
async function interrogerIA(message,preparation,options={}){
 const key=process.env.GROQ_API_KEY||process.env.IA_API_KEY;if(!key||!key.trim())throw echec("AI_CONFIGURATION","configuration");
 const body=construireRequete(message,preparation,options),start=Date.now(),signal=AbortSignal.timeout(60000);let r;
 try{r=await fetch(URL,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify(body),signal});}
 catch(e){throw echec(["TimeoutError","AbortError"].includes(e.name)?"AI_TIMEOUT":"AI_NETWORK","appel_groq",{dureeAppelMs:Date.now()-start});}
 const details={fournisseur:"groq",modele:body.model,formatReponse:options.nicia?"json_schema":"texte",statutHTTP:r.status};
 for(const [header,field] of [["x-ratelimit-remaining-tokens","groqTokensRestants"],["x-ratelimit-remaining-requests","groqRequetesRestantes"]]){const v=r.headers?.get?.(header);if(typeof v==="string"&&/^\d{1,15}$/.test(v))details[field]=Number(v);}
 const reset=r.headers?.get?.("x-ratelimit-reset-tokens");if(typeof reset==="string"&&reset.length<=40&&/^(?:\d+h)?(?:\d+m)?(?:\d+(?:\.\d+)?s)?$/.test(reset)&&reset)details.groqResetTokens=reset;
 if(!r.ok)throw echec("AI_HTTP","http_groq",{...details,...await lireErreurFournisseur(r),dureeAppelMs:Date.now()-start});
 let d;try{d=await lireReponse(r,{maximum:512000,signal});}catch(e){throw echec(["TimeoutError","AbortError"].includes(e.name)?"AI_TIMEOUT":"AI_RESPONSE_INVALID","enveloppe_json",{...details,dureeAppelMs:Date.now()-start});}
 if(d?.error)throw echec("AI_HTTP","http_groq",{...details,...await lireErreurFournisseur({status:r.status,headers:r.headers,json:async()=>d})});
 const c=d?.choices?.[0];if(!c)throw echec("AI_NO_CONTENT","extraction",details);
 if(c.finish_reason!=="stop")throw echec("AI_INCOMPLETE","extraction",{...details,fin:c.finish_reason==="length"?"MAX_TOKENS":"OTHER"});
 if(c.message?.refusal||typeof c.message?.content!=="string"||!c.message.content.trim())throw echec("AI_EMPTY","extraction",details);
 try{return options.nicia?normaliserDialogue(c.message.content):c.message.content.trim();}catch(e){e.diagnostic={...details,...e.diagnostic};throw e;}
}
module.exports={interrogerIA,modeleConfigure,construireRequete,URL,MAX_INPUT_BYTES,MAX_OUTPUT_TOKENS};
