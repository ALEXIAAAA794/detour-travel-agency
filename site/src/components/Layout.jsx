import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import SupportChat from "./SupportChat.jsx";
import { useSupport } from "../support/SupportContext.jsx";

const NAV = [
  ["/", "Accueil"],
  ["/destinations", "Nos destinations"],
  ["/agence", "L'agence"],
  ["/contact", "Contact"],
  ["/espace", "Mon espace"],
];

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onAccountPage = pathname.startsWith("/espace");
  useEffect(() => setOpen(false), [pathname]); // ferme le menu mobile après navigation

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="logo" to="/" aria-label="DÉTOUR Voyages, accueil">
          <img src="/img/detour-logo-rebrand.png" alt="DÉTOUR Voyages" />
        </Link>
        <nav className={"main-nav" + (open ? " open" : "")} id="nav" aria-label="Navigation principale">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {label}
            </NavLink>
          ))}
          {onAccountPage && <Link className="mobile-nav-action" to="/pre-reservation">Nouvelle demande</Link>}
        </nav>
        <Link className="pill" to={onAccountPage ? "/pre-reservation" : "/contact"}>
          {onAccountPage ? "Nouvelle demande" : "Demander un devis"}
        </Link>
        <button className="menu-toggle" type="button" aria-label="Menu" aria-expanded={open}
          aria-controls="nav" onClick={() => setOpen((o) => !o)}>☰</button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot">
          <div>
            <Link className="logo" to="/" aria-label="DÉTOUR Voyages, accueil">
              <img src="/img/detour-logo-rebrand.png" alt="DÉTOUR Voyages" />
            </Link>
            <p>Prenez le pas de côté. Une personne compose votre voyage et vérifie chaque prix, chaque place et chaque horaire.</p>
          </div>
          <div>
            <h3>Liens utiles</h3>
            <ul>
              {NAV.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}
              <li><a href="#">Mentions légales</a></li>
              <li><a href="#">CGV</a></li>
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              <li>12 rue des Écluses, 44000 Nantes</li>
              <li><a href="tel:+33240000000">02 40 00 00 00</a></li>
              <li><a href="mailto:contact@detour-voyages.fr">contact@detour-voyages.fr</a></li>
              <li>Mardi au samedi, 10h-19h</li>
            </ul>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} DÉTOUR Voyages. Tous droits réservés.</p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { language } = useSupport();
  const { pathname, hash } = useLocation();
  const assistantRoute = ["/assistant", "/assistant.html", "/assistant/confirmation"].includes(pathname);

  useEffect(() => {
    if (!assistantRoute) return;
    const icon = document.querySelector('link[rel="icon"]'), previous = icon?.getAttribute("href");
    if (icon) icon.setAttribute("href", "/support-brand/detour-monogramme.svg");
    return () => { if(icon && previous) icon.setAttribute("href", previous); };
  }, [assistantRoute]);

  /* Les liens d'ancre (/destinations#lyon) et le retour en haut de page ne sont pas gérés par le routeur. */
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <a className="skip" href="#contenu">Aller au contenu</a>
      {assistantRoute ? <header className="support-brand support-shell"><div className="wrap"><Link to="/" aria-label="DÉTOUR — accueil"><img src="/support-brand/detour-logo-mono-encre.svg" width="160" alt="DÉTOUR" /></Link><Link to="/contact">contact</Link></div></header> : <Header />}
      <Outlet />
      {assistantRoute ? <footer className="support-brand support-footer"><div className="wrap">DÉTOUR Voyages · <Link to="/contact">{language === "en" ? "contact an adviser" : "contacter un conseiller"}</Link></div></footer> : <Footer />}
      {!assistantRoute && <SupportChat />}
    </>
  );
}
