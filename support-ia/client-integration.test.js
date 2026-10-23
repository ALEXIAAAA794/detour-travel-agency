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

test("Nicia client : restauration, conversation structurée, erreur et relais sans données dans l’URL",async()=>{
 const {createSupportClient}=await importer();const calls=[];let failure=false;
 const p={id:"private-preparation",voyage:{dates:"en mai"},historique:[],nicia:{revision:2,profil:{nomUsage:"Alex"}}};
 const client=createSupportClient({storage:stockage({id:p.id,jeton:"test-token-confidentiel"}),fetchImpl:async(url,o)=>{
   calls.push({url,o});if(failure)return {ok:false,json:async()=>({error:{message:"panne simulée"}})};
   return {ok:true,json:async()=>url.endsWith("/config")?{prereservation:{disponible:false}}:url.endsWith("/conversation")?{preparation:{...p,voyage:{dates:"en juin"}},reply:{content:"Réponse simulée"}}:url.endsWith("/relais")?{chemin:"/suite-test"}:p};
 }});
 assert.equal((await client.niciaConfig()).prereservation.disponible,false);
 assert.equal(calls.length,1,"Consulter le raccordement ne crée pas de préparation");
 await client.restore();await client.converse({tourId:"fictif",message:"Je pars en juin",langue:"fr"});assert.equal(client.current.voyage.dates,"en juin");
 failure=true;await assert.rejects(client.converse({tourId:"fictif2",message:"suite",langue:"fr"}),/panne simulée/);assert.equal(client.current.voyage.dates,"en juin");
 failure=false;assert.equal((await client.handoff()).chemin,"/suite-test");
 const b=JSON.parse(calls.at(-1).o.body);assert.deepEqual(b,{revisionAttendue:2});
 assert.ok(calls.every(c=>!c.url.includes("confidentiel")&&!c.url.includes("Alex")&&!c.url.includes("juin")));
});


test("Nicia client : après panne, réconciliation enregistrée et réessai du même tour",async()=>{
 const {createSupportClient}=await importer();let disk={id:"p",voyage:{budget:"800 euros"},historique:[]},posts=[],fail=true;
 const body={tourId:"same-turn",langue:"fr",message:"Une envie fictive"};
 const client=createSupportClient({storage:stockage({id:"p",jeton:"test"}),fetchImpl:async(url,o)=>{
  if(o.method==="GET")return Response.json(disk);
  const b=JSON.parse(o.body);posts.push(b);if(!disk.historique.length)disk={...disk,historique:[{role:"user",content:b.message}],nicia:{tourEnAttente:{id:b.tourId,requete:b}}};
  if(fail)return Response.json({error:{code:"AI_UNAVAILABLE",message:"panne simulée"}},{status:503});
  disk={...disk,historique:[...disk.historique,{role:"model",content:"Réponse fictive"}],nicia:{}};return Response.json({preparation:disk,reply:{content:"Réponse fictive"}});
 }});
 await client.restore();await assert.rejects(client.converse(body),e=>e.preparationChecked===true);
 assert.equal(client.lastMessageRecorded,true);assert.equal(client.current.historique.length,1);
 fail=false;await client.converse(body);assert.deepEqual(posts,[body,body]);assert.equal(client.current.historique.filter(m=>m.role==="user").length,1);assert.equal(client.current.voyage.budget,"800 euros");
});
test("Nicia client : texte non confirmé conservable après refus ou coupure",async()=>{
 const {createSupportClient}=await importer();
 for(const mode of ["refus","coupure","avantEnvoi"]){let gets=0;
 const client=createSupportClient({storage:stockage({id:"p",jeton:"test"}),fetchImpl:async(url,o)=>{
  if(o.method==="GET"){gets++;if(mode==="avantEnvoi"||mode==="coupure"&&gets>1)throw Error("network");return Response.json({id:"p",voyage:{},historique:[]});}
  if(mode==="coupure")throw Error("network");return Response.json({error:{code:"INVALID_MESSAGE",message:"refus"}},{status:400});
 }});
 await assert.rejects(client.converse({tourId:"test",langue:"fr",message:"Texte à préserver"}));assert.equal(client.lastMessageRecorded,false);
 }
});

test("Nicia écran : présentation courte et accès au formulaire de pré-réservation FR/EN",()=>{
 const source=require("node:fs").readFileSync(require("node:path").join(__dirname,"../site/src/pages/Assistant.jsx"),"utf8");
 assert.doesNotMatch(source,/Nicia collects your wishes and prepares a recap\.|Nicia recueille vos envies et prépare un récapitulatif\.|Pre-booking is not available here yet\.|La pré-réservation n’est pas encore disponible ici\./);
 assert.match(source,/disabled=\{s.pending\|\|!ready\}/);
 assert.match(source,/navigate\("\/espace\/prereservation"/);
 assert.match(source,/assistantTitle\(s.language\)/);assert.match(source,/to="\/contact"/);
 assert.match(source,/La durée de conservation reste à définir/);
});

test("les boutons d’accueil et de Nicia ouvrent le même chat ; la pré-réservation reprend les envies",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const read=file=>fs.readFileSync(path.join(__dirname,"../site/src",file),"utf8");
 assert.match(read("pages/Home.jsx"),/to="\/assistant">Parlons de votre projet/);
 assert.match(read("components/SupportChat.jsx"),/to="\/assistant"/);
 assert.match(read("App.jsx"),/path="assistant" element=\{<RequireClient><Assistant \/><\/RequireClient>\}/);
 assert.equal(fs.existsSync(path.join(__dirname,"../site/assistant.html")),false);
 assert.equal(fs.existsSync(path.join(__dirname,"../site/assistant-classique.html")),false);
 const form=read("pages/ClientJourney.jsx");
 assert.match(form,/location\.pathname === "\/espace\/prereservation"/);
 assert.match(form,/defaultValue=\{initialDraft\.destination/);
 assert.match(form,/defaultValue=\{initialDraft\.preferences/);
});

test("les parcours privés requièrent un compte et les demandes arrivent dans les onglets gestionnaire",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const read=file=>fs.readFileSync(path.join(__dirname,"../site/src",file),"utf8");
 const app=read("App.jsx");
 for(const route of ["assistant","pre-reservation","espace/:section?","rendez-vous"])
  assert.match(app,new RegExp(`path="${route.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}" element=\\{<RequireClient>`));
 assert.match(read("pages/Destinations.jsx"),/to="\/espace\/prereservation"/);
 assert.match(read("pages/Reviews.jsx"),/to="\/assistant">\s*Demander un devis/);
 assert.match(read("pages/Agency.jsx"),/to="\/rendez-vous"/);
 assert.match(read("pages/AppointmentRequest.jsx"),/\/appointments/);
 assert.match(read("pages/ClientJourney.jsx"),/Authorization:\s*`Bearer \$\{localStorage\.getItem\("detour_token"\)\}`/);
 const dashboard=fs.readFileSync(path.join(__dirname,"../gestionnaire/src/pages/Dashboard.jsx"),"utf8");
 assert.match(dashboard,/activeSection === "appointments" && <Appointments \/>/);
 assert.match(dashboard,/title: "Rendez-vous"/);
 assert.match(fs.readFileSync(path.join(__dirname,"../gestionnaire/src/pages/Appointments.jsx"),"utf8"),/Demandes de rendez-vous/);
 assert.match(fs.readFileSync(path.join(__dirname,"../gestionnaire/src/pages/Requests.jsx"),"utf8"),/\/manager-api\/requests/);
 const clients=fs.readFileSync(path.join(__dirname,"../gestionnaire/src/pages/Clients.jsx"),"utf8");
 assert.match(clients,/fetch\("\/manager-api\/clients"/);
 assert.match(clients,/fetch\("\/manager-api\/requests"/);
 assert.doesNotMatch(clients,/fetch\("\/api\/clients"/);
 assert.match(fs.readFileSync(path.join(__dirname,"../conseillers/app.py"),"utf8"),/\/manager-api\/clients[\s\S]*?\/api\/clients/);
});

test("le passage à Mon espace ne transmet que les champs du formulaire de pré-réservation",async()=>{
 const {prebookingDraft}=await import("../site/src/support/prebooking.js");
 const result=prebookingDraft({
  destination:"Lyon",villeDepart:"Nantes",dates:"un week-end en mai",participants:2,
  budget:"500",devise:"EUR",experience:"Culture",rythme:"calme",
  dateDepart:"2027-05-10",dateRetour:"2027-05-12",jeton:"secret",historique:["privé"]
 });
 assert.deepEqual(result,{
  destination:"Lyon",departure:"2027-05-10",returnDate:"2027-05-12",datePreference:"",travelers:2,
  budget:"500 EUR",travelType:"Culture",
  preferences:"Ville de départ : Nantes\nExpérience recherchée : Culture\nRythme : calme"
 });
 const approximate=prebookingDraft({destination:"Lyon",dates:"en mai",participants:1});
 assert.equal(approximate.departure,"");
 assert.equal(approximate.datePreference,"en mai");
 assert.equal(approximate.preferences,"");
 assert.equal(JSON.stringify(result).includes("secret"),false);
});

test("avis réels, accès Mon espace et contact email sont reliés au parcours client",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const read=file=>fs.readFileSync(path.join(__dirname,"../site/src",file),"utf8");
 const reviews=read("pages/Reviews.jsx");
 assert.match(reviews,/published-review-card/);
 assert.match(reviews,/fetch\(`\$\{API\}\/reviews`\)/);
 assert.match(reviews,/\/assistant/);
 assert.match(reviews,/Alice et Maxime/);
 assert.match(reviews,/Julie et Marc/);
 assert.match(reviews,/Léa et Antoine/);
 assert.match(reviews,/isExample: true/);
 const layout=read("components/Layout.jsx");
 assert.match(layout,/\{user && <NavLink to="\/espace"/);
 assert.match(layout,/to=\{user \? "\/profile" : "\/login"\}/);
 assert.match(layout,/aria-label=\{user \? "Mon profil" : "Connexion"\}/);
 assert.match(layout,/mailto:contact@detour-voyages\.fr/);
 const assistant=read("pages/Assistant.jsx");
 assert.match(assistant,/mailto:contact@detour-voyages\.fr\?subject=/);
 assert.match(assistant,/user\?\.email/);
 assert.match(read("pages/ClientJourney.jsx"),/Coucou \{user\?\.name/);
 assert.match(read("auth/RequireClient.jsx"),/if \(!user\) return <Navigate to="\/login"/);
});

test("l’assistant IA est routé vers son service et son accès reste visible sous la navigation",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const siteRoot=path.join(__dirname,"../site/src");
 const proxy=fs.readFileSync(path.join(__dirname,"../site/vite.config.js"),"utf8");
 const launcher=fs.readFileSync(path.join(siteRoot,"components/SupportChat.jsx"),"utf8");
 const styles=fs.readFileSync(path.join(siteRoot,"styles/support-brand.css"),"utf8");
 assert.match(proxy,/["']\/api\/support["']\s*:\s*\{[\s\S]*?DETOUR_SUPPORT_API_PROXY[\s\S]*?127\.0\.0\.1:3001/);
 assert.match(launcher,/to="\/assistant"/);
 assert.match(launcher,/<strong>Nicia<\/strong>/);
 assert.doesNotMatch(launcher,/<small>/);
 assert.match(styles,/support-chat\.support-brand\s*\{\s*position:fixed;\s*top:calc\(4\.25rem \+ 1rem\)/);
 assert.match(styles,/nicia-status-pulse/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});

test("le consentement cookies est global, mémorise acceptation ou refus et renvoie à l’accueil après acceptation",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const root=path.join(__dirname,"../site/src");
 const consent=fs.readFileSync(path.join(root,"components/CookieConsent.jsx"),"utf8");
 const layout=fs.readFileSync(path.join(root,"components/Layout.jsx"),"utf8");
 assert.match(consent,/choice === "accepted" \|\| choice === "rejected"/);
 assert.doesNotMatch(consent,/choice === "1"/);
 assert.match(consent,/navigate\("\/", \{ replace: true \}\)/);
 assert.match(consent,/>Accepter</);
 assert.match(consent,/>Refuser</);
 assert.match(layout,/<CookieConsent \/>/);
});

test("le gestionnaire récupère les comptes client avec les demandes via son relais authentifié",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const service=fs.readFileSync(path.join(__dirname,"../backend/src/services/client.service.ts"),"utf8");
 const route=fs.readFileSync(path.join(__dirname,"../backend/src/routes/client.routes.ts"),"utf8");
 const manager=fs.readFileSync(path.join(__dirname,"../conseillers/app.py"),"utf8");
 assert.match(service,/prisma\.clientAccount\.findMany/);
 assert.match(service,/select:\s*\{\s*id:\s*true,\s*name:\s*true,\s*email:\s*true,\s*createdAt:\s*true/s);
 assert.match(route,/clientRoutes\.use/);
 assert.match(route,/requireManager\(req\)/);
 assert.match(manager,/\/manager-api\/clients[\s\S]*?\/api\/clients/);
});

test("le rendez-vous convertit sa date civile au format DateTime attendu par Prisma",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const route=fs.readFileSync(path.join(__dirname,"../backend/src/routes/appointment.routes.ts"),"utf8");
 assert.match(route,/preferredDate:\s*new Date\(`\$\{data\.preferredDate\}T00:00:00\.000Z`\)/);
});

test("Nicia : recommande des destinations selon l’expérience saisie",async()=>{
 const { recommendDestinations }=await import("../site/src/support/destination-recommendations.js");
 assert.deepEqual(recommendDestinations("expérience créative").map(({name})=>name),["Nantes"]);
 assert.deepEqual(recommendDestinations("partir en randonnée").map(({name})=>name),["Lyon","Pérou"]);
 assert.deepEqual(recommendDestinations("", "cuisine gourmande").map(({name})=>name),["Lille","Barcelone","Grèce"]);
 assert.deepEqual(recommendDestinations("xyz sans thème connu"),[]);
});

test("Nicia : collecte conversationnelle et confidentialité discrète FR/EN",()=>{
 const source=require("node:fs").readFileSync(require("node:path").join(__dirname,"../site/src/pages/Assistant.jsx"),"utf8");
 assert.doesNotMatch(source,/setCalendar|setNom|Préciser des dates|Add precise dates|Comment Nicia doit-elle vous appeler|What should Nicia call you/);
 assert.match(source,/<details className="nicia-privacy"><summary>\{en\?"Privacy":"Confidentialité"\}/);
 const prompt=require("./ai-context").instructionSysteme({voyage:{},nicia:{profil:{etat:"refuse",nomUsage:null}}},{nicia:true,langue:"fr"});
 assert.match(prompt,/accepte explicitement son refus/);assert.match(prompt,/dates de début et de fin ou une période approximative/);assert.match(prompt,/Ne redemande jamais une information déjà présente/);
});
