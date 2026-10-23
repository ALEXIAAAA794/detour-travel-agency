const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
process.env.AI_PROVIDER="groq";process.env.GROQ_API_KEY="gsk_FICTIVE";process.env.GROQ_MODEL="openai/gpt-oss-120b";process.env.SUPPORT_AI_RATE_LIMIT="1000";
process.env.SUPPORT_PREPARATIONS_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"groq-prep-"));process.env.SUPPORT_DEMANDES_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"groq-demandes-"));
require.cache[require.resolve("../../emails")]={exports:{planifierEmail:()=>{throw Error("NO_EMAIL");}}};
const {groqDialogueSchema,normaliserDialogue}=require("../../groq-schema"),{extraire}=require("../../nicia-preferences"),groq=require("../../groq"),{interrogerIA}=require("../../ai");
const wire=(patch={},text="Quelle période avez-vous en tête ?")=>({reponse:text,preferences:{...Object.fromEntries(groqDialogueSchema.properties.preferences.required.map(k=>[k,null])),...patch},pointsForts:["Un week-end calme"]});
const envelope=d=>Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify(d)}}]});
test("Groq : schéma strict requis/nullable et adaptateur sans affaiblir les règles",()=>{
 assert.equal(groqDialogueSchema.additionalProperties,false);const prefs=groqDialogueSchema.properties.preferences;assert.deepEqual(prefs.required,Object.keys(prefs.properties));assert.equal(prefs.additionalProperties,false);
 const unknown=wire(),before=JSON.stringify(unknown);assert.deepEqual(extraire(normaliserDialogue(JSON.stringify(unknown)),{budget:"800 euros"}).preferences,{});assert.equal(JSON.stringify(unknown),before);
 for(const value of [{...wire(),preferences:null},{...wire(),preferences:{}},wire({budget:800}),wire({budget:{montant:800}}),wire({participants:"2"}),wire({devise:"euros"}),{...wire(),secret:"x"},wire({secret:"x"})])assert.throws(()=>normaliserDialogue(JSON.stringify(value)),/INVALID_EXTRACTION/);
 assert.throws(()=>normaliserDialogue("bad json"),e=>e.diagnostic.etape==="dialogue_json");
 assert.throws(()=>extraire(normaliserDialogue(JSON.stringify(wire({},"Une offre à 800 euros"))),{}),/UNSAFE_REPLY/);
 assert.throws(()=>extraire(normaliserDialogue(JSON.stringify(wire({dateDepart:"2027-02-30"}))),{}),/INVALID_EXTRACTION/);
});
test("Groq : contrat HTTP, contexte complet, sortie bornée, aucun streaming ni fallback",async()=>{
 const native=global.fetch;let sent,calls=0;global.fetch=async(url,o)=>{calls++;assert.equal(url,groq.URL);assert.equal(o.headers.Authorization,"Bearer gsk_FICTIVE");sent=JSON.parse(o.body);return envelope(wire({destination:"Nantes"}));};
 try{const out=await interrogerIA("I would like Nantes",{voyage:{budget:"800 euros",contraintes:"aucune"},historique:[{role:"user",content:"Contexte ancien conservé"},{role:"model",content:"Question précédente"}],nicia:{profil:{nomUsage:"Camille"}}},{nicia:true,langue:"en"});
 assert.equal(extraire(out,{}).preferences.destination,"Nantes");assert.equal(sent.stream,false);assert.equal(sent.response_format.json_schema.strict,true);assert.deepEqual(sent.response_format.json_schema.schema,groqDialogueSchema);assert.equal(sent.max_completion_tokens,1536);assert.equal(sent.reasoning_effort,"low");assert.equal(sent.tools,undefined);assert.equal(sent.service_tier,undefined);assert.equal(sent.messages[1].content,"Contexte ancien conservé");assert.match(sent.messages[0].content,/800 euros/);assert.match(sent.messages[0].content,/anglais/);assert.doesNotMatch(JSON.stringify(sent),/gsk_FICTIVE|openrouter/);assert.equal(calls,1);
 }finally{global.fetch=native;}
});
test("Groq : 401/429/schéma refusé, panne, délai, sortie tronquée et JSON invalide sans réessai",async()=>{
 const native=global.fetch;let calls=0;
 try{for(const mode of ["401","429","400","network","timeout","length","json","envelope","empty"]){global.fetch=async()=>{calls++;if(mode==="network")throw Error("secret");if(mode==="timeout")throw new DOMException("secret","TimeoutError");if(/^\d+$/.test(mode))return Response.json({error:{code:Number(mode),message:mode==="429"?"rate limit":"invalid request secret"}},{status:Number(mode),headers:{"retry-after":"7","x-ratelimit-remaining-tokens":"0","x-ratelimit-remaining-requests":"999","x-ratelimit-reset-tokens":"7.66s"}});if(mode==="json")return new Response("{");if(mode==="envelope")return Response.json({error:{code:503,message:"service unavailable"}});return Response.json({choices:[{finish_reason:mode==="length"?"length":"stop",message:{content:""}}]});};
 const before=calls;await assert.rejects(interrogerIA("Fictif",{voyage:{},historique:[]},{nicia:true,langue:"fr"}),e=>{assert.equal(e.diagnostic.fournisseur,"groq");if(mode==="429"){assert.equal(e.diagnostic.statutHTTP,429);assert.equal(e.diagnostic.reessaiApresSecondes,7);assert.equal(e.diagnostic.groqTokensRestants,0);assert.equal(e.diagnostic.groqResetTokens,"7.66s");}if(mode==="401")assert.equal(e.diagnostic.statutHTTP,401);if(mode==="timeout")assert.equal(e.code,"AI_TIMEOUT");return true;});assert.equal(calls,before+1);}
 }finally{global.fetch=native;}
});
test("Groq : contexte/schéma trop volumineux refusé explicitement sans tronquer",async()=>{
 const native=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error("Interdit");};
 try{const p={voyage:{destination:"Nantes",contraintes:"x".repeat(12000)},historique:[{role:"user",content:"y".repeat(12000)}]},before=JSON.stringify(p);
 await assert.rejects(interrogerIA("Fictif",p,{nicia:true}),e=>e.code==="AI_CONTEXT_LIMIT");assert.equal(JSON.stringify(p),before);assert.equal(calls,0);
 await assert.rejects(interrogerIA("Fictif",p,{programme:true}),e=>e.code==="AI_MODE_UNSUPPORTED");assert.equal(calls,0);
 }finally{global.fetch=native;}
});
test("Groq API Nicia simulée : FR/EN, budget, panne/reprise, sources/trace et restauration",async()=>{
 const native=global.fetch;let mode="valid",calls=0;global.fetch=async(url,o)=>{if(String(url).startsWith("http://127.0.0.1:"))return native(url,o);assert.equal(url,groq.URL);calls++;if(mode==="fail")return Response.json({error:{code:429,message:"rate limit"}},{status:429});if(mode==="invalid")return envelope(wire({budget:{montant:800}}));return envelope(mode==="correct"?wire({destination:"Lyon"},"Lyon replaces Nantes in your wishes. Which period would suit you?"):wire({destination:"Nantes",participants:2,budget:"800 euros",devise:"EUR",baseBudget:"total",rythme:"calme"}));};
 const {app}=require("../../server"),s=app.listen(0,"127.0.0.1");await new Promise(r=>s.once("listening",r));const base="http://127.0.0.1:"+s.address().port;
 try{const p=await(await fetch(base+"/api/support/preparations",{method:"POST"})).json(),headers={"Content-Type":"application/json",Authorization:"Bearer "+p.jeton},url=base+"/api/support/nicia/"+p.id+"/conversation";
 const post=b=>fetch(url,{method:"POST",headers,body:JSON.stringify(b)}),read=async()=>await(await fetch(base+"/api/support/preparations/"+p.id,{headers})).json();
 const initial={tourId:crypto.randomUUID(),langue:"fr",message:"Je m’appelle Camille. Je voudrais un week-end calme à Nantes pour deux personnes, budget total de 800 euros."};
 assert.equal((await post(initial)).status,200);let saved=await read();assert.equal(saved.voyage.budget,"800 euros");assert.equal(saved.nicia.profil.nomUsage,"Camille");assert.ok(saved.historique.every(m=>m.id&&m.horodatage));const previous=structuredClone(saved.voyage);
 mode="invalid";assert.equal((await post({tourId:crypto.randomUUID(),langue:"fr",message:"Toujours calme"})).status,502);assert.deepEqual((await read()).voyage,previous);
 const change={tourId:crypto.randomUUID(),langue:"en",message:"I prefer Lyon instead of Nantes. Keep the total budget and the two travellers."};mode="fail";assert.equal((await post(change)).status,503);saved=await read();assert.deepEqual(saved.voyage,previous);assert.deepEqual(saved.nicia.tourEnAttente.requete,change);
 mode="correct";assert.equal((await post(saved.nicia.tourEnAttente.requete)).status,200);saved=await read();assert.equal(saved.voyage.destination,"Lyon");assert.equal(saved.voyage.budget,"800 euros");assert.equal(saved.historique.filter(m=>m.content===change.message).length,1);
 const before=calls;assert.equal((await post(change)).status,200);assert.equal(calls,before);assert.equal((await read()).nicia.tourEnAttente,undefined);
 assert.equal((await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(initial)})).status,404);assert.equal(calls,before);
 assert.equal(fs.readdirSync(process.env.SUPPORT_DEMANDES_DIR).length,0);
 }finally{global.fetch=native;s.closeAllConnections();await new Promise(r=>s.close(r));}
});


test("Groq : budget réel reformulé sans faux refus ; montant/base/devise inventés refusés",()=>{
 const actual=wire({destination:"Nantes",villeDepart:"Paris",participants:2,budget:"800 euros",baseBudget:"total"},"Merci Camille. Vous souhaitez un week‑end calme à Nantes pour deux personnes, au départ de Paris, avec un budget total de 800\u202feuros. Pouvez‑vous préciser les dates ou la période envisagée\u202f?");actual.pointsForts=["week‑end calme à Nantes","deux personnes","budget total de 800\u202feuros"];
 assert.equal(extraire(normaliserDialogue(JSON.stringify(actual)),{}).preferences.budget,"800 euros");
 const english=wire({budget:"800 euros",devise:"EUR",baseBudget:"total"},"Your total budget is 800 euros. Which dates would suit you?");assert.doesNotThrow(()=>extraire(normaliserDialogue(JSON.stringify(english)),{}));
 for(const text of ["Votre budget total est de 900 euros","Votre budget total est de 800 dollars","Votre budget par personne est de 800 euros","Le prix est votre budget total de 800 euros"]){assert.throws(()=>extraire(normaliserDialogue(JSON.stringify(wire({budget:"800 euros",devise:"EUR",baseBudget:"total"},text))),{}),/UNSAFE_REPLY/);}
});

test("Groq Nicia FR : Ulrich Nantes puis Finalement, je préfère Lille, réessai et restauration",async()=>{
 const native=global.fetch;let calls=0,mode="initial";
 global.fetch=async(url,o)=>{
  if(String(url).startsWith("http://127.0.0.1:"))return native(url,o);
  calls++;const request=JSON.parse(o.body);assert.ok(Buffer.byteLength(o.body)<groq.MAX_INPUT_BYTES);
  if(mode!=="initial"){assert.match(request.messages[0].content,/Paris/);assert.match(request.messages[0].content,/800 euros/);assert.match(request.messages[0].content,/Ulrich/);assert.match(request.messages[0].content,/participants.*2/);}
  if(mode==="unsafe")return envelope(wire({destination:"Lille"},"Le prix est de 800 euros"));
  const d=mode==="initial"?wire({destination:"Nantes",villeDepart:"Paris",participants:2,budget:"800 euros",devise:"EUR",baseBudget:"total",rythme:"calme"}):wire({destination:"Lille"},"Lille comme destination. Quelle période envisagez-vous ?");
  d.pointsForts=["Week-end calme à Nantes","Départ de Paris","Deux voyageurs"];
  return envelope(d);
 };
 const {app}=require("../../server"),s=app.listen(0,"127.0.0.1");await new Promise(r=>s.once("listening",r));
 try{
  const base="http://127.0.0.1:"+s.address().port,p=await(await fetch(base+"/api/support/preparations",{method:"POST"})).json(),headers={"Content-Type":"application/json",Authorization:"Bearer "+p.jeton};
  const post=b=>fetch(base+"/api/support/nicia/"+p.id+"/conversation",{method:"POST",headers,body:JSON.stringify(b)}),read=async()=>await(await fetch(base+"/api/support/preparations/"+p.id,{headers})).json();
  assert.equal((await post({tourId:crypto.randomUUID(),langue:"fr",message:"Je m’appelle Ulrich. Je voudrais un week-end calme à Nantes, départ Paris, pour deux personnes, avec un budget total de 800 euros."})).status,200);
  const change={tourId:crypto.randomUUID(),langue:"fr",message:"Finalement, je préfère Lille"};
  mode="unsafe";assert.equal((await post(change)).status,502);let saved=await read();assert.equal(saved.voyage.destination,"Nantes");assert.equal(saved.historique.length,3);assert.equal(saved.historique.filter(x=>x.role==="model").length,1);
  mode="correction";assert.equal((await post(change)).status,200);saved=await read();assert.equal(saved.voyage.destination,"Lille");assert.equal(saved.voyage.villeDepart,"Paris");assert.equal(saved.voyage.participants,2);assert.equal(saved.voyage.budget,"800 euros");assert.equal(saved.voyage.baseBudget,"total");assert.equal(saved.nicia.profil.nomUsage,"Ulrich");assert.doesNotMatch(saved.nicia.pointsForts.join(" "),/Nantes/);assert.match(saved.nicia.pointsForts.join(" "),/Lille/);assert.match(saved.nicia.pointsForts.join(" "),/Paris/);
  const before=calls;assert.equal((await post(change)).status,200);const restored=await read();assert.deepEqual(restored,saved);assert.equal(calls,before);assert.equal(restored.historique.length,4);assert.equal(restored.historique.filter(x=>x.content===change.message).length,1);assert.equal(new Set(restored.historique.map(x=>x.id)).size,4);
 }finally{global.fetch=native;s.closeAllConnections();await new Promise(r=>s.close(r));}
});
