const {test}=require("node:test");
const assert=require("node:assert/strict");
const backend=require("./dates");
test("calendrier frontend/backend : dates impossibles, brouillons, ordre, même jour, mois/année",async()=>{
 for(const api of [backend,await import("../site/src/support/dates.js")]) {
  for(const d of ["2027-02-29","2027-04-31","0000-01-01","2027-2-01"]) assert.equal(api.dateValide(d),false);
  assert.equal(api.dateValide("2028-02-29"),true);
  assert.deepEqual(api.problemesDates({}),[]);
  assert.deepEqual(api.problemesDates({dateDepart:"2027-05-10",dateRetour:""}),[]);
  assert.equal(api.problemesDates({},true).length,2);
  assert.equal(api.problemesDates({dateDepart:"2027-05-11",dateRetour:"2027-05-10"}).length,1);
  for(const [a,b,n] of [["2027-05-10","2027-05-10",1],["2027-01-31","2027-02-01",2],["2027-12-31","2028-01-01",2],["2028-02-28","2028-03-01",3]]) assert.equal(api.dureeJours({dateDepart:a,dateRetour:b}),n);
 }
});
test("ancienne saisie conservée mais dates précises requises avant génération",()=>{
 const {problemesPreferences}=require("./programmes");
 assert.ok(problemesPreferences({dates:"mai, une semaine"}).some(p=>p.includes("dateDepart")));
});

test("API : brouillon, restauration, anciennes données, demande et obsolescence",async()=>{
 const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
 process.env.SUPPORT_PREPARATIONS_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"dates-prep-"));
 process.env.SUPPORT_DEMANDES_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"dates-demandes-"));
 // programmes ne contient pas de stockage ; server/preparations sont chargés après les chemins isolés.
 require.cache[require.resolve("./emails")]={exports:{planifierEmail:async()=>({statut:"SIMULE"})}};
 const {app}=require("./server");const server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));
 let p;const req=(route,method="GET",body)=>fetch("http://127.0.0.1:"+server.address().port+route,{method,headers:{"Content-Type":"application/json",...(p?{Authorization:"Bearer "+p.jeton}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try {
  p=await(await req("/api/support/preparations","POST")).json();const route="/api/support/preparations/"+p.id;
  assert.equal((await req(route,"PATCH",{voyage:{dateDepart:"2027-01-31"}})).status,200);
  for(const voyage of [{dateDepart:"2027-02-30"},{dateDepart:"2027-05-11",dateRetour:"2027-05-10"}]) assert.equal((await req(route,"PATCH",{voyage})).status,400);
  const voyage={destination:"Lyon",dates:"mai, durée flexible",participants:2,budget:"500 EUR",activites:"culture",experience:"détente",rythme:"calme",contraintes:"aucune"};
  assert.equal((await req(route,"PATCH",{voyage})).status,200);
  assert.deepEqual((await(await req(route)).json()).voyage,voyage);
  assert.equal((await req(route+"/programme","POST",{versionAttendue:0})).status,422);
  const precis={...voyage,dateDepart:"2027-12-31",dateRetour:"2028-01-01"};
  await req(route,"PATCH",{voyage:precis});
  assert.deepEqual((await(await req(route)).json()).voyage,precis);
  const file=path.join(process.env.SUPPORT_PREPARATIONS_DIR,p.id+".json");const disk=JSON.parse(fs.readFileSync(file));
  disk.programme={version:1,empreinteVoyage:require("./programmes").empreinteVoyage(precis),contenu:{}};fs.writeFileSync(file,JSON.stringify(disk));
  await req(route,"PATCH",{voyage:{...precis,dateRetour:"2028-01-02"}});
  assert.equal((await(await req(route)).json()).programmeObsolete,true);
  const client={nom:"Test fictif",email:"test@example.invalid"};
  assert.equal((await req(route+"/programme/transmission","POST",{versionAcceptee:1,accord:true,client})).status,409);
  assert.equal((await req("/api/support/demandes","POST",{requestId:crypto.randomUUID(),client,voyage})).status,400);
  const id=crypto.randomUUID();assert.equal((await req("/api/support/demandes","POST",{requestId:id,client,voyage:precis})).status,201);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(process.env.SUPPORT_DEMANDES_DIR,id+".json"))).voyage,precis);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
