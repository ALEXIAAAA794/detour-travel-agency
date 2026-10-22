const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
process.env.SUPPORT_PREPARATIONS_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"confirmation-prep-"));
process.env.SUPPORT_DEMANDES_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"confirmation-demandes-"));
let emails=0;const queued=new Set();
require.cache[require.resolve("./emails")]={exports:{planifierEmail:async(ref)=>{queued.add(ref);emails++;return {statut:"SIMULE"};}}};
const {app}=require("./server");
test("confirmation : preuve persistante, isolation, accès direct, dates et idempotence",async()=>{
 const server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));
 const base="http://127.0.0.1:"+server.address().port;
 const req=(route,method="GET",body,token)=>fetch(base+route,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const a=await(await req("/api/support/preparations","POST")).json(),b=await(await req("/api/support/preparations","POST")).json();
  const route="/api/support/preparations/"+a.id,proof=route+"/confirmation-preferences";
  assert.equal((await req(proof)).status,404);assert.equal((await req(proof,"GET",null,b.jeton)).status,404);assert.equal((await req(proof,"GET",null,a.jeton)).status,404);
  const voyage={destination:"Lyon",dateDepart:"2027-12-31",dateRetour:"2028-01-01",participants:2,budget:"500 EUR",activites:"culture",experience:"détente",rythme:"calme",contraintes:"aucune"};
  await req(route,"PATCH",{voyage},a.jeton);
  const body={requestId:crypto.randomUUID(),preparationId:a.id,client:{nom:"Test fictif",email:"test@example.invalid"},voyage};
  assert.equal((await req("/api/support/demandes","POST",{...body,client:{}},a.jeton)).status,400);
  assert.equal((await req(proof,"GET",null,a.jeton)).status,404);
  const replies=await Promise.all([req("/api/support/demandes","POST",body,a.jeton),req("/api/support/demandes","POST",body,a.jeton)]);
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,201]);assert.equal(queued.size,1);
  for(let i=0;i<2;i++){
   const r=await req(proof,"GET",null,a.jeton);assert.equal(r.status,200);assert.equal(r.headers.get("cache-control"),"no-store");const d=await r.json();assert.equal(d.reference,body.requestId);assert.equal(d.type,"preferences");assert.deepEqual(Object.keys(d).sort(),["reference","transmisLe","type"]);
  }
  assert.deepEqual((await(await req(route,"GET",null,a.jeton)).json()).voyage,voyage);
  const disk=JSON.parse(fs.readFileSync(path.join(process.env.SUPPORT_DEMANDES_DIR,body.requestId+".json")));assert.deepEqual(disk.voyage,voyage);
  // Une transmission de programme seule ne doit pas être présentée comme envoi de préférences.
  fs.writeFileSync(path.join(process.env.SUPPORT_DEMANDES_DIR,b.id+".json"),JSON.stringify({reference:b.id,preparationId:b.id,programmeAccepte:{version:1}}));
  assert.equal((await req("/api/support/preparations/"+b.id+"/confirmation-preferences","GET",null,b.jeton)).status,404);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test("client : confirmation sans session ne crée rien ; restauration et contrôle serveur",async()=>{
 const {createSupportClient}=await import("../site/src/support/client.js");let calls=[];
 const empty=createSupportClient({fetchImpl:async()=>{throw Error("Aucun appel attendu");}});await assert.rejects(empty.confirmationPreferences(),/No verified/);
 const ref=crypto.randomUUID();const p={id:crypto.randomUUID(),voyage:{dateDepart:"2027-12-31",dateRetour:"2028-01-01"},historique:[]};
 const storage={getItem:()=>JSON.stringify({id:p.id,jeton:"test-confidentiel"}),setItem:()=>{}};
 const client=createSupportClient({storage,fetchImpl:async(url,o)=>{calls.push({url,o});return {ok:true,json:async()=>url.endsWith("confirmation-preferences")?{type:"preferences",reference:ref}:p};}});
 assert.equal((await client.confirmationPreferences()).reference,ref);assert.equal(calls.length,2);assert.ok(calls.every(c=>!c.url.includes("test-confidentiel")&&c.o.headers.Authorization==="Bearer test-confidentiel"));
 const failed=createSupportClient({storage,fetchImpl:async()=>({ok:false,json:async()=>({error:{message:"Transmission non vérifiée"}})})});await assert.rejects(failed.confirmationPreferences(),/non vérifiée/);
});
