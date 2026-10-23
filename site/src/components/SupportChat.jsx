import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { assistantTitle, authorLabel } from "../support/identity.js";
import { Sources, useSupport } from "../support/SupportContext.jsx";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { language, messages, pending, error, ask, retry } = useSupport();
  const conversationRef = useRef(null), inputRef = useRef(null), launcherRef = useRef(null), wasOpen = useRef(false);
  useEffect(() => {
    if(open) inputRef.current?.focus();
    else if(wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  async function envoyerMessage(event) {
    event.preventDefault();
    const contenu = message.trim();

    if (!contenu || pending) return;

    setMessage("");
    await ask(contenu);
  }

  return (
    <aside className="support-chat support-brand" aria-label={assistantTitle(language)}>
      <section
        className="support-chat__panel"
        id="support-chat-panel"
        aria-label={language === "en" ? "Conversation with Nicia" : "Conversation avec Nicia"}
        hidden={!open}
        onKeyDown={e=>{if(e.key === "Escape") setOpen(false);}}
      >
          <header className="support-chat__header">
            <div>
              <strong>{assistantTitle(language)}</strong>
              <span>{language === "en" ? "You are speaking with AI" : "Vous parlez à une IA"}</span>
            </div>
            <button
              className="support-chat__close"
              type="button"
              aria-label={language === "en" ? "Close Nicia" : "Fermer Nicia"}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div
            className="support-chat__messages"
            aria-live="polite"
            aria-relevant="additions"
            ref={conversationRef}
          >
            {messages.map((item, index) => (
              <p
                className={`support-chat__message support-chat__message--${item.role}`}
                key={`${index}-${item.role}`}
              >
                <b>{authorLabel(item.role, language)} : </b>{item.content}
                <Sources sources={item.sources} />
              </p>
            ))}
            {pending && (
              <p className="support-chat__typing" role="status">
                {language === "en" ? "Nicia is preparing a reply…" : "Nicia prépare sa réponse…"}
              </p>
            )}
          </div>

          {error && <div><p role="alert">{error}</p><button type="button" disabled={pending} onClick={retry}>Réessayer</button></div>}
          <Link className="support-chat__contact" to="/assistant">Personnaliser mon voyage et gérer mon programme</Link>
          <form className="support-chat__form" onSubmit={envoyerMessage}>
            <label className="support-chat__sr-only" htmlFor="support-chat-message">
              Votre message
            </label>
            <input
              id="support-chat-message"
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Écrivez votre message…"
              maxLength={2000}
              disabled={pending}
              required
            />
            <button type="submit" disabled={pending || !message.trim()}>
              Envoyer
            </button>
          </form>
          <a className="support-chat__contact" href="/contact">
            Contacter un conseiller
          </a>
      </section>

      <button
        className="support-chat__launcher"
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-controls="support-chat-panel"
        aria-label={open ? language === "en" ? "Close Nicia" : "Fermer Nicia" : assistantTitle(language)}
        onClick={() => setOpen((etat) => !etat)}
      >
        <img src="/support-brand/detour-monogramme.svg" width="32" height="32" alt="" />{open ? language === "en" ? "close Nicia" : "fermer Nicia" : language === "en" ? "ask Nicia" : "parler à Nicia"}
      </button>
    </aside>
  );
}
