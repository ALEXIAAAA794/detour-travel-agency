import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ICONS } from "../data.js";

const SUFFIX = " | DÉTOUR - Voyages insolites et week-ends sur mesure";

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title + SUFFIX;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description]);
}

export function Features({ items }) {
  return (
    <div className="features">
      {items.map(([icon, title, text]) => (
        <div key={title}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICONS[icon]} />
          </svg>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}

export function Steps({ title, items }) {
  return (
    <section className="steps">
      <span className="eyebrow">Comment ça marche</span>
      <h2 className="sec-title">{title}</h2>
      <div className="step-grid">
        {items.map(([heading, text], i) => (
          <div className="step" key={heading}>
            <b>{i + 1}</b>
            <h3>{heading}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Cta({ title, text, label = "Je demande mon devis »" }) {
  return (
    <section className="cta">
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="pill" to="/contact">{label}</Link>
    </section>
  );
}