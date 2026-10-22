import { useEffect, useRef, useState } from "react";
import { problemesDates, dureeJours } from "../support/dates.js";
import { Link, useNavigate } from "react-router-dom";
import { assistantTitle, authorLabel } from "../support/identity.js";
import { Sources, useSupport } from "../support/SupportContext.jsx";
const fields = [["destination", "Destination", "Où aimeriez-vous aller ?"], ["dateDepart", "Date de départ / Departure date", ""], ["dateRetour", "Date de retour / Return date", ""], ["participants", "Voyageurs", "Combien de voyageurs ?"], ["budget", "Budget", "Budget total ou par personne, avec devise ; à définir possible."], ["activites", "Activités", "Quelles activités souhaitez-vous ?"], ["experience", "Expérience recherchée", "Culture, détente, aventure…"], ["rythme", "Rythme", "Tranquille, équilibré, soutenu, ou aucune préférence."], ["contraintes", "Contraintes particulières", "Précisez vos contraintes ou répondez : aucune."]];
function Programme({ record, obsolete }) {
  const p = record.contenu;
  return <section className="form-card support-programme"><h2>{p.titre}</h2><p>Version {record.version} · Suggestions et estimation indicatives. Disponibilités et prix non vérifiés. Aucune réservation confirmée.</p>{obsolete && <p role="alert">Les préférences ont changé : programme obsolète, à régénérer.</p>}<p>{p.resume}</p>
    {p.itineraire.map(j => <section key={j.jour}><h3>jour {j.jour} — {j.titre}</h3>{j.etapes.map((e,i) => <div key={i}><h4>{e.lieu}</h4><ul>{e.activites.map((a,k) => <li key={k}>{a}</li>)}</ul></div>)}</section>)}
    <h3>budget total indicatif</h3><p>{p.statut === "precisions" ? "Précisions nécessaires avant estimation." : `${p.budget.minimum} – ${p.budget.maximum} ${p.budget.devise}`}</p>
    {[["transports suggérés", p.transports], ["hébergements suggérés", p.hebergements], ["hypothèses", p.budget.hypotheses], ["informations manquantes", p.informationsManquantes], ["incohérences et points à vérifier", p.pointsAVerifier]].map(([titre,liste]) => <section key={titre}><h3>{titre}</h3><ul>{liste.map((v,i) => <li key={i}>{v}</li>)}</ul></section>)}
  </section>;
}
export default function Assistant() {
  const s = useSupport();
  const navigate = useNavigate();
  useEffect(() => {
    const previous = document.title; document.title = assistantTitle(s.language) + " | DÉTOUR";
    return () => { document.title = previous; };
  }, [s.language]);
  const errorFocus = useRef(null);
  useEffect(() => { if(s.error) errorFocus.current?.focus(); }, [s.error]);
  const [guided, setGuided] = useState(true), [change, setChange] = useState(""), [question, setQuestion] = useState("");
  const [client, setClient] = useState({ nom: "", email: "" }), [consent, setConsent] = useState(null), [status, setStatus] = useState("");
  const request = useRef({ signature: "", id: "" });
  const index = fields.findIndex(([k]) => s.draft[k] === undefined || s.draft[k] === "");
  const savedIndex = fields.findIndex(([k]) => s.preparation?.voyage[k] === undefined || s.preparation?.voyage[k] === "");
  const active = guided && savedIndex >= 0 ? savedIndex : null;
  const dateErrors = problemesDates(s.draft);
  const datesComplete = problemesDates(s.draft, true).length === 0;
  const programme = s.preparation?.programme;
  const consentKey = s.preparation?.id + ":" + programme?.version + ":" + JSON.stringify(s.draft);
  const obsolete = s.preparation?.programmeObsolete || (programme && JSON.stringify(s.draft) !== JSON.stringify(s.preparation.voyage));
  async function result(action, message) { setStatus(""); const r = await action(); if(r) setStatus(message(r)); return r; }
  function field([key,label,hint]) {
    const update = e => { const v=e.target.value; s.setDraft(d => ({ ...d, [key]: key === "participants" && v !== "" ? Number(v) : v })); setConsent(null); };
    return <label className="f" key={key}>{label}<input required maxLength={2000} type={key.startsWith("date") ? "date" : key === "participants" ? "number" : "text"} min={key === "participants" ? 1 : key === "dateRetour" ? s.draft.dateDepart || undefined : undefined} step={key === "participants" ? 1 : undefined} value={s.draft[key] ?? ""} onChange={update} onInput={key.startsWith("date") ? update : undefined} /><small>{hint}</small></label>;
  }

  async function transmit(e) { e.preventDefault(); await result(() => s.transmit(client, consent === consentKey), r => `Version ${r.versionAcceptee} validée et rattachée à la demande ${r.reference}. Aucune réservation ni validation commerciale. ${["EN_ATTENTE","EN_COURS"].includes(r.email?.statut) ? "Accusé de réception en préparation." : r.email?.statut === "ACCEPTE_SMTP" ? "Accusé accepté par le service email." : "Envoi de l’accusé non confirmé ; transmission enregistrée."}`); }
  return <main id="contenu" className="support-brand support-assistant"><section className="page-head"><div className="wrap"><p><Link to="/">Accueil</Link> / Préparer mon voyage</p><p className="support-eyebrow">DÉTOUR · support IA</p><h1>{assistantTitle(s.language)}</h1><label>Langue / Language <select value={s.language} onChange={e=>s.setLanguage(e.target.value)}><option value="fr">français</option><option value="en">English</option></select></label><p>{s.language === "en" ? "You are speaking with Nicia, an AI assistant." : "Vous parlez à Nicia, une IA."}</p><p>Préférences, programme indicatif et accord client. La réservation et la validation commerciale restent distinctes.</p></div></section>
    <div className="wrap support-workspace">{s.error && <div ref={errorFocus} tabIndex={-1}><p role="alert">{s.error}</p><button className="pill" type="button" disabled={s.pending} onClick={s.retry}>Réessayer</button><Link to="/contact">Contacter un conseiller</Link></div>}<p role="status">{s.pending ? s.language === "en" ? "Nicia is processing your request…" : "Nicia traite votre demande…" : status}</p>
      <button className="pill ghost" disabled={s.pending} onClick={async () => { if(await s.start()) { setGuided(true); setConsent(null); setStatus(""); } }}>Recommencer une préparation</button>
      <form className="form-card" onSubmit={async e => { e.preventDefault(); if(dateErrors.length) {setStatus(dateErrors.join(" "));return;} await result(s.save, () => "Préférences enregistrées."); }}><fieldset disabled={s.pending}><legend>{active !== null ? `question ${active+1} sur ${fields.length}` : "récapitulatif modifiable"}</legend><div className="f-grid">{active !== null ? field(fields[active]) : fields.map(field)}</div><button className="pill ghost" type="button" onClick={() => { if(dateErrors.length) {setStatus(dateErrors.join(" "));return;} result(s.save, () => "Brouillon enregistré / Draft saved."); }}>Enregistrer le brouillon / Save draft</button><button className="pill" type="submit">{active !== null ? "Enregistrer et continuer" : "Enregistrer les préférences"}</button></fieldset></form>
      {s.draft.dates && <p>Ancienne saisie conservée / Previous dates: {s.draft.dates}. Précisez les deux dates avant de générer / Enter both dates before generating.</p>}
      {dateErrors.length > 0 && <p role="alert">{dateErrors.join(" ")}</p>}
      {datesComplete && <p>Durée / Duration : {dureeJours(s.draft)} jour(s) / day(s), départ et retour inclus / including departure and return.</p>}
      {index === -1 && datesComplete && <button className="pill" disabled={s.pending} onClick={() => result(s.generate, r => `Programme indicatif enregistré, version ${r.programme.version}. Aucun envoi au conseiller.`)}>Générer mon programme</button>}
      {programme && <><Programme record={programme} obsolete={obsolete}/><form className="form-card" onSubmit={async e => {e.preventDefault(); if(await result(() => s.modify(change.trim()), r => `Programme modifié, version ${r.programme.version}. Aucun envoi au conseiller.`)) {setChange("");setConsent(null);} }}><label>Changement souhaité<textarea value={change} onChange={e => setChange(e.target.value)} required maxLength={2000}/></label><button className="pill" disabled={s.pending || obsolete}>Demander cette modification du programme</button></form></>}
      {index === -1 && datesComplete && <form className="form-card" onSubmit={transmit}><fieldset disabled={s.pending}><legend>coordonnées et transmission</legend><label>Votre nom<input value={client.nom} onChange={e => setClient(c=>({...c,nom:e.target.value}))} required maxLength={120} autoComplete="name"/></label><label>Votre adresse email<input value={client.email} onChange={e => setClient(c=>({...c,email:e.target.value}))} required type="email" maxLength={254} autoComplete="email"/></label>
      {programme && <><label className="check"><input type="checkbox" checked={consent === consentKey} onChange={e => setConsent(e.target.checked ? consentKey : null)} required/><span>J’ai relu la version {programme.version} et j’accepte sa transmission au conseiller. Aucune réservation confirmée.</span></label><button className="pill" disabled={obsolete || programme.contenu.statut !== "proposition" || consent !== consentKey}>Valider ce programme et le transmettre au conseiller</button></>}
      <p>Vous pouvez aussi envoyer uniquement vos préférences ; cela ne transmet pas le programme.</p><button className="pill ghost" type="button" onClick={async e => { if(!client.nom.trim() || client.nom.trim().length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {setStatus("Vérifiez vos coordonnées avant l’envoi.");return;} const signature=JSON.stringify({client,voyage:s.draft}); if(request.current.signature!==signature) request.current={signature,id:crypto.randomUUID()}; await result(()=>s.sendPreferences(client,request.current.id,()=>navigate("/assistant/confirmation")), r=>`Préférences enregistrées, demande ${r.reference}.`); }}>Envoyer mes préférences au conseiller</button></fieldset></form>}
      <section className="form-card"><h2>{s.language === "en" ? "ask Nicia a question" : "poser une question à Nicia"}</h2><p>Les questions ne modifient pas le programme ; utilisez l’action dédiée pour cela.</p><div role="log" aria-label={s.language === "en" ? "Conversation with Nicia" : "Conversation avec Nicia"}>{s.messages.map((m,i)=><p key={i}><b>{authorLabel(m.role, s.language)} : </b>{m.content}<Sources sources={m.sources}/></p>)}</div><form onSubmit={async e=>{e.preventDefault();const q=question.trim();if(q){setQuestion("");await s.ask(q);}}}><label>Votre question<textarea value={question} onChange={e=>setQuestion(e.target.value)} required maxLength={2000}/></label><button className="pill" disabled={s.pending}>Envoyer la question</button></form></section>
    </div></main>;
}
