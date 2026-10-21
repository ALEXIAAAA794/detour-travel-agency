"""File d'emails persistante partagée par Express et le back-office Python.
Aucune dépendance Python externe. Aucun envoi lors d'un import ou de l'ajout en file.
"""
import argparse
import json
import os
import re
import smtplib
import ssl
import tempfile
import time
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path
from urllib.parse import urlencode, urlparse

BASE = Path(__file__).resolve().parent
TYPES = ("reception", "proposition")


def configuration():
    valeurs = {}
    fichier = BASE / ".env"
    if fichier.exists():
        for ligne in fichier.read_text(encoding="utf-8-sig").splitlines():
            ligne = ligne.strip()
            if not ligne or ligne.startswith("#") or "=" not in ligne:
                continue
            cle, valeur = ligne.split("=", 1)
            valeur = valeur.strip()
            if len(valeur) >= 2 and valeur[0] == valeur[-1] and valeur[0] in "\"'":
                valeur = valeur[1:-1]
            valeurs[cle.strip()] = valeur
    valeurs.update(os.environ)
    return valeurs


def maintenant():
    return datetime.now(timezone.utc).isoformat()


def dossier():
    return BASE / "data" / "notifications"


def chemin(reference, type_email):
    if type_email not in TYPES:
        raise ValueError("Type inconnu")
    return dossier() / (str(uuid.UUID(reference)) + "-" + type_email + ".json")


def ecrire(fichier, valeur):
    fichier.parent.mkdir(parents=True, exist_ok=True)
    nom = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=fichier.parent,
                                         suffix=".tmp", delete=False) as flux:
            nom = flux.name
            json.dump(valeur, flux, ensure_ascii=False, indent=2)
        os.replace(nom, fichier)
        nom = None
    finally:
        if nom:
            Path(nom).unlink(missing_ok=True)


def etat(reference, type_email):
    try:
        return json.loads(chemin(reference, type_email).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"statut": "NON_PLANIFIE"}
    except (OSError, ValueError):
        return {"statut": "ILLISIBLE"}


def ajouter(reference, type_email):
    """Un seul événement par demande/type, même après un réessai HTTP."""
    fichier = chemin(reference, type_email)
    fichier.parent.mkdir(parents=True, exist_ok=True)
    valeur = {"reference": str(uuid.UUID(reference)), "type": type_email,
              "statut": "EN_ATTENTE", "creeLe": maintenant(), "tentatives": 0}
    try:
        with fichier.open("x", encoding="utf-8") as flux:
            json.dump(valeur, flux, ensure_ascii=False, indent=2)
    except FileExistsError:
        pass
    return etat(reference, type_email)


def reessayer(reference, type_email):
    fichier = chemin(reference, type_email)
    valeur = etat(reference, type_email)
    # Un envoi confirmé ou ambigu n'est jamais relancé automatiquement.
    if valeur["statut"] not in ("ECHEC", "NON_CONFIGURE", "NON_PLANIFIE"):
        return False
    if valeur["statut"] == "NON_PLANIFIE":
        ajouter(reference, type_email)
    else:
        valeur.update(statut="EN_ATTENTE", modifieLe=maintenant())
        ecrire(fichier, valeur)
    return True


def adresse_valide(texte):
    return isinstance(texte, str) and len(texte) <= 254 and re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+", texte)


def preparer(evenement, config):
    reference = str(uuid.UUID(evenement["reference"]))
    demande = json.loads((BASE / "data" / "demandes" / (reference + ".json")).read_text(encoding="utf-8"))
    client = demande["client"]
    destinataire = config.get("MAIL_TEST_TO", "").strip() or client["email"]
    expediteur = config.get("SMTP_FROM", "").strip()
    if not adresse_valide(destinataire) or not adresse_valide(expediteur):
        raise ValueError("Adresse email invalide")
    nom = str(client.get("nom", ""))
    if evenement["type"] == "reception":
        sujet = "DÉTOUR — Votre demande de voyage a été reçue"
        contenu = (
            f"Bonjour {nom},\n\nVotre demande de voyage a bien été reçue.\n"
            f"Référence : {reference}\n\nUn conseiller étudiera votre demande et vous répondra "
            "sous 24 heures maximum. Il n'est pas nécessaire qu'il soit connecté au moment de votre envoi.\n\n"
            "Il s'agit d'une demande de voyage : aucune réservation ni aucun paiement n'a été effectué.\n\n"
            "L'équipe DÉTOUR"
        )
    else:
        proposition = demande.get("proposition", {})
        if demande.get("statut") not in ("PROPOSITION_VALIDEE", "PROPOSITION_ACCEPTEE") or not demande.get("accesClient"):
            raise ValueError("Proposition non validée")
        base_url = config.get("CLIENT_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
        url = urlparse(base_url)
        if url.scheme not in ("http", "https") or not url.netloc or url.query or url.fragment or url.username:
            raise ValueError("Adresse client invalide")
        if url.scheme != "https" and url.hostname not in ("localhost", "127.0.0.1", "::1"):
            raise ValueError("HTTPS requis hors du poste local")
        lien = base_url + "/proposition?" + urlencode({"reference": reference, "acces": demande["accesClient"]})
        local = url.hostname in ("localhost", "127.0.0.1", "::1")
        sujet = "DÉTOUR — Votre proposition de voyage est disponible"
        contenu = (
            f"Bonjour {nom},\n\nVotre conseiller a préparé votre proposition : {proposition.get('titre', '')}.\n"
            f"Référence : {reference}\n\nConsultez son programme, ses dates et son prix, puis acceptez-la si elle vous convient :\n{lien}\n\n"
            "Ce lien est confidentiel : toute personne qui le possède peut consulter et accepter cette proposition.\n"
            "La validation de la proposition ne réalise aucun paiement et ne confirme pas de réservation prestataire.\n"
            + ("\nTEST LOCAL : ce lien fonctionne uniquement sur l'ordinateur qui héberge actuellement le projet.\n" if local else "")
            + "\nL'équipe DÉTOUR"
        )
    message = EmailMessage()
    message["From"] = expediteur
    message["To"] = destinataire
    message["Subject"] = sujet
    message["Date"] = formatdate(localtime=False)
    message["Message-ID"] = evenement.get("messageId") or make_msgid(domain=expediteur.split("@")[-1])
    message.set_content(contenu)
    return message, expediteur, destinataire


def traiter(fichier):
    verrou = fichier.with_suffix(".lock")
    try:
        fd = os.open(verrou, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
    except FileExistsError:
        return
    try:
        evenement = json.loads(fichier.read_text(encoding="utf-8"))
        if evenement.get("statut") != "EN_ATTENTE":
            return
        config = configuration()
        necessaires = ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM")
        if config.get("MAIL_ENABLED", "false").lower() != "true" or not all(config.get(k) for k in necessaires):
            evenement.update(statut="NON_CONFIGURE", modifieLe=maintenant(), detail="Configurer le SMTP puis réessayer depuis le back-office.")
            ecrire(fichier, evenement)
            return
        try:
            port = int(config.get("SMTP_PORT", "465"))
            securite = config.get("SMTP_SECURITY", "ssl")
            if securite not in ("ssl", "starttls"):
                raise ValueError("Sécurité SMTP invalide")
            message, expediteur, destinataire = preparer(evenement, config)
        except (ValueError, KeyError, OSError):
            evenement.update(statut="ECHEC", modifieLe=maintenant(), detail="Vérifier les données et la configuration email.")
            ecrire(fichier, evenement)
            return
        evenement.update(statut="EN_COURS", modifieLe=maintenant(),
                         tentatives=evenement.get("tentatives", 0) + 1,
                         messageId=message["Message-ID"], test=bool(config.get("MAIL_TEST_TO")))
        ecrire(fichier, evenement)
        serveur = None
        envoi_commence = False
        try:
            contexte = ssl.create_default_context()
            if securite == "ssl":
                serveur = smtplib.SMTP_SSL(config["SMTP_HOST"], port, timeout=10, context=contexte)
            else:
                serveur = smtplib.SMTP(config["SMTP_HOST"], port, timeout=10)
                serveur.ehlo()
                serveur.starttls(context=contexte)
                serveur.ehlo()
            serveur.login(config["SMTP_USER"], config["SMTP_PASSWORD"])
            envoi_commence = True
            refuses = serveur.send_message(message, from_addr=expediteur, to_addrs=[destinataire])
            if refuses:
                raise smtplib.SMTPRecipientsRefused(refuses)
            evenement.update(statut="ACCEPTE_SMTP", detail="Message accepté par le serveur SMTP ; réception en boîte non garantie.", modifieLe=maintenant())
        except (smtplib.SMTPRecipientsRefused, smtplib.SMTPAuthenticationError, smtplib.SMTPSenderRefused, smtplib.SMTPDataError):
            evenement.update(statut="ECHEC", detail="Envoi refusé par le service email. Vérifier la configuration ou le destinataire.", modifieLe=maintenant())
        except Exception:
            evenement.update(statut="INCERTAIN" if envoi_commence else "ECHEC",
                             detail="Vérifier la boîte du destinataire avant toute nouvelle tentative." if envoi_commence else "Connexion au service email impossible.", modifieLe=maintenant())
        finally:
            if serveur:
                try:
                    serveur.close()
                except Exception:
                    pass
        ecrire(fichier, evenement)
    finally:
        verrou.unlink(missing_ok=True)


def passage():
    for fichier in sorted(dossier().glob("*.json")):
        try:
            traiter(fichier)
        except Exception:
            # Ne jamais journaliser le contenu des emails ni les identifiants SMTP.
            print("Notification non traitée : consulter son état dans le back-office.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--enqueue", nargs=2, metavar=("REFERENCE", "TYPE"))
    parser.add_argument("--worker", action="store_true")
    arguments = parser.parse_args()
    if arguments.enqueue:
        try:
            valeur = ajouter(*arguments.enqueue)
            print(json.dumps({"statut": valeur["statut"]}))
        except Exception:
            print(json.dumps({"statut": "NON_PLANIFIE"}))
    elif arguments.worker:
        print("Service emails DÉTOUR démarré. Ctrl+C pour arrêter.", flush=True)
        try:
            while True:
                passage()
                time.sleep(3)
        except KeyboardInterrupt:
            pass
