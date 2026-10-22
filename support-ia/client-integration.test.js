const { test } = require("node:test");
const assert = require("node:assert/strict");
const importer = () => import("../site/src/support/client.js");
const programme = { version: 1, contenu: { statut: "proposition", titre: "Test" } };
function stockage(acces) { let valeur=acces ? JSON.stringify(acces) : null; return { getItem:()=>valeur, setItem:(_k,v)=>{valeur=v;} }; }
test("client React : restauration confidentielle sans créer de préparation, sources conservées", async () => {
  const { createSupportClient } = await importer();
  const appels=[];
  const client=createSupportClient({ storage:stockage({id:"p",jeton:"secret-test"}), fetchImpl:async(url,options)=>{
    appels.push({url,options});return {ok:true,json:async()=>({id:"p",voyage:{destination:"Lyon"},historique:[{role:"model",content:"Horaires",sources:[{id:"agence-horaires",url:"/contact"}]}],programme})};
  }});
  const p=await client.restore();
  assert.equal(appels.length,1);
  assert.equal(appels[0].options.method,"GET");
  assert.equal(appels[0].options.headers.Authorization,"Bearer secret-test");
  assert.doesNotMatch(appels[0].url,/secret-test/);
  assert.equal(p.historique[0].sources[0].id,"agence-horaires");
  assert.equal(p.programme.version,1);
});
test("client React : session vide sans appel initial ; création dédupliquée", async () => {
  const { createSupportClient } = await importer();let creations=0;
  const client=createSupportClient({storage:stockage(),fetchImpl:async(url)=>{
    if(url.endsWith("preparations")) {creations++;return {ok:true,json:async()=>({id:"p",jeton:"test",voyage:{},historique:[]})};}
    return {ok:true,json:async()=>({reply:{role:"assistant",content:"Bonjour"}})};
  }});
  assert.equal(await client.restore(),null);assert.equal(creations,0);
  await Promise.all([client.ask("Bonjour"),client.ask("Question")]);assert.equal(creations,1);
});
test("client React : modification et transmission n’envoient jamais le programme navigateur", async () => {
  const { createSupportClient } = await importer();const appels=[];
  const p={id:"p",jeton:"secret-test",voyage:{destination:"Lyon"},historique:[],programme};
  const client=createSupportClient({storage:stockage(),fetchImpl:async(url,options)=>{
    appels.push({url,options});return {ok:true,json:async()=>url.endsWith("transmission")?{reference:"ref",versionAcceptee:1}:p};
  }});
  await client.start();await client.modify("Alléger le jour 1",1);await client.transmit({nom:"Test",email:"test@example.invalid"},1,true);
  const mod=JSON.parse(appels[1].options.body),trans=JSON.parse(appels[2].options.body);
  assert.equal(mod.versionAttendue,1);assert.equal(trans.versionAcceptee,1);assert.equal(trans.accord,true);
  assert.equal(trans.programme,undefined);assert.equal(trans.voyage,undefined);
  await assert.rejects(client.modify("Changer",9),/changé/);
  assert.equal(appels.length,3);
});
test("client React : panne sans perte de la préparation et du programme", async () => {
  const { createSupportClient } = await importer();
  const client=createSupportClient({storage:stockage(),fetchImpl:async(url)=>({ok:!url.endsWith("/programme"),json:async()=>url.endsWith("/programme")?{error:{message:"Gemini HTTP 503"}}:{id:"p",jeton:"test",voyage:{destination:"Lyon"},historique:[],programme}})});
  await client.start();await assert.rejects(client.generate(),/503/);assert.equal(client.current.programme.version,1);assert.equal(client.current.voyage.destination,"Lyon");
});
test("client React : stockage bloqué et refus de restauration restent explicites", async () => {
  const { createSupportClient } = await importer();
  const client=createSupportClient({storage:{getItem(){throw Error();},setItem(){throw Error();}},fetchImpl:async()=>({ok:true,json:async()=>({id:"p",jeton:"test",voyage:{},historique:[]})})});
  assert.equal(await client.restore(),null);assert.equal((await client.start()).id,"p");
  const interdit=createSupportClient({storage:stockage({id:"ancien",jeton:"test"}),fetchImpl:async()=>({ok:false,json:async()=>({error:{message:"Préparation inaccessible"}})})});
  await assert.rejects(interdit.restore(),/inaccessible/);
});


test("client React : lien email prioritaire, fragment retiré, token jamais dans une URL réseau",async()=>{
 const {createSupportClient}=await importer();const id="11111111-1111-4111-8111-111111111111",jeton="a".repeat(64),appels=[];
 let adresse;
 const client=createSupportClient({storage:stockage({id:"ancien-client",jeton:"ancien"}),location:{pathname:"/assistant",search:"",hash:"#preparation="+id+"&jeton="+jeton},history:{replaceState:(_a,_b,u)=>{adresse=u;}},fetchImpl:async(url,o)=>{appels.push({url,o});return{ok:true,json:async()=>({id,voyage:{destination:"Dossier email"},historique:[]})};}});
 assert.equal(adresse,"/assistant");const p=await client.restore();assert.equal(p.id,id);assert.equal(appels[0].o.headers.Authorization,"Bearer "+jeton);assert.ok(!appels[0].url.includes(jeton));assert.ok(!appels[0].url.includes("ancien-client"));
 const expire=createSupportClient({location:{pathname:"/assistant",search:"",hash:"#preparation="+id+"&jeton="+jeton},history:{replaceState(){}},fetchImpl:async()=>({ok:false,json:async()=>({error:{code:"EMAIL_LINK_EXPIRED",message:"Ce lien de préparation a expiré. /contact"}})})});
 await assert.rejects(expire.restore(),/expiré/);assert.equal(expire.current,null);
 const invalide=createSupportClient({storage:stockage({id:"autre-client",jeton:"ancien"}),location:{pathname:"/assistant",search:"",hash:"#jeton=invalide"},history:{replaceState(){}},fetchImpl:()=>{throw Error("Ne doit pas ouvrir un autre dossier");}});
 await assert.rejects(invalide.restore(),/invalide/);
});


test("client React : double initialisation StrictMode ne perd pas le lien email au profit d’un autre dossier",async()=>{
 const {createSupportClient}=await importer();const id="11111111-1111-4111-8111-111111111111",token="b".repeat(64);
 const location={pathname:"/assistant",search:"",hash:"#preparation="+id+"&jeton="+token};
 const history={replaceState(){location.hash="";}};let adresse;
 const options={location,history,storage:{getItem:()=>JSON.stringify({id:"autre-dossier",jeton:"autre"}),setItem(){throw Error("Stockage indisponible");}},fetchImpl:async(url,o)=>{adresse=url;assert.equal(o.headers.Authorization,"Bearer "+token);return{ok:true,json:async()=>({id,voyage:{},historique:[]})};}};
 createSupportClient(options); // premier rendu abandonné
 const actif=createSupportClient(options);assert.equal((await actif.restore()).id,id);assert.ok(!adresse.includes("autre-dossier"));
});

test("Nicia : identité, accueil et auteurs FR/EN sans changer les rôles techniques", async () => {
  const {assistantName,assistantTitle,authorLabel,welcomeMessage}=await import("../site/src/support/identity.js");
  assert.equal(assistantName,"Nicia");
  for(const lang of ["fr","en"]){
    const title=assistantTitle(lang), welcome=welcomeMessage(lang);
    assert.equal(title,lang==="en"?"Nicia, your AI assistant":"Nicia, votre assistant IA");
    assert.ok(welcome.content.includes(title));assert.equal(welcome.role,"assistant");
    for(const role of ["assistant","model"])assert.equal(authorLabel(role,lang),"Nicia");
    assert.equal(authorLabel("user",lang),lang==="en"?"You":"Vous");
  }
  const {instructionSysteme}=require("./ai-context");
  for(const programme of [false,true]){
    const prompt=instructionSysteme({voyage:{},historique:[]},{programme});
    assert.match(prompt,/Vous êtes Nicia/);assert.match(prompt,/Nicia, votre assistant IA/);assert.match(prompt,/Nicia, your AI assistant/);
    assert.match(prompt,/Ne déclenchez jamais de réservation/);assert.match(prompt,/langue du client/);
  }
});
