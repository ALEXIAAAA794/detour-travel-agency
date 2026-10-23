// Transport Nicia uniquement : une lecture, un plafond et un signal pour tout le corps.
function faute(code){const e=Error(code);e.etatCorps=code;return e;}
function lireAvecSignal(reader,signal){
 if(signal?.aborted)return Promise.reject(signal.reason);
 return new Promise((resolve,reject)=>{
  const abort=()=>{signal?.removeEventListener("abort",abort);reject(signal.reason);void reader.cancel().catch(()=>{});};
  signal?.addEventListener("abort",abort,{once:true});
  reader.read().then(v=>{signal?.removeEventListener("abort",abort);resolve(v);},e=>{signal?.removeEventListener("abort",abort);reject(e);});
 });
}
async function lireReponse(reponse,{maximum=512000,signal}={}){
 if(!reponse.body?.getReader)return reponse.json(); // Réponses synthétiques sans flux.
 const reader=reponse.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});
 const sse=/^text\/event-stream(?:;|$)/i.test(reponse.headers?.get?.("content-type")||"");
 let taille=0,buffer="",texte="",fin=null,doneSSE=false,erreur=null,data=[];
 function event(){
  if(!data.length)return;const payload=data.join("\n");data=[];
  if(payload==="[DONE]"){doneSSE=true;return;}
  let d;try{d=JSON.parse(payload);}catch{throw faute("INVALID_SSE_JSON");}
  if(d.error){erreur=d.error;doneSSE=true;return;}
  const c=d.choices?.find(c=>c.index===0||c.index===undefined);if(!c)return;
  const content=c.delta?.content;
  // Ne jamais prendre le raisonnement pour la réponse client.
  if(content!==undefined&&content!==null){if(typeof content!=="string")throw faute("INVALID_CONTENT");if(fin&&content)throw faute("CONTENT_AFTER_FINISH");texte+=content;}
  if(c.finish_reason){if(fin&&fin!==c.finish_reason)throw faute("CONFLICTING_FINISH");fin=c.finish_reason;}
 }
 function line(s){if(s==="")return event();if(s.startsWith(":"))return;if(s.startsWith("data:"))data.push(s.slice(5).replace(/^ /,""));}
 try{
  while(!doneSSE){
   const {value,done}=await lireAvecSignal(reader,signal);
   if(done){buffer+=decoder.decode();if(sse&&buffer){line(buffer.replace(/\r$/, ""));event();buffer="";}break;}
   taille+=value.byteLength;if(taille>maximum)throw faute("RESPONSE_TOO_LARGE");
   buffer+=decoder.decode(value,{stream:true});
   if(sse){let end;while(!doneSSE&&(end=buffer.indexOf("\n"))!==-1){const s=buffer.slice(0,end).replace(/\r$/,"");buffer=buffer.slice(end+1);line(s);}}
  }
  if(sse){
   if(erreur)return {error:erreur};
   if(!doneSSE)throw faute("TRUNCATED_SSE");
   if(!fin)throw faute("MISSING_FINISH");
   return {choices:[{finish_reason:fin,message:{content:texte}}]};
  }
  if(!buffer.trim())throw faute(taille?"WHITESPACE_BODY":"EMPTY_BODY");
  try{return JSON.parse(buffer);}catch{throw faute("INVALID_JSON_BODY");}
 }finally{
  // Annuler sur [DONE], erreur ou dépassement, sans attendre un fournisseur bloqué.
  void reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}
 }
}
module.exports={lireReponse};
