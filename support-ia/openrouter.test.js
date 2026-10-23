process.env.SUPPORT_AI_RATE_LIMIT = "1000";
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.AI_PROVIDER = 'openrouter';
process.env.OPENROUTER_API_KEY = 'cle-fictive-test';
process.env.OPENROUTER_MODEL = 'xingchen-agi/xing4.0-29b-a4b:free';
process.env.SUPPORT_PREPARATIONS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'detour-or-'));
process.env.SUPPORT_DEMANDES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'detour-or-demandes-'));
const emails = new Set();
require.cache[require.resolve('./emails')] = { exports: { planifierEmail: async (ref, type) => { emails.add(ref + type); return { statut: 'EN_ATTENTE' }; } } };
const { app } = require('./server');
const { interrogerIA } = require('./ai');
const contenu = { statut: 'proposition', titre: 'Lyon', resume: 'Indicatif', itineraire: [{ jour: 1, titre: 'Visite', etapes: [{ lieu: 'Centre', activites: ['Promenade'] }] }], transports: ['Train suggéré'], hebergements: ['Hôtel suggéré'], budget: { minimum: 300, maximum: 500, devise: 'EUR', hypotheses: ['2 personnes'] }, informationsManquantes: [], pointsAVerifier: ['Disponibilités inconnues'] };
test('OpenRouter simulé : contrat, erreurs, confidentialité, programme conservé et transmission', async () => {
  const natif = global.fetch;
  let mode = 'valide', corps, appels = 0, debut, finir;
  global.fetch = async (url, options) => {
    if (String(url).startsWith('http://127.0.0.1:')) return natif(url, options);
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer cle-fictive-test');
    appels++; corps = JSON.parse(options.body);
    if (mode === 'attente') { debut(); await new Promise(r => { finir = r; }); }
    if (mode === 'timeout') { const e = Error('secret-client'); e.name = 'TimeoutError'; throw e; }
    if (mode === 'panne') throw Error('secret-client');
    if (mode === 'endpoint') return Response.json({ error: { code: 404, message: 'No endpoints found that support the requested parameters. secret-client', metadata: { raw: 'secret-client' } } }, { status: 404 });
    if (mode.startsWith('http')) return new Response(JSON.stringify({ error: { code: Number(mode.slice(4)), message: 'secret-client' } }), { status: Number(mode.slice(4)) });
    if (mode === 'erreur200') return Response.json({ error: { code: 503, message: 'secret-client' } });
    if (mode === 'enveloppe') return new Response('{');
    if (mode === 'taille') return new Response('x'.repeat(512001));
    if (mode === 'vide') return Response.json({ choices: [] });
    return Response.json({ choices: [{ finish_reason: mode === 'tronquee' ? 'length' : 'stop', message: { content: mode === 'json' ? '{' : mode === 'schema' ? '{}' : corps.response_format ? JSON.stringify(contenu) : 'Réponse indicative' } }] });
  };
  const serveur = app.listen(0, '127.0.0.1');
  await new Promise(r => serveur.once('listening', r));
  const req = (route, method = 'POST', body, token) => fetch('http://127.0.0.1:' + serveur.address().port + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const logs = [], info = console.info;
  console.info = l => logs.push(l);
  try {
    assert.equal(await interrogerIA('Question', { historique: [{ role: 'user', content: 'Contexte antérieur' }, { role: 'model', content: 'Réponse antérieure' }] }), 'Réponse indicative');
    assert.equal(corps.messages[1].content, 'Contexte antérieur');
    assert.equal(corps.messages[2].role, 'assistant');
    assert.equal(corps.response_format, undefined);
    const p = await (await req('/api/support/preparations')).json();
    const route = '/api/support/preparations/' + p.id;
    const voyage = { destination: 'Lyon', dateDepart: "2027-05-10", dateRetour: "2027-05-10", participants: 2, budget: '500 EUR', activites: 'culture', experience: 'détente', rythme: 'calme', contraintes: 'aucune' };
    await req(route, 'PATCH', { voyage }, p.jeton);
    const generer = (v, token = p.jeton) => req(route + '/programme', 'POST', { versionAttendue: v, voyage: { destination: 'injection' } }, token);
    assert.equal((await generer(0, 'interdit')).status, 404);
    assert.equal((await generer(0)).status, 200);
    assert.equal(corps.response_format.type, 'json_schema');
    assert.equal(corps.response_format.json_schema.strict, true);
    assert.equal(corps.response_format.json_schema.schema.additionalProperties, false);
    assert.deepEqual(corps.provider, { require_parameters: true, allow_fallbacks: false, max_price: { prompt: 0, completion: 0, request: 0 } });
    assert.equal(corps.max_tokens, 8192);
    assert.match(corps.messages[0].content, /Lyon/);
    assert.doesNotMatch(JSON.stringify(corps), /cle-fictive|injection/);
    const fichier = path.join(process.env.SUPPORT_PREPARATIONS_DIR, p.id + '.json');
    const original = fs.readFileSync(fichier, 'utf8');
    for (const m of ['endpoint', 'json', 'schema', 'http401', 'http402', 'http429', 'http503', 'timeout', 'panne', 'tronquee', 'vide', 'enveloppe', 'taille', 'erreur200']) {
      mode = m;
      const r = await generer(1);
      assert.ok(r.status >= 400, m);
      const erreur = (await r.json()).error;
      assert.match(erreur.message, /OpenRouter/, m);
      if (m === 'endpoint') assert.match(erreur.message, /Aucun fournisseur disponible/);
      assert.equal(fs.readFileSync(fichier, 'utf8'), original, m);
    }
    mode = 'valide';
    const avant = appels;
    for (const model of ['openai/gpt-4', 'openrouter/auto', 'nvidia/model:free,paid/model']) {
      process.env.OPENROUTER_MODEL = model;
      await assert.rejects(interrogerIA('Question'), { code: 'AI_CONFIGURATION' });
    }
    process.env.OPENROUTER_MODEL = 'xingchen-agi/xing4.0-29b-a4b:free';
    delete process.env.OPENROUTER_API_KEY;
    await assert.rejects(interrogerIA('Question'), { code: 'AI_CONFIGURATION' });
    process.env.OPENROUTER_API_KEY = 'cle-fictive-test';
    process.env.AI_PROVIDER = 'autre';
    await assert.rejects(interrogerIA('Question'), { code: 'AI_CONFIGURATION' });
    process.env.AI_PROVIDER = 'openrouter';
    assert.equal(appels, avant);
    mode = 'attente';
    const commence = new Promise(r => { debut = r; });
    const enCours = generer(1);
    await commence;
    assert.equal((await generer(1)).status, 409);
    finir();
    assert.equal((await enCours).status, 200);
    assert.equal((await generer(1)).status, 409);
    mode = 'valide';
    assert.equal((await req(route + '/programme/modifications', 'POST', { versionAttendue: 2, modification: 'Alléger la journée' }, p.jeton)).status, 200);
    const lire = await (await req(route, 'GET', null, p.jeton)).json();
    assert.equal(lire.programme.version, 3);
    assert.deepEqual(lire.programme.contenu, contenu);
    const acceptation = { versionAcceptee: 3, accord: true, client: { nom: 'Test', email: 'test@example.invalid' } };
    const a = await req(route + '/programme/transmission', 'POST', acceptation, p.jeton);
    assert.equal(a.status, 200);
    const n = emails.size;
    assert.equal((await req(route + '/programme/transmission', 'POST', acceptation, p.jeton)).status, 200);
    assert.equal(emails.size, n);
    assert.doesNotMatch(logs.join('\n'), /cle-fictive|secret-client|example.invalid|Lyon|Bearer/);
    assert.match(logs.join('\n'), /openrouter/);
    assert.match(logs.join('\n'), /NO_COMPATIBLE_ENDPOINT/);
    assert.match(logs.join('\n'), /json_schema/);
    assert.match(logs.join('\n'), /xingchen-agi\/xing4.0-29b-a4b:free/);
  } finally { console.info = info; global.fetch = natif; await new Promise(r => serveur.close(r)); }
});


test('OpenRouter : timeout après HTTP 200 mesuré jusqu’à la lecture du corps',async()=>{
 const originalFetch=global.fetch,now=Date.now;let clock=1000;
 Date.now=()=>clock;
 global.fetch=async()=>{clock=1200;return {ok:true,status:200,body:{getReader:()=>({read:async()=>{clock=9300;const e=Error('texte privé non journalisé');e.name='TimeoutError';throw e;},releaseLock:()=>{},cancel:async()=>{}})}};};
 try{await assert.rejects(interrogerIA('Données fictives',null,{nicia:true,langue:'fr'}),e=>e.code==='AI_TIMEOUT'&&e.diagnostic.etape==='enveloppe_json'&&e.diagnostic.statutHTTP===200&&e.diagnostic.dureeAppelMs===8300);}
 finally{global.fetch=originalFetch;Date.now=now;}
});
test('Nicia : JSON dialogue mal formé distinct de la validation du schéma',()=>{
 const {extraire}=require('./nicia-preferences');
 assert.throws(()=>extraire('{',{}),e=>e.message==='INVALID_EXTRACTION'&&e.diagnostic.etape==='dialogue_json');
 assert.throws(()=>extraire('{}',{}),e=>e.message==='INVALID_EXTRACTION'&&e.diagnostic.etape==='schema');
});


test('OpenRouter Nicia : enveloppe HTTP distincte du JSON de dialogue',async()=>{
 const original=global.fetch;
 try{
  for(const [reply,code,etape] of [[()=>new Response('{'),"AI_RESPONSE_INVALID","enveloppe_json"],[()=>Response.json({choices:[]}),"AI_NO_CONTENT","extraction"],[()=>Response.json({choices:[{finish_reason:"stop",message:{content:{reponse:"texte"}}}]}),"AI_EMPTY","extraction"]]){
   global.fetch=async()=>reply();await assert.rejects(interrogerIA('Fictif',{historique:[]},{nicia:true,langue:'fr'}),e=>e.code===code&&e.diagnostic.etape===etape);
  }
 }finally{global.fetch=original;}
});


test('Nicia transport : JSON/SSE UTF-8 fragmenté, commentaires, usage et lecture unique',async()=>{
 const {lireReponse}=require('./openrouter-response');
 const content=JSON.stringify({reponse:"Quelle période préférez-vous ?",preferences:{destination:"Lyon"},pointsForts:[]});
 const event=d=>'data: '+JSON.stringify(d)+'\r\n\r\n';
 const stream=': OPENROUTER PROCESSING\r\n\r\n'+event({choices:[{index:0,delta:{reasoning:'raisonnement à ignorer'}}]})+event({choices:[{index:0,delta:{content:content.slice(0,15)}}]})+event({choices:[{index:0,delta:{content:content.slice(15)},finish_reason:'stop'}]})+event({choices:[{index:0,delta:{content:''},finish_reason:'stop'}],usage:{total_tokens:1}})+'data: [DONE]\r\n\r\n';
 const bytes=new TextEncoder().encode(stream);let consumed=0;
 const response=new Response(new ReadableStream({pull(c){if(consumed===bytes.length)return c.close();c.enqueue(bytes.slice(consumed,++consumed));}}),{headers:{'content-type':'text/event-stream; charset=utf-8'}});
 const reader=response.body.getReader.bind(response.body);let reads=0;response.body.getReader=()=>{reads++;return reader();};
 const result=await lireReponse(response);assert.equal(result.choices[0].message.content,content);assert.equal(reads,1);assert.doesNotMatch(JSON.stringify(result),/raisonnement/);
 assert.equal((await lireReponse(new Response(' \n'+JSON.stringify({choices:[{finish_reason:'stop',message:{content}}]})+' \n'))).choices[0].message.content,content);
});
test('Nicia transport : corps vide/espaces/JSON invalide et SSE tronqué refusés',async()=>{
 const {lireReponse}=require('./openrouter-response');
 for(const [body,ctype,code] of [['','application/json','EMPTY_BODY'],[' '.repeat(220),'application/json','WHITESPACE_BODY'],['{','application/json','INVALID_JSON_BODY'],[': OPENROUTER PROCESSING\n\n','text/event-stream','TRUNCATED_SSE'],['data: {\n\n','text/event-stream','INVALID_SSE_JSON'],['data: [DONE]\n\n','text/event-stream','MISSING_FINISH'],['data: {"choices":[{"delta":{"content":"{}"},"finish_reason":"stop"}]}\n\n','text/event-stream','TRUNCATED_SSE']]){
  await assert.rejects(lireReponse(new Response(body,{headers:{'content-type':ctype}})),e=>e.etatCorps===code);
 }
 await assert.rejects(lireReponse(new Response('x'.repeat(100)),{maximum:50}),e=>e.etatCorps==='RESPONSE_TOO_LARGE');
});
test('Nicia transport : erreur fournisseur HTTP 200 et flux interrompu',async()=>{
 const {lireReponse}=require('./openrouter-response');
 const e={code:429,message:'rate limited'};
 assert.deepEqual(await lireReponse(new Response('data: '+JSON.stringify({error:e})+'\n\n',{headers:{'content-type':'text/event-stream'}})),{error:e});
 await assert.rejects(lireReponse(new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));c.error(new TypeError('interruption simulée'));}}))),{name:'TypeError'});
});
test('Nicia transport : délai couvre un lecteur qui ne réagit pas au signal',async()=>{
 const {lireReponse}=require('./openrouter-response');let cancel=0,read=0;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(new DOMException('Test','TimeoutError')),15);
 try{await assert.rejects(lireReponse({body:{getReader:()=>({read:()=>{read++;return new Promise(()=>{});},cancel:async()=>{cancel++;},releaseLock:()=>{}})}},{signal:controller.signal}),{name:'TimeoutError'});assert.equal(read,1);assert.ok(cancel>=1);}finally{clearTimeout(timeout);}
});
