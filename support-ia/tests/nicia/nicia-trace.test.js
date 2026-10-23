const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto"),express=require("express");
process.env.SUPPORT_PREPARATIONS_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"nicia-trace-prep-"));process.env.SUPPORT_DEMANDES_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"nicia-trace-demandes-"));process.env.SUPPORT_AI_RATE_LIMIT="1000";
require.cache[require.resolve("../../emails")]={exports:{planifierEmail:()=>{throw Error("EMAIL_FORBIDDEN");}}};
const {creerMessage,tracePublique}=require("../../nicia-historique"),{sauver,lirePreparation}=require("../../preparations"),{creerTraceRouter}=require("../../nicia-trace");

test("Trace : nouvelles métadonnées serveur, ancien historique honnête et projection fermée",()=>{
 const old={role:"model",content:"Ancien message",promptInterne:"PROMPT_SECRET",sources:[{id:"agence-destinations",titre:"Destinations",url:"/destinations",jeton:"SOURCE_SECRET"},{id:"inconnu",titre:"Secret",url:"/.env"}]};
 const p={id:crypto.randomUUID(),historique:[old,creerMessage("user","Un week-end"),creerMessage("model","Une piste",{sources:[{id:"agence-destinations",titre:"Destinations",url:"/destinations"}],baseVersion:2}),{role:"system",content:"PROMPT_SYSTEM"}],jeton:"TOKEN_SECRET",diagnostic:"DIAGNOSTIC_SECRET"};
 const before=JSON.stringify(p),a=tracePublique(p),b=tracePublique(p);assert.equal(JSON.stringify(p),before);assert.deepEqual(a,b);assert.equal(a.length,3);assert.equal(a[0].horodatage,null);assert.equal(a[0].statut,"historique_ancien");assert.match(a[0].id,/^legacy-/);assert.equal(a[1].statut,"message_recu");assert.equal(a[2].statut,"reponse_complete");assert.equal(a[2].versionBase,2);assert.ok(Number.isFinite(Date.parse(a[1].horodatage)));assert.equal(a[2].sources[0].id,"agence-destinations");assert.equal(a[0].sources.length,1);assert.doesNotMatch(JSON.stringify(a),/SECRET|PROMPT_SYSTEM|jeton|diagnostic/);
 p.historique.push(creerMessage("user","Suite"));assert.equal(tracePublique(p)[0].id,a[0].id);
 sauver(p);assert.deepEqual(tracePublique(lirePreparation(p.id)),tracePublique(p));assert.equal(lirePreparation(p.id).historique[0].horodatage,undefined);assert.equal(lirePreparation("../../.env"),null);
});
test("Trace : route réelle fermée malgré jeton client et faux rôle dans les en-têtes",async()=>{
 const {app}=require("../../server"),s=app.listen(0,"127.0.0.1");await new Promise(r=>s.once("listening",r));
 try{for(const headers of [{},{Authorization:"Bearer jeton-client","X-Role":"conseiller"},{"X-Team-Key":"technique"}]){const r=await fetch("http://127.0.0.1:"+s.address().port+"/api/prereservations/fictif/trace",{headers});assert.equal(r.status,503);assert.equal((await r.json()).error.code,"TRACE_NOT_CONNECTED");assert.equal(r.headers.get("cache-control"),"no-store");}}finally{s.closeAllConnections();await new Promise(r=>s.close(r));}
});
test("Trace : adaptateur conseiller simulé, dossier autorisé et isolation",async()=>{
 const pa={id:crypto.randomUUID(),historique:[creerMessage("user","Dossier A")],nicia:{relais:{reference:"pre-A"}},empreinte:"SECRET_A"},pb={id:crypto.randomUUID(),historique:[creerMessage("user","Dossier B")],nicia:{relais:{reference:"pre-B"}}};sauver(pa);sauver(pb);
 const dossiers={"pre-A":{id:"pre-A",preparationId:pa.id,conseillerId:"a"},"pre-B":{id:"pre-B",preparationId:pb.id,conseillerId:"b"},"sans-lien":{id:"sans-lien",conseillerId:"a"},"faux-lien":{id:"faux-lien",preparationId:pb.id,conseillerId:"a"}};let lectures=0;
 const app=express();app.use("/api/prereservations",creerTraceRouter({authentifierConseiller:async req=>({"Bearer conseiller-a":{id:"a",role:"conseiller"},"Bearer conseiller-b":{id:"b",role:"conseiller"},"Bearer client":{id:"a",role:"client"}})[req.headers.authorization],resoudrePrereservation:async id=>dossiers[id],peutConsulter:async(c,d)=>c.id===d.conseillerId,lirePreparation:async id=>{lectures++;return lirePreparation(id);}}));
 const s=app.listen(0,"127.0.0.1");await new Promise(r=>s.once("listening",r));const get=(id,token)=>fetch("http://127.0.0.1:"+s.address().port+"/api/prereservations/"+id+"/trace",{headers:token?{Authorization:"Bearer "+token}:{}});
 try{
  assert.equal((await get("pre-A")).status,401);assert.equal((await get("pre-A","client")).status,403);assert.equal(lectures,0);
  assert.equal((await get("pre-B","conseiller-a")).status,404);assert.equal(lectures,0);
  const r=await get("pre-A","conseiller-a"),d=await r.json();assert.equal(r.status,200);assert.equal(d.versionContrat,1);assert.equal(d.echanges[0].message,"Dossier A");assert.doesNotMatch(JSON.stringify(d),/Dossier B|SECRET_A|empreinte|preparationId/);
  assert.equal((await get("pre-B","conseiller-b")).status,200);assert.equal((await get("inconnu","conseiller-a")).status,404);assert.equal((await get("sans-lien","conseiller-a")).status,409);assert.equal((await get("faux-lien","conseiller-a")).status,409);
 }finally{s.closeAllConnections();await new Promise(r=>s.close(r));}
});
test("Trace : échange Nicia FAQ, réessai et rechargement ; panne sans fausse réponse",async()=>{
 const {app}=require("../../server"),native=global.fetch;process.env.AI_PROVIDER="gemini";process.env.GEMINI_API_KEY="factice";global.fetch=(url,o)=>String(url).startsWith("http://127.0.0.1:")?native(url,o):Promise.reject(Error("Panne simulée sans appel réseau"));
 const s=app.listen(0,"127.0.0.1");await new Promise(r=>s.once("listening",r));const base="http://127.0.0.1:"+s.address().port;
 try{
 const p=await(await fetch(base+"/api/support/preparations",{method:"POST"})).json(),headers={"Content-Type":"application/json",Authorization:"Bearer "+p.jeton};
 const b={tourId:crypto.randomUUID(),langue:"fr",message:"Quelles destinations propose DÉTOUR ?"},route=base+"/api/support/nicia/"+p.id+"/conversation";
 const first=await(await fetch(route,{method:"POST",headers,body:JSON.stringify(b)})).json(),trace=tracePublique(first.preparation);assert.equal(trace.length,2);assert.ok(trace.every(m=>m.horodatage));assert.equal(new Set(trace.map(m=>m.id)).size,2);assert.ok(trace[1].horodatage>=trace[0].horodatage);assert.ok(trace[1].sources.some(s=>s.id==="agence-destinations"));
 const again=await(await fetch(route,{method:"POST",headers,body:JSON.stringify(b)})).json();assert.deepEqual(tracePublique(again.preparation),trace);
 const loaded=await(await fetch(base+"/api/support/preparations/"+p.id,{headers})).json();assert.deepEqual(tracePublique(loaded),trace);
 const failure={tourId:crypto.randomUUID(),langue:"fr",message:"Une promenade très calme près de la mer"};for(let i=0;i<2;i++)assert.equal((await fetch(route,{method:"POST",headers,body:JSON.stringify(failure)})).status,503);
 const disk=lirePreparation(p.id);assert.equal(disk.historique.length,3);assert.equal(disk.historique[2].role,"user");assert.equal(tracePublique(disk).filter(m=>m.role==="assistant").length,1);assert.deepEqual(tracePublique(disk).slice(0,2),trace);
 // Conserver la déduplication au-delà des dix réponses autrefois mises en cache.
 for(let i=0;i<11;i++)assert.equal((await fetch(route,{method:"POST",headers,body:JSON.stringify({tourId:crypto.randomUUID(),langue:"fr",suggestion:"imaginer"})})).status,200);
 const count=lirePreparation(p.id).historique.length;
 const replay=await fetch(route,{method:"POST",headers,body:JSON.stringify(b)});assert.equal(replay.status,200);assert.equal(lirePreparation(p.id).historique.length,count);assert.equal(tracePublique(lirePreparation(p.id))[0].id,trace[0].id);

 }finally{global.fetch=native;s.closeAllConnections();await new Promise(r=>s.close(r));}
});
