import { useState } from "react";
import { Link } from "react-router-dom";
import { useSupport } from "../support/SupportContext.jsx";
export function NiciaNavbar() {
 const {language,setLanguage}=useSupport(),en=language==="en",[open,setOpen]=useState(false);
 return <header className="nicia-navbar"><div className="nicia-chrome-wrap"><Link to="/" aria-label="DÉTOUR"><img src="/support-brand/detour-logo-negatif.svg" width="200" alt="DÉTOUR"/></Link><button type="button" className="nicia-menu" aria-expanded={open} aria-controls="nicia-navigation" onClick={()=>setOpen(!open)}>{en?"menu":"menu"}</button><nav id="nicia-navigation" className={open?"is-open":""} aria-label={en?"Main navigation":"Navigation principale"}><Link to="/">{en?"Home":"Accueil"}</Link><Link to="/destinations">{en?"Destinations":"Nos destinations"}</Link><Link to="/agence">{en?"The agency":"L’agence"}</Link><Link to="/contact">Contact</Link><button type="button" onClick={()=>setLanguage(en?"fr":"en")} aria-label={en?"Passer en français":"Switch to English"}>FR / EN</button></nav></div></header>;
}
export function NiciaFooter(){const {language}=useSupport(),en=language==="en";return <footer className="nicia-footer"><div className="nicia-chrome-wrap"><p>{en?"take a step sideways.":"prenez le pas de côté."}</p><nav aria-label={en?"Footer":"Pied de page"}><Link to="/agence">{en?"The agency":"L’agence"}</Link><Link to="/contact">Contact</Link><span>© DÉTOUR Voyages</span></nav></div></footer>;}
// Emplacements d’intégration pour les composants de l’accueil, sans refonte globale.
export default function NiciaShell({children,navbar,footer}) {const {language}=useSupport();return <div className="nicia-shell" lang={language}>{navbar||<NiciaNavbar/>}{children}{footer||<NiciaFooter/>}</div>;}
