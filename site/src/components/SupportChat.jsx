import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sources, useSupport } from "../support/SupportContext.jsx";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { messages, pending, error, ask, retry } = useSupport();
  const conversationRef = useRef(null);

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
    <aside className="support-chat" aria-label="Assistant voyage">
      <section
        className="support-chat__panel"
        id="support-chat-panel"
        aria-label="Conversation avec l’assistant"
        hidden={!open}
      >
          <header className="support-chat__header">
            <div>
              <strong>Votre assistant voyage</strong>
              <span>Vous parlez à une IA · You are speaking with AI</span>
            </div>
            <button
              className="support-chat__close"
              type="button"
              aria-label="Fermer l’assistant"
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
                {item.content}
                <Sources sources={item.sources} />
              </p>
            ))}
            {pending && (
              <p className="support-chat__typing" role="status">
                L’assistant prépare sa réponse…
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
        type="button"
        aria-expanded={open}
        aria-controls="support-chat-panel"
        onClick={() => setOpen((etat) => !etat)}
      >
        {open ? "Fermer" : "Besoin d’aide ?"}
      </button>
    </aside>
  );
}
