import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "detour-cookies";

function readChoice() {
  try {
    const choice = window.localStorage.getItem(STORAGE_KEY);
    return {
      hidden: choice === "accepted" || choice === "rejected",
      error: "",
    };
  } catch {
    return {
      hidden: false,
      error: "Le navigateur empêche la lecture de votre choix de cookies.",
    };
  }
}

export default function CookieConsent() {
  const [state, setState] = useState(readChoice);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    function showConsent() {
      setState({ hidden: false, error: "" });
    }
    window.addEventListener("detour:show-cookie-consent", showConsent);
    return () => window.removeEventListener("detour:show-cookie-consent", showConsent);
  }, []);

  function choose(choice) {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      setState({
        hidden: false,
        error: "Votre choix n’a pas pu être mémorisé. Autorisez le stockage local puis réessayez.",
      });
      return;
    }

    setState({ hidden: true, error: "" });
    if (choice === "accepted" && pathname !== "/") navigate("/", { replace: true });
  }

  if (state.hidden) return null;

  return (
    <section className="cookies" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-description">
      <h2 id="cookie-title">Votre choix concernant les cookies</h2>
      <p id="cookie-description">
        Les cookies facultatifs ne sont utilisés qu’avec votre accord. Les cookies indispensables au fonctionnement du site restent actifs.
      </p>
      <div className="cookie-actions">
        <button type="button" className="pill" onClick={() => choose("accepted")}>Accepter</button>
        <button type="button" className="pill cookie-refuse" onClick={() => choose("rejected")}>Refuser</button>
      </div>
      {state.error && <p className="cookie-error" role="alert">{state.error}</p>}
    </section>
  );
}
