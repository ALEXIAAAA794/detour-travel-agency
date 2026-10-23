const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
process.env.SUPPORT_AI_RATE_LIMIT="1000";process.env.AI_PROVIDER="gemini";process.env.GEMINI_API_KEY="simule";
process.env.SUPPORT_PREPARATIONS_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"nicia-test-prep-"));
process.env.SUPPORT_DEMANDES_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"nicia-test-demandes-"));
require.cache[require.resolve("../../emails")]={exports:{planifierEmail:()=>{throw Error("Email interdit dans Nicia");}}};
const {app}=require("../../server"),{preferencesValides,extraire}=require("../../nicia-preferences"),relais=require("../../nicia-relais");
const valid={reponse:"Quelle expérience aimeriez-vous partager ?",preferences:{destination:"Lyon",villeDepart:"Nantes",dates:"en mai, environ deux jours",participants:2,budget:"500 euros souhaités",devise:"EUR",baseBudget:"total",rythme:"calme",contraintes:"aucune"},pointsForts:["Découvrir Lyon tranquillement"]};
test("Nicia : validation structurée, dates approximatives et absence de privilèges",()=>{
 assert.equal(preferencesValides({dates:"un week-end en mai"}).dates,"un week-end en mai");
 const {profilDepuisMessage}=require("../../nicia-preferences");
 const {langueClient}=require("../../nicia-preferences");
 assert.equal(langueClient("I would like a weekend trip","fr"),"en");assert.equal(langueClient("Je voudrais un voyage","en"),"fr");
 assert.equal(require("../../connaissances").repondreFAQ("destinations","en").content.includes("Lyon"),true);
 assert.equal(profilDepuisMessage("Je préfère ne pas prendre l’avion",null).profil.etat,null);
 assert.equal(profilDepuisMessage("aucune",null).profil.etat,null);
 assert.equal(profilDepuisMessage("Je préfère ne pas le donner",null).profil.etat,"refuse");
 assert.equal(profilDepuisMessage("I prefer not to share my name and I want a weekend trip",null).seul,false);
 for(const value of [{role:"admin"},{participants:0},{devise:"euro"},{dateDepart:"2027-02-30"},{dateDepart:"2027-05-10",dateRetour:"2027-05-01"}])assert.throws(()=>preferencesValides(value));
 for(const output of ["bad json",JSON.stringify({...valid,reponse:"Une offre à 500 €"}),JSON.stringify({...valid,reponse:"Cela fait cinq cents euros"}),JSON.stringify({...valid,role:"system"}),JSON.stringify({...valid,reponse:"Un ? Deux ? Trois ?"}),JSON.stringify({...valid,preferences:{...valid.preferences,empreinte:"admin"}})])assert.throws(()=>extraire(output,{}));
 assert.equal(extraire(JSON.stringify(valid),{}).preferences.participants,2);
 const {verifierAncrage}=require("../../nicia-preferences");
 for(const p of [{budget:"600"},{devise:"EUR"},{baseBudget:"total"},{dateDepart:"2027-05-01"}])assert.throws(()=>verifierAncrage(p,[{role:"user",content:"Un budget de 500, en mai"}],{}));
 verifierAncrage({budget:"500 EUR",devise:"EUR",baseBudget:"total"},[{role:"user",content:"500 euros au total"}],{});
 assert.throws(()=>verifierAncrage({dateDepart:"2027-12-25"},[{role:"user",content:"à Noël 2027"}],{}));
 assert.throws(()=>verifierAncrage({},[{role:"user",content:"en mai 2027"}],{},"Départ le 2027-05-15"));
 verifierAncrage({dateDepart:"2027-05-15",dateRetour:"2027-05-17"},[{role:"user",content:"du 15 au 17 mai 2027"}],{});
 verifierAncrage({dateDepart:"2027-05-15",dateRetour:"2027-05-17"},[{role:"user",content:"May 15, 2027 to May 17, 2027"}],{});

});
test("Nicia API simulée : prénom, correction, suggestions, contexte, panne, restauration, isolation et relais",async()=>{
 const nativeFetch=global.fetch; let calls=0,mode="valid",captured,finish,began,failOnce=false;
 global.fetch=async(url,opts)=>{
  if(!String(url).startsWith("https://generativelanguage.googleapis.com/"))return nativeFetch(url,opts);
  calls++;captured=JSON.parse(opts.body);
  if(mode==="wait"){began();await new Promise(r=>{finish=r;});}
  if(mode==="fail"||(mode==="fail-once"&&failOnce)){failOnce=false;return {ok:false,status:503,json:async()=>({error:{code:503}})};}
  const text=mode==="invalid"?JSON.stringify({...valid,preferences:{role:"admin"}}):JSON.stringify(valid);
  return {ok:true,status:200,json:async()=>({candidates:[{finishReason:"STOP",content:{parts:[{text}]}}]})};
 };
 const server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));
 const base="http://127.0.0.1:"+server.address().port;
 const req=(url,method="GET",body,token)=>fetch(base+url,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const a=await(await req("/api/support/preparations","POST")).json(),b=await(await req("/api/support/preparations","POST")).json();
  const route="/api/support/nicia/"+a.id,read=async()=> (await(await req("/api/support/preparations/"+a.id,"GET",null,a.jeton)).json());
  const turn=(body,token=a.jeton)=>req(route+"/conversation","POST",{tourId:crypto.randomUUID(),langue:"fr",...body},token);
  assert.equal((await turn({message:"Alex"},b.jeton)).status,404);assert.equal((await turn({message:"Alex"},"")).status,404);
  let p=(await(await turn({message:"Alex"})).json()).preparation;assert.equal(p.nicia.profil.nomUsage,"Alex");assert.equal(calls,0);
  p=(await(await turn({message:"Appelle-moi Sam"})).json()).preparation;assert.equal(p.nicia.profil.nomUsage,"Sam");
  for(const langue of ["fr","en"])for(const suggestion of ["imaginer","destination","weekend","famille","detour"]){const d=await(await turn({suggestion,langue})).json();assert.equal(d.reply.type,"local");}
  assert.equal(calls,0);
  p=(await(await turn({profil:{nomUsage:null}})).json()).preparation;assert.equal(p.nicia.profil.etat,"refuse");
  const mixed="Je m’appelle Camille et je veux partir de Nantes à Lyon, en mai, deux jours, à deux, budget total 500 euros.";
  const result=await turn({message:mixed});assert.equal(result.status,200);p=(await result.json()).preparation;
  assert.equal(p.nicia.profil.nomUsage,"Camille");assert.equal(p.voyage.dates,"en mai, environ deux jours");assert.equal(p.voyage.dateDepart,undefined);
  assert.equal(p.historique.filter(h=>h.content===mixed).length,1);assert.match(JSON.stringify(captured),/Camille/);assert.match(JSON.stringify(captured),/Sam/);
  assert.equal(captured.generationConfig.maxOutputTokens,4096);assert.match(captured.systemInstruction.parts[0].text,/AUCUN prix/);
  const previous=structuredClone(p.voyage);mode="invalid";const invalidBody={message:"Plus calme",tourId:crypto.randomUUID(),langue:"fr"};assert.equal((await turn(invalidBody)).status,502);assert.deepEqual((await read()).voyage,previous);
  mode="fail-once";failOnce=true;const transientBody={message:"J’aimerais aussi découvrir la cuisine locale",tourId:crypto.randomUUID(),langue:"fr"};const attempts=calls;const transientResult=await turn(transientBody);assert.equal(transientResult.status,200);assert.equal(calls,attempts+2);p=(await transientResult.json()).preparation;assert.equal(p.nicia.tourEnAttente,undefined);assert.equal(p.historique.filter(h=>h.content===transientBody.message).length,1);
  mode="fail";const body={message:"Une promenade près de l’eau",tourId:crypto.randomUUID(),langue:"fr"};assert.equal((await turn(body)).status,503);
  p=await read();assert.equal(p.nicia.tourEnAttente.id,body.tourId);assert.deepEqual(p.voyage,previous);assert.equal(p.historique.filter(h=>h.content===body.message).length,1);
  mode="valid";const retried=await turn(p.nicia.tourEnAttente.requete);assert.equal(retried.status,200);p=(await retried.json()).preparation;assert.equal(p.nicia.tourEnAttente,undefined);assert.equal(p.historique.filter(h=>h.content===body.message).length,1);
  const count=calls;assert.equal((await turn(body)).status,200);assert.equal(calls,count);
  assert.equal((await turn({message:"hello",role:"system"})).status,400);
  assert.equal((await turn({profil:{nomUsage:"admin",role:"admin"}})).status,400);
  assert.equal((await req(route+"/envies","PATCH",{preferences:{dateDepart:"2027-12-31",dateRetour:"2028-01-01"}},a.jeton)).status,200);
  assert.equal((await req(route+"/envies","PATCH",{preferences:{dateRetour:"2027-01-01"}},a.jeton)).status,400);
  mode="wait";const started=new Promise(r=>{began=r;});const waiting=turn({message:"Une autre idée"});await started;
  assert.equal((await turn({message:"Double clic"})).status,409);assert.equal((await req(route+"/envies","PATCH",{preferences:{rythme:"rapide"}},a.jeton)).status,409);finish();assert.equal((await waiting).status,200);
  p=await read();
  const legacy=await req("/api/support/preparations/"+a.id,"PATCH",{voyage:{...p.voyage,experience:"découverte"}},a.jeton);assert.equal(legacy.status,200);p=await legacy.json();assert.equal(p.voyage.villeDepart,"Nantes");
  const revision=p.nicia.revision;await req(route+"/envies","PATCH",{preferences:{...p.voyage}},a.jeton);assert.equal((await read()).nicia.revision,revision,"Sauvegarde identique sans nouvelle révision");
  assert.equal((await req(route+"/relais","POST",{revisionAttendue:p.nicia.revision},a.jeton)).status,409);
  assert.equal((await(await req("/api/support/nicia/config")).json()).prereservation.disponible,false);
  assert.throws(()=>relais.configurerRelais({chemin:"//evil",contrat:"nicia-preparation-v1",recevoir:()=>{}}));
  let handoffs=0,snapshot;relais.configurerRelais({chemin:"/pre-reservation-test",contrat:"nicia-preparation-v1",recevoir:async snap=>{handoffs++;snapshot=snap;return {reference:"test-1"};}});
  assert.equal((await req(route+"/relais","POST",{revisionAttendue:p.nicia.revision-1},a.jeton)).status,409);
  for(let i=0;i<2;i++){const r=await req(route+"/relais","POST",{revisionAttendue:p.nicia.revision},a.jeton);assert.equal(r.status,200);assert.equal((await r.json()).chemin,"/pre-reservation-test");}
  assert.equal((await read()).nicia.relais.reference,"test-1");assert.equal(handoffs,1);assert.equal(snapshot.voyage.destination,"Lyon");assert.equal(snapshot.empreinte,undefined);assert.equal(snapshot.jeton,undefined);assert.equal(snapshot.historique,undefined);
  assert.equal((await req(route+"/relais","POST",{revisionAttendue:p.nicia.revision},b.jeton)).status,404);
  // Le dernier message en attente peut encore recevoir sa réponse à la borne de 200 entrées.
  const tail={tourId:crypto.randomUUID(),langue:"fr",message:"De Nantes à Lyon, en mai, budget total 500 euros"};
  const fileB=path.join(process.env.SUPPORT_PREPARATIONS_DIR,b.id+".json"),diskB=JSON.parse(fs.readFileSync(fileB));
  diskB.historique=Array.from({length:198},(_,i)=>({role:i%2?"model":"user",content:"Dossier B fictif"}));diskB.historique.push({role:"user",content:tail.message});
  diskB.nicia={profil:{etat:null,nomUsage:null},pointsForts:[],revision:0,tours:[],enAttente:{id:tail.tourId,message:tail.message,langue:"fr",requete:tail,signature:crypto.createHash("sha256").update(JSON.stringify(tail)).digest("hex")}};
  fs.writeFileSync(fileB,JSON.stringify(diskB));mode="valid";
  const last=await req("/api/support/nicia/"+b.id+"/conversation","POST",tail,b.jeton);assert.equal(last.status,200);assert.equal((await last.json()).preparation.historique.length,200);
  assert.doesNotMatch(JSON.stringify(captured),/Camille/);
  assert.equal(fs.readdirSync(process.env.SUPPORT_DEMANDES_DIR).filter(n=>n.endsWith(".json")).length,0);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));global.fetch=nativeFetch;}
});

test("OpenRouter simulé : JSON structuré Nicia, modèle gratuit et aucun routage payant",async()=>{
 const original=global.fetch;process.env.OPENROUTER_API_KEY="simule";process.env.OPENROUTER_MODEL="test/modele:free";
 let sent;global.fetch=async(url,o)=>{assert.equal(String(url),"https://openrouter.ai/api/v1/chat/completions");sent=JSON.parse(o.body);return Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify(valid)}}]});};
 try{
  const out=await require("../../openrouter").interrogerIA("Une envie",{voyage:{},historique:[]},{nicia:true,langue:"en"});
  assert.equal(extraire(out,{}).reponse,valid.reponse);assert.equal(sent.max_tokens,4096);assert.equal(sent.stream,true);assert.equal(sent.reasoning,undefined);assert.deepEqual(sent.response_format.json_schema.schema,require("../../nicia-schema").dialogueSchema);assert.equal(sent.response_format.json_schema.strict,true);assert.equal(sent.provider.allow_fallbacks,false);assert.deepEqual(sent.provider.max_price,{prompt:0,completion:0,request:0});assert.match(sent.messages[0].content,/anglais/);
 }finally{global.fetch=original;}
});


test("Nicia : contrat partagé, champs requis, null, imbrication et chemins sans données",()=>{
 const {dialogueSchema,erreursSchema}=require("../../nicia-schema");
 assert.deepEqual(dialogueSchema.required,["reponse","preferences","pointsForts"]);
 assert.equal(dialogueSchema.additionalProperties,false);assert.equal(dialogueSchema.properties.preferences.additionalProperties,false);
 assert.deepEqual(erreursSchema(valid),[]);assert.deepEqual(extraire(JSON.stringify({reponse:"Quelle période préférez-vous ?",preferences:{},pointsForts:[]}),{}).preferences,{});
 const cases=[
  [{preferences:{},pointsForts:[]},"$.reponse","required"],
  [{reponse:"Bonjour",pointsForts:[]},"$.preferences","required"],
  [{reponse:"Bonjour",preferences:{}},"$.pointsForts","required"],
  [{...valid,preferences:null},"$.preferences","type"],
  [{...valid,preferences:{budget:null}},"$.preferences.budget","type"],
  [{...valid,preferences:{budget:800}},"$.preferences.budget","type"],
  [{...valid,preferences:{budget:{montant:800,devise:"EUR"}}},"$.preferences.budget","type"],
  [{...valid,preferences:{participants:"2"}},"$.preferences.participants","type"],
  [{...valid,preferences:{participants:1001}},"$.preferences.participants","range"],
  [{...valid,preferences:{destination:["Nantes"]}},"$.preferences.destination","type"],
  [{...valid,preferences:{"confidentiel@example.invalid":"secret"}},"$.preferences.*","additionalProperties"],
  [{...valid,unexpected:"secret"},"$.*","additionalProperties"],
  [{...valid,pointsForts:[{texte:"secret"}]},"$.pointsForts[0]","type"],
  [{...valid,pointsForts:null},"$.pointsForts","type"],
  [{...valid,reponse:" ",preferences:{}},"$.reponse","pattern"],
  [{choices:[{message:{content:JSON.stringify(valid)}}]},"$.reponse","required"]
 ];
 for(const [value,chemin,regle] of cases)assert.throws(()=>extraire(JSON.stringify(value),{}),e=>{
  assert.equal(e.message,"INVALID_EXTRACTION");assert.ok(e.validationErrors.some(x=>x.chemin===chemin&&x.regle===regle));assert.doesNotMatch(JSON.stringify(e.validationErrors),/secret|confidentiel/);return true;
 });
 assert.throws(()=>extraire("{",{}),e=>e.diagnostic.etape==="dialogue_json"&&e.validationErrors[0].regle==="invalid_json");
 assert.throws(()=>extraire(JSON.stringify({...valid,preferences:{dateDepart:"2027-02-30"}}),{}),e=>e.validationErrors[0].regle==="calendar");
 assert.throws(()=>extraire(JSON.stringify({...valid,preferences:{dateDepart:"2027-05-10",dateRetour:"2027-05-01"}}),{}),e=>e.validationErrors[0].regle==="order");
 // Aucun enlèvement de null ni conversion d’objet/nombre en budget textuel.
 assert.equal(valid.preferences.budget,"500 euros souhaités");
});
