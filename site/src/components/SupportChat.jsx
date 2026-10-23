import { Link } from "react-router-dom";
import { useSupport } from "../support/SupportContext.jsx";
import { assistantTitle } from "../support/identity.js";
export default function SupportChat(){const {language}=useSupport();return <aside className="support-chat support-brand" aria-label={assistantTitle(language)}><Link className="support-chat__launcher" to="/assistant" aria-label={assistantTitle(language)}><img src="/support-brand/detour-monogramme.svg" width="32" height="32" alt=""/>{language==="en"?"talk to Nicia":"parler à Nicia"}</Link></aside>;}
