import { createContext, useContext, useEffect, useRef, useState } from "react";
import { problemesDates } from "./dates.js";
import { createSupportClient } from "./client.js";
const Context = createContext(null);
import { welcomeMessage } from "./identity.js";
const welcome = welcomeMessage("fr");
export function SupportProvider({ children }) {
  const apiRef = useRef(null);
  if (!apiRef.current) { let storage; try { storage = window.sessionStorage; } catch {} apiRef.current = createSupportClient({ storage, location: window.location, history: window.history }); }
  const api = apiRef.current;
  const [preparation, setPreparation] = useState(null), [draft, setDraft] = useState({});
  const [messages, setMessages] = useState([welcome]), [pending, setPending] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), retryRef = useRef(null);
  useEffect(() => {
    let active = true;
    lock.current = true; setPending(true);
    api.restore().then(p => { if (active && p) { setPreparation(p); setDraft(p.voyage); setMessages([welcome, ...p.historique]); } })
      .catch(e => { if (active) { setError(e.message || "Préparation inaccessible. Les données existantes sont conservées."); retryRef.current = async () => { const p=await api.restore(); if(p){setPreparation(p);setDraft(p.voyage);setMessages([welcome,...p.historique]);} }; } })
      .finally(() => { if (active) { lock.current = false; setPending(false); } });
    return () => { active = false; };
  }, [api]);
  async function execute(action) {
    if (lock.current) return null;
    lock.current = true; setPending(true); setError(""); retryRef.current = action;
    try { const r = await action(); retryRef.current = null; return r; }
    catch (e) { setError(e.message || "Opération non confirmée. Réessayez."); return null; }
    finally { lock.current = false; setPending(false); }
  }
  async function save() { const errors = problemesDates(draft); if(errors.length) throw new Error(errors.join(" ")); const p = await api.save(draft); setPreparation(p); return p; }
  const [language, updateLanguage] = useState(() => { try { return sessionStorage.getItem("detour-support-language") === "en" ? "en" : "fr"; } catch { return "fr"; } });
  function setLanguage(v) { updateLanguage(v); try { sessionStorage.setItem("detour-support-language", v); } catch {} }
  const value = { language, setLanguage, verifyPreferencesTransmission: () => api.confirmationPreferences(), preparation, draft, setDraft, messages: messages.map((m,i) => i === 0 && m === welcome ? welcomeMessage(language) : m), pending, error,
    retry: () => retryRef.current ? execute(retryRef.current) : null,
    start: () => execute(async () => { const p = await api.start(); setPreparation(p); setDraft({}); setMessages([welcome]); return p; }),
    save: () => execute(save),
    ask: message => execute(async () => {
      setMessages(m => m.at(-1)?.role === "user" && m.at(-1)?.content === message ? m : [...m, { role: "user", content: message }]);
      if (Object.keys(draft).length) await save();
      const data = await api.ask(message);
      setMessages(m => [...m, data.reply]);
      setPreparation(api.current);
      return data;
    }),
    generate: () => execute(async () => { await save(); const p = await api.generate(); setPreparation(p); return p; }),
    modify: modification => execute(async () => { const version = preparation?.programme?.version; await save(); const p = await api.modify(modification, version); setPreparation(p); setMessages(m => [...m, { role: "user", content: "Modification : " + modification }, { role: "assistant", content: "Programme enregistré, version " + p.programme.version }]); return p; }),
    transmit: (client, accord) => execute(async () => { const version = preparation?.programme?.version; await save(); return api.transmit(client, version, accord); }),
    sendPreferences: (client, requestId, onConfirmed) => execute(async () => { await save(); const r = await api.sendPreferences(client, draft, requestId); onConfirmed?.(r); return r; })
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useSupport = () => useContext(Context);
export function Sources({ sources = [] }) {
  const allowed = ["/contact", "/destinations", "/assistant"];
  return <small className="support-sources">{sources.map(s => s ? { ...s, url: s.url?.replace(/\.html$/, "") } : s).filter(s => s && allowed.includes(s.url)).map((s, i) => <a href={s.url} key={s.id + i}>{s.titre} [{s.id}] </a>)}</small>;
}
