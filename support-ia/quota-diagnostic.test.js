const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
process.env.SUPPORT_DIAGNOSTICS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "detour-private-diagnostic-"));
const { lireErreurFournisseur } = require("./gemini-http");
const { tracer } = require("./diagnostic");
const { retrouver, dossier, MAXIMUM } = require("./diagnostic-stockage");
const { consulterQuota, analyser } = require("./openrouter-local-diagnostic");
const ref = "eed98e97-01b6-4b93-a861-8cefb1d9e618";
test("429 : secondes, dates HTTP, quotas, métadonnées autorisées et secrets expurgés", async () => {
  const d = await lireErreurFournisseur(Response.json({ error: { code: 429, message: "Rate limit exceeded: free-models-per-day. cle-secrete client@example.invalid", metadata: { raw: "conversation-privee", provider_name: "client@example.invalid", resets_at: "2026-10-22T00:00:00Z", scope: "api_key", limit_source: "openrouter_key_limit", error_type: "rate_limit_exceeded", spend_usd: 5, limit_usd: 4 } } }, { status: 429, headers: { "Retry-After": "120", "X-RateLimit-Limit": "50", "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1792627200000", "X-Secret": "cle-secrete" } }));
  assert.equal(d.categorieFournisseur, "ACCOUNT_DAILY_QUOTA");
  assert.equal(d.reessaiApresSecondes, 120);
  assert.equal(d.quotaRestant, 0);
  assert.equal(d.quotaReset, 1792627200000);
  assert.equal(d.reinitialisationDate, "2026-10-22T00:00:00.000Z");
  assert.equal(d.sourceLimite, "openrouter_key_limit");
  assert.doesNotMatch(JSON.stringify(d), /cle-secrete|client@example|conversation-privee/);
  const date = await lireErreurFournisseur(new Response("{}", { status: 429, headers: { "Retry-After": "Thu, 22 Oct 2026 00:00:00 GMT" } }));
  assert.equal(date.reessaiApresDate, "2026-10-22T00:00:00.000Z");
  const inconnu = await lireErreurFournisseur(Response.json({ error: { message: "cle-secrete" } }, { status: 429, headers: { "Retry-After": "secret", "X-RateLimit-Limit": "secret", "X-RateLimit-Reset": "secret" } }));
  assert.equal(inconnu.categorieFournisseur, "HTTP_429_UNSPECIFIED");
  assert.equal(inconnu.quotaLimite, undefined);
  assert.doesNotMatch(JSON.stringify(inconnu), /cle-secrete|"secret"/);
  for (const [message,categorie] of [["temporarily rate-limited upstream", "PROVIDER_RATE_LIMIT"], ["requests per minute exceeded", "TEMPORARY_RATE_LIMIT"]]) {
    const v=await lireErreurFournisseur(Response.json({error:{code:429,message}}, {status:429}));
    assert.equal(v.categorieFournisseur,categorie);
  }
  const info = console.info; console.info = () => {};
  try { tracer(ref, Date.now(), "echec", { ...d, fournisseur: "openrouter", secret: "cle-secrete", messageExpurge: "conversation-privee" }); }
  finally { console.info = info; }
  const log = retrouver(ref)[0];
  assert.equal(log.reessaiApresSecondes,120);
  assert.match(log.messageExpurge,/quotidienne/);
  assert.doesNotMatch(JSON.stringify(log), /cle-secrete|conversation-privee/);
});
test("journal privé borné, référence retrouvée après redémarrage, panne non bloquante", () => {
  const enfant = spawnSync(process.execPath, [path.join(__dirname,"openrouter-local-diagnostic.js"),"--reference",ref], {env:process.env,encoding:"utf8"});
  assert.equal(enfant.status,0);
  assert.equal(JSON.parse(enfant.stdout).trouve,true);
  const info=console.info, err=console.error; console.info=()=>{}; console.error=()=>{};
  try {
    // Remplir le journal technique, jamais un dossier de préparations.
    for(let i=0;i<2600;i++) tracer(ref,Date.now(),"echec",{fournisseur:"openrouter",categorieFournisseur:"HTTP_429_UNSPECIFIED"});
    for(const f of fs.readdirSync(dossier())) assert.ok(fs.statSync(path.join(dossier(),f)).size <= MAXIMUM);
    assert.ok(fs.readdirSync(dossier()).length <= 2);
    assert.ok(retrouver(ref).length>0);
    const avant=process.env.SUPPORT_DIAGNOSTICS_DIR;
    const bloque=path.join(avant,"fichier-bloquant");fs.writeFileSync(bloque,"");
    process.env.SUPPORT_DIAGNOSTICS_DIR=bloque;
    try { assert.doesNotThrow(()=>tracer(ref,Date.now(),"echec",{})); } finally { process.env.SUPPORT_DIAGNOSTICS_DIR=avant; }
  } finally { console.info=info;console.error=err; }
});
test("quota compte : un seul GET, aucun secret sorti, distinction quotidien/fournisseur prudente", async () => {
  let n=0;
  const resultat=await consulterQuota({cle:"cle-secrete",fetcher:async(url,o)=>{
    n++;assert.equal(url,"https://openrouter.ai/api/v1/key");assert.equal(o.method,"GET");assert.equal(o.headers.Authorization,"Bearer cle-secrete");assert.equal(o.body,undefined);
    return Response.json({data:{label:"client@example.invalid",hash:"cle-secrete",is_free_tier:true,free_model_daily_requests:{used:50,limit:50,remaining:0},limit_remaining:null,effective_budget:{remaining_usd:0,resets_at:"2026-10-22T00:00:00Z",reset_interval:"daily",budget_id:"secret"}}});
  }});
  assert.equal(n,1);assert.equal(resultat.generations,0);
  assert.equal(resultat.analyse.constat,"QUOTA_QUOTIDIEN_GRATUIT_EPUISE_ACTUELLEMENT");
  assert.doesNotMatch(JSON.stringify(resultat),/cle-secrete|client@example|budget_id/);
  assert.equal(analyser({requetesGratuitesDuJour:{restantes:4}}).constat,"QUOTA_QUOTIDIEN_NON_EPUISE_ACTUELLEMENT");
  assert.equal(analyser({}).constat,"QUOTA_QUOTIDIEN_NON_FOURNI_PAR_API");
  assert.equal(analyser({requetesGratuitesDuJour:{restantes:0}},new Date("2026-10-21T12:00:00Z")).prochaineJourneeUTC,"2026-10-22T00:00:00.000Z");
  const refus=await consulterQuota({cle:"cle-secrete",fetcher:async()=>Response.json({error:{message:"cle-secrete client@example.invalid",code:401}},{status:401})});
  assert.equal(refus.statutHTTP,401);assert.doesNotMatch(JSON.stringify(refus),/cle-secrete|client@example/);
  const panne=await consulterQuota({cle:"cle-secrete",fetcher:async()=>{throw Error("cle-secrete");}});
  assert.equal(panne.erreur,"LECTURE_QUOTA_IMPOSSIBLE");
  assert.equal((await consulterQuota({cle:"",fetcher:()=>{throw Error("Aucun appel attendu");}})).erreur,"OPENROUTER_API_KEY_ABSENTE");
});
