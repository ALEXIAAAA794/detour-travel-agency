import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const NAV = [
  ["/", "Accueil"],
  ["/destinations", "Nos destinations"],
  ["/agence", "L'agence"],
  ["/contact", "Devis gratuit"],
];

function Wordmark({ mono = false }) {
  return (
    <span className={"wordmark" + (mono ? " mono" : "")}>
      <span aria-hidden="true">
        DÉT<span className="wm-o">O</span>UR
      </span>
    </span>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="logo" to="/" aria-label="Détour, accueil">
          <Wordmark />
        </Link>

        <nav
          className={"main-nav" + (open ? " open" : "")}
          id="nav"
          aria-label="Navigation principale"
        >
          {NAV.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {user ? (
          <Link className="pill" to="/profile">
            Mon profil
          </Link>
        ) : (
          <Link className="pill" to="/login">
            Connexion
          </Link>
        )}

        <button
          className="menu-toggle"
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
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
            <Link className="logo" to="/" aria-label="Détour, accueil">
              <Wordmark mono />
            </Link>
            <p className="foot-promise">
              Un voyage insolite composé sur mesure par une personne qui a
              vérifié chaque prix, chaque place et chaque horaire.
            </p>
            <p className="foot-sign">Prenez le pas de côté.</p>
          </div>
          <div>
            <h3>liens utiles</h3>
            <ul>
              {NAV.map(([to, label]) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
              <li>
                <a href="#">Mentions légales</a>
              </li>
              <li>
                <a href="#">CGV</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>contact</h3>
            <ul>
              <li>12 rue des Écluses, 44000 Nantes</li>
              <li>
                <a href="tel:+33240000000">02 40 00 00 00</a>
              </li>
              <li>
                <a href="mailto:contact@detour-voyages.fr">
                  contact@detour-voyages.fr
                </a>
              </li>
              <li>Mardi au samedi, 10h-19h</li>
            </ul>
          </div>
        </div>
        <p className="copy">
          © {new Date().getFullYear()} DÉTOUR Voyages. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <>
      <a className="skip" href="#contenu">
        Aller au contenu
      </a>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}