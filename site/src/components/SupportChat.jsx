import { Link } from "react-router-dom";
import { useSupport } from "../support/SupportContext.jsx";
import { assistantTitle } from "../support/identity.js";
export default function SupportChat(){
  const {language}=useSupport();
  const english=language==="en";
  return <aside className="support-chat support-brand" aria-label={assistantTitle(language)}>
    <Link className="support-chat__launcher" to="/assistant" aria-label={english?"Chat with Nicia, AI assistant":"Parler avec Nicia, assistante IA"}>
      <span className="support-chat__avatar"><img src="/support-brand/detour-monogramme.svg" width="40" height="40" alt=""/></span>
      <span className="support-chat__label"><strong>Nicia</strong></span>
      <span className="support-chat__status" aria-hidden="true"/>
    </Link>
  </aside>;
}
