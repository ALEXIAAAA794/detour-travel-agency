import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sources, useSupport } from "../support/SupportContext.jsx";
import { assistantTitle, authorLabel } from "../support/identity.js";
import { problemesDates } from "../support/dates.js";
import "../styles/nicia.css";
const ideas=[
 ["imaginer","Imaginer mon voyage","Imagine my trip"],
 ["destination","Trouver une destination","Find a destination"],
 ["weekend","Partir le temps d’un week-end","Get away for a weekend"],
 ["famille","Voyager en famille","Travel as a family"],
 ["detour","Une question sur DÉTOUR","A question about DÉTOUR"]
];
const fields=[
 ["destination","Destination","Destination"],["villeDepart","Ville de départ","Departure city"],["dates","Période ou dates flexibles","Approximate period or flexible dates"],
 ["participants","Voyageurs","Travellers"],["budget","Votre budget souhaité","Your desired budget"],["devise","Devise (EUR, USD…)","Currency (EUR, USD…)"],
 ["activites","Activités","Activities"],["experience","Expérience recherchée","Experience"],["rythme","Rythme","Pace"],["contraintes","Contraintes (aucune possible)","Constraints (none is accepted)"]
];
export default function Assistant(){
 const s=useSupport(),en=s.language==="en",[message,setMessage]=useState(""),[config,setConfig]=useState(null),[configError,setConfigError]=useState(false),[notice,setNotice]=useState("");
 const log=useRef(null),input=useRef(null),errorFocus=useRef(null),needFocus=useRef(false);
 const userError=s.niciaError;
 useLayoutEffect(()=>{const el=input.current;if(!el)return;const resize=()=>{el.style.height="auto";const height=Math.min(160,Math.max(48,el.scrollHeight));el.style.height=height+"px";el.style.overflowY=el.scrollHeight>160?"auto":"hidden";};resize();window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);},[message,s.pending]);
 const n=s.preparation?.nicia,hasWishes=Object.values(s.draft).some(v=>v!==""&&v!==undefined);
 const ready=Boolean(s.draft.destination?.trim()&&s.draft.villeDepart?.trim()&&Number.isSafeInteger(s.draft.participants)&&s.draft.participants>0&&(s.draft.dates?.trim()||s.draft.dateDepart&&s.draft.dateRetour)&&!n?.tourEnAttente);
 useEffect(()=>{const old=document.title;document.title=assistantTitle(s.language)+" | DÉTOUR";return()=>{document.title=old;};},[s.language]);
 useEffect(()=>{let active=true;s.niciaConfig().then(c=>{if(active)setConfig(c);}).catch(()=>{if(active)setConfigError(true);});return()=>{active=false;};},[]);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[s.messages]);
 useEffect(()=>{if(userError)errorFocus.current?.focus();},[userError]);
 useEffect(()=>{if(!s.pending&&needFocus.current){if(!userError)input.current?.focus();needFocus.current=false;}},[s.pending,userError]);
 async function send(e){e.preventDefault();if(!message.trim()||s.pending)return;const text=message.trim();needFocus.current=true;setMessage("");if(!await s.converse({message:text})&&!s.lastMessageRecorded())setMessage(text);}
 async function saveWishes(e){e.preventDefault();setNotice("");const errors=problemesDates(s.draft);if(errors.length){setNotice(errors.join(" "));return;}
  const allowed=[...fields.map(f=>f[0]),"dateDepart","dateRetour","baseBudget"];
  const v=Object.fromEntries(Object.entries(s.draft).filter(([k,v])=>allowed.includes(k)&&!(k==="participants"&&v==="")&&!(k==="devise"&&v==="")&&!(k==="baseBudget"&&v==="")));
  if(await s.saveWishes(v))setNotice(en?"Your wishes have been saved. Nothing has been sent.":"Vos envies sont enregistrées. Aucun envoi n’a été effectué.");
 }
 async function handoff(){const ack=await s.handoff();if(ack)window.location.assign(ack.chemin);}
 return <main id="contenu" className="nicia-main" lang={s.language}>
  <section className="nicia-intro"><p>{assistantTitle(s.language)}</p><h1>{en?"let’s talk about your trip":"parlez de votre projet"}</h1><p>{en?"Tell us what you love. Nicia helps you imagine a trip, at your own pace.":"Parlons de vos envies. Nicia vous aide à imaginer un voyage, à votre rythme."}</p></section>
  <section className="nicia-conversation" aria-label={en?"Plan a trip with Nicia":"Préparer un voyage avec Nicia"}>
   <div className="nicia-start"><h2>{en?"an idea, a starting point":"une envie, un point de départ"}</h2><p>{en?"Choose an idea or simply write to Nicia.":"Choisissez une idée ou écrivez simplement à Nicia."}</p>
   <div className="nicia-suggestions">{ideas.map(([id,fr,eng])=><button key={id} type="button" disabled={s.pending} onClick={()=>s.converse({suggestion:id},en?eng:fr)}>{en?eng:fr}</button>)}</div></div>
   <div className="nicia-messages" ref={log} role="log" aria-live="polite" aria-relevant="additions" aria-label={en?"Conversation with Nicia":"Conversation avec Nicia"}>{s.messages.map((m,i)=><article className={m.role==="user"?"nicia-message user":"nicia-message"} key={i}><p className="nicia-author">{authorLabel(m.role,s.language)}{m.role!=="user"&&(en?" · AI":" · IA")}</p><div>{m.role==="user"?m.content:m.content.replace(/(?:Lien Contact\s*:|Contact page\s*:)?\s*\/contact\b/gi,en?" Contact":" Contact")}<Sources sources={m.sources} clean language={s.language}/></div></article>)}</div>
   {s.pending&&<p role="status">{en?"Nicia is preparing a reply…":"Nicia prépare sa réponse…"}</p>}
   {userError&&<div className="nicia-error" tabIndex={-1} ref={errorFocus}><p role="alert">{userError}</p><p>{s.lastMessageRecorded()?(en?"Your message is already saved in the conversation. Try again will use that same message.":"Votre message est déjà enregistré dans la conversation. Réessayer reprend ce même message."):(en?"Your message has not been confirmed as saved. Its text is kept below; Try again reuses the same message.":"L’enregistrement de votre message n’est pas confirmé. Son texte est conservé ci-dessous ; Réessayer reprend le même message.")}</p><button type="button" disabled={s.pending} onClick={async()=>{if(await s.retry())setMessage("");}}>{en?"Try again":"Réessayer"}</button></div>}
   {!userError&&n?.tourEnAttente&&<div className="nicia-error"><p>{en?"Your last message is saved and awaiting a reply.":"Votre dernier message est enregistré, en attente d’une réponse."}</p><button disabled={s.pending} onClick={s.resumeNicia}>{en?"Retry this message":"Réessayer ce message"}</button></div>}
   <form className="nicia-composer" onSubmit={send}><label className="support-chat__sr-only" htmlFor="nicia-message">{en?"Your message to Nicia":"Votre message à Nicia"}</label><textarea ref={input} id="nicia-message" value={message} onChange={e=>setMessage(e.target.value)} rows={1} maxLength={2000} required disabled={s.pending} placeholder={en?"Tell us about your travel idea…":"Racontez votre envie de voyage…"}/><button type="submit" disabled={s.pending||!message.trim()}>{en?"Send":"Envoyer"}<span aria-hidden="true"> →</span></button></form>
   <p className="nicia-disclaimer">{en?"Ideas to explore. An adviser checks prices and availability before preparing the commercial offer.":"Une suggestion à explorer. Un conseiller vérifie les prix et les disponibilités avant de composer l’offre commerciale."} <Link to="/contact">{en?"Contact an adviser":"Contacter un conseiller"}</Link></p>
   <details className="nicia-privacy"><summary>{en?"Privacy":"Confidentialité"}</summary><p>{en?"Your exchanges are saved with your preparation. Adviser access requires a linked pre-booking and authorised access. The retention period has yet to be defined.":"Vos échanges sont enregistrés avec votre préparation. Leur consultation par un conseiller nécessite une préréservation rattachée et un accès autorisé. La durée de conservation reste à définir."}</p></details>
  </section>
  {hasWishes&&<section className="nicia-summary"><h2>{en?"your wishes, taking shape":"vos envies prennent forme"}</h2><dl>{[...fields,["dateDepart","Départ","Departure"],["dateRetour","Retour","Return"],["baseBudget","Budget exprimé pour","Budget basis"]].filter(([k])=>s.draft[k]!==undefined&&s.draft[k]!=="").map(([k,fr,eng])=><div key={k}><dt>{k==="dates"&&(s.draft.dateDepart||s.draft.dateRetour)?en?"Previously mentioned period":"Période initialement évoquée":en?eng:fr}</dt><dd>{k==="baseBudget"?s.draft[k]==="total"?(en?"all travellers":"tous les voyageurs"):s.draft[k]==="personne"?(en?"each traveller":"chaque voyageur"):(en?"to clarify":"à préciser"):s.draft[k]}</dd></div>)}</dl>
   {n?.pointsForts?.length>0&&<><h3>{en?"what matters to you":"vos points forts"}</h3><ul>{n.pointsForts.map((v,i)=><li key={i}>{v}</li>)}</ul></>}
   <p>{en?"Your budget is a preference, not a price or an AI estimate. These ideas must be checked by an adviser.":"Votre budget est un souhait, pas un prix ni une estimation IA. Ces pistes restent à valider par un conseiller."}</p>
   <details><summary>{en?"Edit my wishes":"Modifier mes envies"}</summary><form className="nicia-edit" onSubmit={saveWishes}><fieldset disabled={s.pending}>{fields.map(([k,fr,eng])=><label key={k}>{en?eng:fr}<input type={k==="participants"?"number":"text"} min={k==="participants"?1:undefined} step={k==="participants"?1:undefined} maxLength={k==="budget"?300:2000} value={s.draft[k]??""} onChange={e=>{const v=e.target.value;s.setDraft(d=>({...d,[k]:k==="participants"&&v!==""?Number(v):v}));}}/></label>)}<label>{en?"Budget basis":"Base du budget"}<select value={s.draft.baseBudget||"a_preciser"} onChange={e=>s.setDraft(d=>({...d,baseBudget:e.target.value}))}><option value="a_preciser">{en?"To clarify":"À préciser"}</option><option value="total">{en?"Total":"Total"}</option><option value="personne">{en?"Per person":"Par personne"}</option></select></label><button>{en?"Save my wishes":"Enregistrer mes envies"}</button></fieldset></form></details>
  </section>}
  {notice&&<p className="nicia-notice" role="status">{notice}</p>}
  <section className="nicia-handoff"><h2>{en?"the next step":"la prochaine étape"}</h2><button type="button" disabled={s.pending||!config?.prereservation?.disponible||!ready} onClick={handoff} aria-describedby={config?.prereservation?.disponible||configError?"nicia-handoff-status":undefined}>{en?"Pre-book this trip":"Pré-réserver ce voyage"}</button>{(config?.prereservation?.disponible||configError)&&<p id="nicia-handoff-status">{config?.prereservation?.disponible&&!ready?(en?"Please specify destination, departure city, period and travellers before continuing.":"Précisez destination, ville de départ, période et voyageurs avant de continuer."):config?.prereservation?.disponible?(en?"Continue to the dedicated form. This does not confirm a booking.":"Continuez vers le formulaire dédié. Cela ne confirme aucune réservation."):configError?(en?"The next step could not be checked. Your wishes are kept; Contact remains available.":"La prochaine étape n’a pas pu être vérifiée. Vos envies sont conservées ; Contact reste disponible."):null}</p>}<Link to="/contact">{en?"Contact an adviser":"Contacter un conseiller"}</Link></section>
  <details className="nicia-legacy"><summary>{en?"Previous preparation pathway":"Parcours de préparation précédent"}</summary><p>{en?"Your older preparations and programmes are kept. This separate pathway has its own explicit transmission actions.":"Vos préparations et programmes antérieurs sont conservés. Ce parcours distinct garde ses propres actions explicites de transmission."}</p><Link to="/assistant/classique">{en?"Open previous pathway":"Ouvrir le parcours précédent"}</Link></details>
 </main>;
}
