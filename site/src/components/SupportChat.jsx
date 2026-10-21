import { useEffect, useRef, useState } from "react";

const MESSAGE_URL = "/api/support/messages";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Bonjour ! Je peux vous aider à imaginer votre prochain voyage. Que recherchez-vous ?",
    },
  ]);
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
    setMessages((precedents) => [
      ...precedents,
      { role: "user", content: contenu },
    ]);
    setPending(true);

    try {
      const response = await fetch(MESSAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: contenu }),
      });
      const donnees = await response.json();

      if (!response.ok) {
        throw new Error(
          donnees.error?.message || "Le service d’assistance est indisponible."
        );
      }

      if (typeof donnees.reply?.content !== "string") {
        throw new Error("La réponse de l’assistant est invalide.");
      }

      setMessages((precedents) => [
        ...precedents,
        { role: "assistant", content: donnees.reply.content },
      ]);
    } catch (erreur) {
      console.error("Échec de l’envoi au support IA :", erreur);
      setMessages((precedents) => [
        ...precedents,
        {
          role: "assistant",
          content:
            "Je n’arrive pas à joindre l’assistant pour le moment. Réessayez plus tard ou contactez notre équipe.",
        },
      ]);
    } finally {
      setPending(false);
    }
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
              <span>Une question pour votre prochain départ ?</span>
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
              </p>
            ))}
            {pending && (
              <p className="support-chat__typing" role="status">
                L’assistant prépare sa réponse…
              </p>
            )}
          </div>

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
