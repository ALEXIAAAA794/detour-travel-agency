import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { assistantTitle } from "../support/identity.js";
import { useSupport } from "../support/SupportContext.jsx";
export default function PreferencesConfirmation() {
  const s = useSupport(), [proof, setProof] = useState(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0), heading = useRef(null);
  const en = s.language === "en";
  useEffect(() => {
    const previous = document.title; document.title = assistantTitle(s.language) + " | DÉTOUR";
    return () => { document.title = previous; };
  }, [s.language]);
  useEffect(() => {
    let active = true; setProof(null); setError("");
    s.verifyPreferencesTransmission().then(p=>{if(active)setProof(p);}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  }, [attempt]);
  useEffect(()=>{if(proof || error) heading.current?.focus();},[proof,error]);
  return <main id="contenu" className="support-brand support-confirmation" lang={s.language}><section className="support-confirmation-card">
    <p>{assistantTitle(s.language)}</p>
    <label className="support-language">{en ? "Language" : "Langue"}<select value={s.language} onChange={e=>s.setLanguage(e.target.value)}><option value="fr">français</option><option value="en">English</option></select></label>
    {!proof && !error && <p role="status">{en ? "Checking your submission…" : "Vérification de votre transmission…"}</p>}
    <h1 ref={heading} tabIndex={-1}>{proof ? en ? "your preferences have been sent" : "vos préférences ont été envoyées" : error ? en ? "submission not verified" : "transmission non vérifiée" : en ? "one moment" : "un instant"}</h1>
    {proof ? <><p className="support-lead">{en ? "Your request has been sent to an adviser." : "Votre demande a bien été transmise à un conseiller."}</p><dl className="support-reference"><dt>{en ? "Reference" : "Référence"}</dt><dd>{proof.reference}</dd></dl><p className="support-secondary">{en ? "Only your preferences were sent. No booking is confirmed. Any programme has a separate approval process." : "Seules vos préférences ont été envoyées. Aucune réservation n’est confirmée. Le programme dispose d’un parcours de validation distinct."}</p></> : error && <><p role="alert">{error}</p><button onClick={()=>setAttempt(n=>n+1)}>{en ? "Try again" : "Réessayer"}</button></>}
    <div className="support-confirmation-actions"><Link className={proof ? "pill support-primary" : "pill"} to="/assistant">{en ? "view my preparation" : "consulter ma préparation"}</Link><Link className="pill ghost" to="/">{en ? "back to home" : "revenir à l’accueil"}</Link></div>
  </section></main>;
}
