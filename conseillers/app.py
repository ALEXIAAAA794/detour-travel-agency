import html
import time
from contextlib import contextmanager
import importlib.util
import secrets
import tempfile
import threading
import uuid
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, date
from decimal import Decimal, InvalidOperation
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import http.cookies
import auth
API_URL = os.environ.get("DETOUR_API_URL", "http://127.0.0.1:8765").rstrip("/")
API_KEY = os.environ.get("DETOUR_API_KEY", "")
PORT = int(os.environ.get("PORT", "8080"))
VERSION = "1.3.2"
JETON_FORMULAIRE = secrets.token_urlsafe(32)
_VERROU_LOCAL_DEMANDES = threading.Lock()

def dossier_demandes():
    return os.environ.get("SUPPORT_DEMANDES_DIR") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "support-ia", "data", "demandes"))

@contextmanager
def verrou_demandes():
    # Même verrou interprocessus que les écritures Express.
    dossier = dossier_demandes()
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, ".ecriture.lock")
    with _VERROU_LOCAL_DEMANDES:
        limite = time.monotonic() + 8
        while True:
            try:
                fd = os.open(chemin, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
                os.close(fd)
                break
            except FileExistsError:
                if time.monotonic() >= limite:
                    raise OSError("Demandes occupées, réessayez.")
                time.sleep(0.05)
        try:
            yield
        finally:
            os.unlink(chemin)

# Même module et même dossier de notifications que le serveur Express.
_chemin_notifications = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "support-ia", "notifications.py"
))
_spec_notifications = importlib.util.spec_from_file_location("detour_notifications", _chemin_notifications)
notifications = importlib.util.module_from_spec(_spec_notifications)
_spec_notifications.loader.exec_module(notifications)

TYPES = {"transport": "Transport", "hebergement": "Hébergement", "activite": "Activité"}
def e(value):
    return html.escape("" if value is None else str(value))
def api(method, path, params=None, body=None, approval=None):
    url = API_URL + path
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v})
    data = None
    headers = {"X-Team-Key": API_KEY, "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if approval is not None:
        headers["X-Approval-Key"] = approval
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except urllib.error.HTTPError as exc:
        try:
            err = json.loads(exc.read().decode("utf-8"))["erreur"]
            return None, "Erreur %s (%s) : %s" % (exc.code, err.get("code"), err.get("message"))
        except Exception:
            return None, "Erreur %s" % exc.code
    except Exception as exc:
        return None, "Serveur prestataires injoignable (%s)" % e(exc)
def fmt_date(value):
    try:
        d = datetime.fromisoformat(value)
        return d.astimezone().strftime("%d/%m/%Y %H:%M")
    except Exception:
        return value or ""
def expired(option):
    try:
        return datetime.fromisoformat(option["expire_le"]) <= datetime.now(timezone.utc)
    except Exception:
        return False
def page(title, body, msg="", err=""):
    alerts = ""
    if msg:
        alerts += '<p class="ok">%s</p>' % e(msg)
    if err:
        alerts += '<p class="err">%s</p>' % e(err)
    return """<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<link rel="icon" href="/static/favicon.png">
<title>DETOUR - Back-office - %s</title>
<link rel="stylesheet" href="/static/bo.css">
</head>
<body>
<table width="100%%" cellpadding="0" cellspacing="0" class="top">
<tr>
<td><img src="/static/logo.png" height="40" alt="DETOUR"> <b>BACK-OFFICE CONSEILLERS</b></td>
<td align="right"><small>v%s &nbsp;|&nbsp; %s</small></td>
</tr>
</table>
<table width="100%%" cellpadding="4" cellspacing="0">
<tr>
<td width="160" valign="top" class="menu">
<b>Menu</b><br>
<a href="/">Accueil</a><br>
<a href="/demandes">Demandes de voyage</a><br>
<a href="/catalogue">Catalogue</a><br>
<a href="/dispo">Vérifier une dispo</a><br>
<a href="/options">Options en cours</a><br>
<a href="/reservations">Réservations</a><br>
<br>
<small>Problème ? Voir Camille.</small>
</td>
<td valign="top">
<h2>%s</h2>
%s
%s
</td>
</tr>
</table>
<hr>
<center><small>DETOUR Voyages insolites - usage interne uniquement - ne pas diffuser</small></center>
</body>
</html>""" % (e(title), VERSION, datetime.now().strftime("%d/%m/%Y %H:%M"), e(title), alerts, body)
def home():
    status, err = api("GET", "/health")
    etat = '<font color="green"><b>OK</b></font>' if status else '<font color="red"><b>HS</b></font>'
    body = """<p>Bienvenue sur le back-office DETOUR.</p>
<table border="1" cellpadding="3" cellspacing="0">
<tr><th align="left">Serveur prestataires</th><td>%s</td></tr>
<tr><th align="left">Adresse</th><td>%s</td></tr>
<tr><th align="left">Clé agence</th><td>%s</td></tr>
</table>
<p><b>Rappel procédure :</b></p>
<ol>
<li>Vérifier la dispo et le prix (le prix peut changer !)</li>
<li>Poser une option (bloque les places 30 min)</li>
<li>Confirmer avec la clé d'approbation + votre nom</li>
</ol>
<p><i>Penser à noter le n° de réservation dans le dossier client (Excel partagé).</i></p>""" % (
        etat, e(API_URL), "configurée" if API_KEY else '<font color="red">MANQUANTE</font>')
    return page("Accueil", body, err=err if not status else "")
def catalogue(q):
    destination = q.get("destination", [""])[0]
    typ = q.get("type", [""])[0]
    data, err = api("GET", "/api/v1/catalogue", {"destination": destination, "type": typ})
    opts = '<option value="">-- tous --</option>' + "".join(
        '<option value="%s"%s>%s</option>' % (k, " selected" if k == typ else "", v) for k, v in TYPES.items())
    body = """<form method="get" action="/catalogue">
Destination : <input type="text" name="destination" value="%s" size="15">
Type : <select name="type">%s</select>
<input type="submit" value="Rechercher">
</form><br>""" % (e(destination), opts)
    if data:
        rows = ""
        for i, p in enumerate(data.get("prestations", [])):
            rows += """<tr class="r%d"><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td align="right">%s &euro;</td><td align="center">%s</td><td>%s</td><td>%s</td>
<td><a href="/dispo?prestation_id=%s">dispo</a></td></tr>""" % (
                i % 2, e(p["id"]), e(TYPES.get(p["type"], p["type"])), e(p["nom"]), e(p["destination"]),
                e(p["prix_unitaire_eur"]), e(p["capacite"]), e(p.get("description")), e(", ".join(p.get("tags", []))),
                urllib.parse.quote(p["id"]))
        body += """<table border="1" cellpadding="3" cellspacing="0" width="100%%">
<tr class="h"><th>Code</th><th>Type</th><th>Nom</th><th>Ville</th><th>Prix/pers.</th><th>Capa.</th><th>Description</th><th>Tags</th><th>&nbsp;</th></tr>
%s</table>
<p><small>%d prestation(s). Prix catalogue indicatif, toujours vérifier la dispo.</small></p>""" % (
            rows, len(data.get("prestations", [])))
    return page("Catalogue", body, err=err)
def dispo(q, msg="", err_in=""):
    pid = q.get("prestation_id", [""])[0]
    date = q.get("date", [""])[0]
    participants = q.get("participants", ["2"])[0]
    cat, err = api("GET", "/api/v1/catalogue")
    choices = '<option value="">-- choisir --</option>'
    for p in (cat or {}).get("prestations", []):
        choices += '<option value="%s"%s>%s - %s</option>' % (
            e(p["id"]), " selected" if p["id"] == pid else "", e(p["destination"]), e(p["nom"]))
    body = """<form method="get" action="/dispo">
<table cellpadding="3">
<tr><td>Prestation :</td><td><select name="prestation_id">%s</select></td></tr>
<tr><td>Date (AAAA-MM-JJ) :</td><td><input type="text" name="date" value="%s" size="12"></td></tr>
<tr><td>Nb personnes :</td><td><input type="text" name="participants" value="%s" size="3"></td></tr>
<tr><td></td><td><input type="submit" value="Vérifier"></td></tr>
</table>
</form>""" % (choices, e(date), e(participants))
    if pid and date:
        res, err = api("GET", "/api/v1/disponibilites", {"prestation_id": pid, "date": date, "participants": participants})
        if res:
            color = "green" if res["disponible"] else "red"
            body += """<hr><table border="1" cellpadding="4" cellspacing="0">
<tr><th align="left">Disponible</th><td><font color="%s"><b>%s</b></font></td></tr>
<tr><th align="left">Places restantes</th><td>%s</td></tr>
<tr><th align="left">Prix unitaire</th><td>%s &euro;</td></tr>
<tr><th align="left">Prix total</th><td><b>%s &euro;</b></td></tr>
<tr><th align="left">Vérifié le</th><td>%s</td></tr>
</table>""" % (color, "OUI" if res["disponible"] else "NON", e(res["places_restantes"]),
                e(res["prix_unitaire_eur"]), e(res["prix_total_eur"]), datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
            if res["disponible"]:
                body += """<form method="post" action="/options">
<input type="hidden" name="prestation_id" value="%s">
<input type="hidden" name="date" value="%s">
<input type="hidden" name="participants" value="%s">
<br><input type="submit" value="&gt;&gt; Poser une option (30 min)">
</form>""" % (e(pid), e(date), e(participants))
    return page("Vérifier une disponibilité", body, msg=msg, err=err_in or err)
def options(msg="", err_in=""):
    data, err = api("GET", "/api/v1/options")
    body = ""
    if data:
        rows = ""
        for i, o in enumerate(sorted(data.get("options", []), key=lambda o: o["expire_le"], reverse=True)):
            statut = o["statut"]
            if statut == "active" and expired(o):
                statut = "expiree"
            action = "&nbsp;"
            if statut == "active":
                action = """<form method="post" action="/confirmer" style="margin:0">
<input type="hidden" name="option_id" value="%s">
Nom : <input type="text" name="approuve_par" size="12">
Clé : <input type="password" name="approval" size="10">
<input type="submit" value="Confirmer">
</form>""" % e(o["id"])
            rows += '<tr class="r%d"><td>%s</td><td>%s</td><td>%s</td><td align="center">%s</td><td align="right">%s &euro;</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
                i % 2, e(o["id"]), e(o["prestation_id"]), e(o["date"]), e(o["participants"]),
                e(o["prix_total_eur"]), e(fmt_date(o["expire_le"])), e(statut), action)
        body = """<table border="1" cellpadding="3" cellspacing="0" width="100%%">
<tr class="h"><th>N° option</th><th>Prestation</th><th>Date</th><th>Pers.</th><th>Total</th><th>Expire le</th><th>Statut</th><th>Action</th></tr>
%s</table>
<p><small>Une option expirée ne bloque plus les places. Il faut en reposer une.</small></p>""" % (
            rows or '<tr><td colspan="8"><i>Aucune option.</i></td></tr>')
    return page("Options en cours", body, msg=msg, err=err_in or err)
def reservations(msg="", err_in=""):
    data, err = api("GET", "/api/v1/reservations")
    body = ""
    if data:
        rows = ""
        for i, r in enumerate(sorted(data.get("reservations", []), key=lambda r: r.get("confirmee_le", ""), reverse=True)):
            action = "&nbsp;"
            if r["statut"] == "confirmee":
                action = """<form method="post" action="/annuler" style="margin:0" onsubmit="return confirm('Annuler la réservation ?')">
<input type="hidden" name="reservation_id" value="%s">
Clé : <input type="password" name="approval" size="10">
<input type="submit" value="Annuler">
</form>""" % e(r["id"])
            rows += '<tr class="r%d"><td>%s</td><td>%s</td><td>%s</td><td align="center">%s</td><td align="right">%s &euro;</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
                i % 2, e(r["id"]), e(r["prestation_id"]), e(r["date"]), e(r["participants"]), e(r["prix_total_eur"]),
                e(r.get("approuve_par")), e(fmt_date(r.get("confirmee_le"))), e(r["statut"]), action)
        body = """<table border="1" cellpadding="3" cellspacing="0" width="100%%">
<tr class="h"><th>N° résa</th><th>Prestation</th><th>Date</th><th>Pers.</th><th>Total</th><th>Validé par</th><th>Confirmée le</th><th>Statut</th><th>Action</th></tr>
%s</table>""" % (rows or '<tr><td colspan="9"><i>Aucune réservation.</i></td></tr>')
    return page("Réservations", body, msg=msg, err=err_in or err)
def prendre_en_charge(reference, jeton):
    if not secrets.compare_digest(jeton, JETON_FORMULAIRE):
        return "Formulaire expiré. Actualisez la page et réessayez."
    try:
        identifiant = str(uuid.UUID(reference))
    except (ValueError, AttributeError):
        return "Référence invalide."
    dossier = dossier_demandes()
    chemin = os.path.join(dossier, identifiant + ".json")
    temporaire = None
    try:
        with verrou_demandes():
            with open(chemin, encoding="utf-8") as fichier:
                demande = json.load(fichier)
            if demande.get("statut") == "EN_ETUDE":
                return None
            if demande.get("statut") != "RECUE":
                return "Cette demande ne peut pas être prise en charge."
            demande["statut"] = "EN_ETUDE"
            demande["modifieLe"] = datetime.now(timezone.utc).isoformat()
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=dossier,
                suffix=".tmp",
                delete=False
            ) as fichier:
                temporaire = fichier.name
                json.dump(demande, fichier, ensure_ascii=False, indent=2)
            os.replace(temporaire, chemin)
            temporaire = None
        return None
    except (OSError, ValueError, AttributeError):
        return "Impossible de mettre à jour cette demande."
    finally:
        if temporaire and os.path.exists(temporaire):
            os.unlink(temporaire)

def formulaire_proposition(demande, valeurs=None):
    proposition = valeurs if valeurs is not None else demande.get("proposition", {})
    champs = [
        ("titre", "Titre du voyage", "text", 120),
        ("dateDebut", "Date de départ", "date", 10),
        ("dateFin", "Date de retour", "date", 10),
        ("prixTotal", "Prix total pour tous les voyageurs", "text", 20),
    ]
    contenu = ""
    for cle, libelle, type_champ, maximum in champs:
        contenu += (
            '<p><label>%s<br><input name="%s" type="%s" '
            'value="%s" maxlength="%s" required></label></p>'
            % (e(libelle), e(cle), e(type_champ), e(proposition.get(cle, "")), maximum)
        )
    choix = "".join(
        '<option value="%s"%s>%s</option>'
        % (devise, " selected" if proposition.get("devise", "EUR") == devise else "", devise)
        for devise in ("EUR", "USD", "GBP", "CAD", "CHF")
    )
    return (
        '<h3>Proposition — brouillon conseiller</h3>'
        '<p>Ce brouillon ne confirme ni prix prestataire, ni disponibilité. '
        'Il n’est pas envoyé au client.</p>'
        '<form method="post" action="/demandes/proposition">'
        '<input type="hidden" name="reference" value="%s">'
        '<input type="hidden" name="jeton" value="%s">%s'
        '<p><label>Devise<br><select name="devise">%s</select></label></p>'
        '<p><label>Programme et prestations prévues<br>'
        '<textarea name="programme" rows="6" cols="55" maxlength="6000" required>%s</textarea>'
        '</label></p><button type="submit">Enregistrer le brouillon</button></form>'
        % (e(demande.get("reference")), e(JETON_FORMULAIRE), contenu, choix,
           e(proposition.get("programme", "")))
    )


def enregistrer_proposition(reference, jeton, valeurs):
    if not secrets.compare_digest(jeton, JETON_FORMULAIRE):
        return "Formulaire expiré. Actualisez la page et réessayez."
    try:
        identifiant = str(uuid.UUID(reference))
    except (ValueError, AttributeError):
        return "Référence invalide."
    titre = valeurs.get("titre", "").strip()
    programme = valeurs.get("programme", "").strip()
    devise = valeurs.get("devise", "")
    if not 1 <= len(titre) <= 120 or not 1 <= len(programme) <= 6000:
        return "Renseignez un titre (120 caractères maximum) et un programme (6 000 maximum)."
    if devise not in ("EUR", "USD", "GBP", "CAD", "CHF"):
        return "Devise non prise en charge."
    debut = valeurs.get("dateDebut", "")
    fin = valeurs.get("dateFin", "")
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", debut) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", fin):
            raise ValueError()
        if date.fromisoformat(fin) < date.fromisoformat(debut):
            raise ValueError()
    except ValueError:
        return "Vérifiez les dates : le retour ne peut pas précéder le départ."
    prix_texte = valeurs.get("prixTotal", "").strip().replace(",", ".")
    if not re.fullmatch(r"[0-9]{1,9}(?:\.[0-9]{1,2})?", prix_texte):
        return "Indiquez un prix positif avec au maximum deux décimales, sans symbole monétaire."
    try:
        prix = Decimal(prix_texte)
        if prix <= 0:
            raise ValueError()
    except (InvalidOperation, ValueError):
        return "Le prix total doit être supérieur à zéro."
    dossier = dossier_demandes()
    chemin = os.path.join(dossier, identifiant + ".json")
    temporaire = None
    try:
        with verrou_demandes():
            with open(chemin, encoding="utf-8") as fichier:
                demande = json.load(fichier)
            if not isinstance(demande, dict) or demande.get("statut") != "EN_ETUDE":
                return "Prenez d’abord cette demande en charge."
            existante = demande.get("proposition")
            if existante and existante.get("statut") != "BROUILLON":
                return "Cette proposition ne peut plus être modifiée comme brouillon."
            maintenant = datetime.now(timezone.utc).isoformat()
            demande["proposition"] = {
                "statut": "BROUILLON", "titre": titre, "programme": programme,
                "dateDebut": debut, "dateFin": fin,
                "prixTotal": format(prix, ".2f"), "devise": devise,
                "modifieLe": maintenant
            }
            demande["modifieLe"] = maintenant
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=dossier, suffix=".tmp", delete=False) as fichier:
                temporaire = fichier.name
                json.dump(demande, fichier, ensure_ascii=False, indent=2)
            os.replace(temporaire, chemin)
            temporaire = None
        return None
    except (OSError, ValueError, AttributeError):
        return "Impossible d’enregistrer le brouillon."
    finally:
        if temporaire:
            try:
                os.unlink(temporaire)
            except OSError:
                pass



def chemin_demande(reference):
    identifiant = str(uuid.UUID(reference))
    return os.path.join(dossier_demandes(), identifiant + ".json")


def ecrire_demande(chemin, demande):
    temporaire = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=os.path.dirname(chemin),
            suffix=".tmp", delete=False
        ) as fichier:
            temporaire = fichier.name
            json.dump(demande, fichier, ensure_ascii=False, indent=2)
        os.replace(temporaire, chemin)
        temporaire = None
    finally:
        if temporaire:
            try:
                os.unlink(temporaire)
            except OSError:
                pass


def valider_proposition(reference, jeton, version):
    if not secrets.compare_digest(jeton, JETON_FORMULAIRE):
        return "Formulaire expiré. Actualisez la page."
    try:
        chemin = chemin_demande(reference)
        with verrou_demandes():
            with open(chemin, encoding="utf-8") as fichier:
                demande = json.load(fichier)
            proposition = demande.get("proposition", {})
            if demande.get("statut") == "PROPOSITION_VALIDEE":
                return None
            if demande.get("statut") != "EN_ETUDE" or proposition.get("statut") != "BROUILLON":
                return "Enregistrez d’abord un brouillon pour cette demande en étude."
            if version != proposition.get("modifieLe"):
                return "Le brouillon a changé. Actualisez et relisez-le avant validation."
            maintenant = datetime.now(timezone.utc).isoformat()
            proposition["statut"] = "VALIDEE"
            proposition["valideeLe"] = maintenant
            demande["statut"] = "PROPOSITION_VALIDEE"
            demande["modifieLe"] = maintenant
            demande["accesClient"] = secrets.token_urlsafe(32)
            ecrire_demande(chemin, demande)
        return None
    except (OSError, ValueError, AttributeError):
        return "Impossible de valider cette proposition."


def lire_proposition_client(reference, acces):
    try:
        with open(chemin_demande(reference), encoding="utf-8") as fichier:
            demande = json.load(fichier)
        secret = demande.get("accesClient", "")
        if not acces or not secret or not secrets.compare_digest(acces, secret):
            return None
        if demande.get("statut") not in ("PROPOSITION_VALIDEE", "PROPOSITION_ACCEPTEE"):
            return None
        return demande
    except (OSError, ValueError, AttributeError):
        return None


def accepter_proposition(reference, acces, jeton):
    if not secrets.compare_digest(jeton, JETON_FORMULAIRE):
        return False
    with verrou_demandes():
        demande = lire_proposition_client(reference, acces)
        if demande is None:
            return False
        if demande["statut"] == "PROPOSITION_ACCEPTEE":
            return True
        maintenant = datetime.now(timezone.utc).isoformat()
        demande["statut"] = "PROPOSITION_ACCEPTEE"
        demande["proposition"]["statut"] = "ACCEPTEE"
        demande["proposition"]["accepteeLe"] = maintenant
        demande["modifieLe"] = maintenant
        try:
            ecrire_demande(chemin_demande(reference), demande)
        except OSError:
            return False
        return True


def page_proposition_client(demande, acces):
    proposition = demande["proposition"]
    lignes = "".join(
        '<tr><th>%s</th><td style="white-space:pre-wrap;overflow-wrap:anywhere">%s</td></tr>'
        % (e(titre), e(valeur))
        for titre, valeur in [
            ("Programme", proposition.get("programme")),
            ("Départ", proposition.get("dateDebut")),
            ("Retour", proposition.get("dateFin")),
            ("Nombre de voyageurs", demande.get("voyage", {}).get("participants")),
            ("Prix total", str(proposition.get("prixTotal", "")) + " " + str(proposition.get("devise", "")))
        ]
    )
    if demande["statut"] == "PROPOSITION_ACCEPTEE":
        action = '<p><strong>Votre acceptation a été enregistrée.</strong> Aucun paiement n’a été effectué. La réservation reste à confirmer par l’agence.</p>'
    else:
        action = (
            '<p>Relisez la proposition avant de l’accepter. '
            'Cette action enregistre votre accord ; elle ne réalise aucun paiement '
            'et ne confirme pas une réservation prestataire.</p>'
            '<form method="post" action="/proposition/accepter">'
            '<input type="hidden" name="reference" value="%s">'
            '<input type="hidden" name="acces" value="%s">'
            '<input type="hidden" name="jeton" value="%s">'
            '<label><input type="checkbox" name="accord" value="oui" required>'
            ' J’ai lu et j’accepte cette proposition.</label><br>'
            '<button type="submit">Accepter la proposition</button></form>'
            % (e(demande["reference"]), e(acces), e(JETON_FORMULAIRE))
        )
    return (
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="referrer" content="no-referrer"><title>DÉTOUR — Votre proposition</title>'
        '<style>body{background:#F8F6F2;color:#142B3A;font-family:Arial,sans-serif;padding:24px}'
        'main{max-width:760px;margin:auto;background:white;padding:24px;border-radius:16px}'
        'table{width:100%%;border-collapse:collapse}th,td{padding:12px;border:1px solid #D8C3A5;text-align:left}'
        'button{background:#142B3A;color:white;border:0;border-radius:24px;padding:12px 20px;margin-top:16px}'
        '</style></head><body><main><h1>%s</h1><p>Référence : %s</p>'
        '<table>%s</table>%s</main></body></html>'
        % (e(proposition.get("titre")), e(demande["reference"]), lignes, action)
    )


def panneau_emails(demande):
    libelles = {
        "NON_PLANIFIE": "Non planifié", "EN_ATTENTE": "En attente du service emails",
        "EN_COURS": "Envoi en cours", "ACCEPTE_SMTP": "Accepté par le service email",
        "NON_CONFIGURE": "Configuration email absente", "ECHEC": "Envoi échoué",
        "INCERTAIN": "Résultat incertain : vérifier la boîte du client", "ILLISIBLE": "État illisible"
    }
    reference = demande.get("reference", "")
    types = [("reception", "Accusé de réception")]
    if demande.get("statut") in ("PROPOSITION_VALIDEE", "PROPOSITION_ACCEPTEE"):
        types.append(("proposition", "Email de proposition"))
    contenu = '<div style="background:#F8F6F2;color:#142B3A;padding:12px;margin:12px 0"><b>Notifications email</b>'
    for type_email, titre in types:
        etat = notifications.etat(reference, type_email)
        statut_email = etat.get("statut", "NON_PLANIFIE")
        contenu += '<p>%s : <strong>%s</strong>%s</p>' % (
            e(titre), e(libelles.get(statut_email, statut_email)),
            " (destinataire de test configuré)" if etat.get("test") else ""
        )
        if statut_email in ("NON_PLANIFIE", "ECHEC", "NON_CONFIGURE"):
            contenu += (
                '<form method="post" action="/demandes/reessayer-email">'
                '<input type="hidden" name="reference" value="%s">'
                '<input type="hidden" name="jeton" value="%s">'
                '<input type="hidden" name="type_email" value="%s">'
                '<button type="submit">Planifier / réessayer : %s</button></form>'
                % (e(reference), e(JETON_FORMULAIRE), e(type_email), e(titre)))
        if statut_email in ("INCERTAIN", "EN_COURS"):
            contenu += '<p>Ne pas relancer à l’aveugle : vérifier la réception avant toute intervention.</p>'
    return contenu + '</div>'


def programme_accepte(demande):
    instantane = demande.get("programmeAccepte")
    if not isinstance(instantane, dict) or not isinstance(instantane.get("contenu"), dict):
        return ""
    p = instantane["contenu"]
    morceaux = ["<section><h2>Programme accepté par le client</h2>",
                "<p>Version %s — validation client : %s</p>" % (e(instantane.get("version")), e(instantane.get("valideLe"))),
                "<p>Suggestions et estimation indicatives, sans disponibilité vérifiée ni réservation confirmée. Cette validation client ne vaut pas validation commerciale du conseiller.</p>",
                "<h3>%s</h3><p>%s</p>" % (e(p.get("titre")), e(p.get("resume")))]
    for jour in p.get("itineraire", []):
        morceaux.append("<h3>Jour %s — %s</h3>" % (e(jour.get("jour")), e(jour.get("titre"))))
        for etape in jour.get("etapes", []):
            morceaux.append("<h4>%s</h4><ul>%s</ul>" % (e(etape.get("lieu")), "".join("<li>%s</li>" % e(a) for a in etape.get("activites", []))))
    budget = p.get("budget", {})
    morceaux.append("<h3>Estimation indicative totale</h3><p>%s – %s %s</p>" % (e(budget.get("minimum")), e(budget.get("maximum")), e(budget.get("devise"))))
    for titre, valeurs in [("Suggestions de transport", p.get("transports", [])), ("Suggestions d’hébergement", p.get("hebergements", [])), ("Hypothèses", budget.get("hypotheses", [])), ("Informations manquantes", p.get("informationsManquantes", [])), ("Incohérences et points à vérifier", p.get("pointsAVerifier", []))]:
        morceaux.append("<h3>%s</h3><ul>%s</ul>" % (e(titre), "".join("<li>%s</li>" % e(v) for v in valeurs)))
    morceaux.append("</section>")
    return "".join(morceaux)

def demandes_voyage():
    dossier = dossier_demandes()
    demandes = []
    erreurs = 0
    try:
        noms = os.listdir(dossier)
    except FileNotFoundError:
        noms = []
    except OSError:
        return page(
            "Demandes de voyage",
            "",
            err="Impossible de lire le dossier des demandes."
        )
    for nom in noms:
        if not nom.endswith(".json"):
            continue
        try:
            with open(os.path.join(dossier, nom), encoding="utf-8") as fichier:
                demande = json.load(fichier)
            if (
                not isinstance(demande, dict)
                or not isinstance(demande.get("client"), dict)
                or not isinstance(demande.get("voyage"), dict)
            ):
                raise ValueError("Structure invalide")
            demandes.append(demande)
        except (OSError, ValueError):
            erreurs += 1
    demandes.sort(
        key=lambda demande: str(demande.get("creeLe", "")),
        reverse=True
    )
    blocs = []
    for demande in demandes:
        client = demande["client"]
        voyage = demande["voyage"]
        champs = [
            ("Référence", demande.get("reference")),
            ("Reçue le", fmt_date(demande.get("creeLe"))),
            ("Statut", demande.get("statut")),
            ("Nom", client.get("nom")),
            ("Email", client.get("email")),
            ("Destination", voyage.get("destination")),
            ("Dates et durée", voyage.get("dates")),
            ("Voyageurs", voyage.get("participants")),
            ("Budget souhaité", voyage.get("budget")),
            ("Activités", voyage.get("activites")),
            ("Expérience recherchée", voyage.get("experience")),
            ("Rythme souhaité", voyage.get("rythme", "Non renseigné")),
            ("Contraintes particulières", voyage.get("contraintes", "Non renseigné")),
        ]
        styles_statut = {
            "RECUE": ("Reçue", "#D8C3A5", "#142B3A"),
            "EN_ETUDE": ("En cours d’étude", "#142B3A", "#FFFFFF"),
            "PROPOSITION_VALIDEE": ("Proposition validée", "#D8C3A5", "#142B3A"),
            "PROPOSITION_ACCEPTEE": ("Acceptée par le client", "#142B3A", "#FFFFFF"),
        }
        lignes = ""
        for titre, valeur in champs:
            contenu = e(valeur)
            if titre == "Statut":
                libelle, fond, couleur = styles_statut.get(
                    valeur,
                    (str(valeur or "Inconnu"), "#F8F6F2", "#142B3A")
                )
                contenu = (
                    '<span style="display:inline-block;padding:6px 12px;'
                    'border-radius:999px;font-weight:bold;'
                    'background:%s;color:%s">%s</span>'
                    % (fond, couleur, e(libelle))
                )
            lignes += (
                '<tr><th align="left">%s</th>'
                '<td style="white-space:pre-wrap;overflow-wrap:anywhere">'
                '%s</td></tr>'
                % (e(titre), contenu)
            )
        action = ""
        if demande.get("statut") == "RECUE":
            action = """
                <form method="post" action="/demandes/prendre-en-charge">
                <input type="hidden" name="reference" value="%s">
                <input type="hidden" name="jeton" value="%s">
                <button type="submit">Prendre en charge</button>
                </form>
                """ % (e(demande.get("reference")), e(JETON_FORMULAIRE))
        if demande.get("statut") == "EN_ETUDE":
            action += formulaire_proposition(demande)
            if demande.get("proposition", {}).get("statut") == "BROUILLON":
                action += '<p><b>Brouillon enregistré</b> — non envoyé au client.</p>'
                action += (
                    '<form method="post" action="/demandes/valider-proposition">'
                    '<input type="hidden" name="reference" value="%s">'
                    '<input type="hidden" name="jeton" value="%s">'
                    '<input type="hidden" name="version" value="%s">'
                    '<p>La validation porte sur le brouillon enregistré. '
                    'Enregistrez vos dernières modifications avant de valider.</p>'
                    '<button type="submit">Valider la proposition enregistrée</button></form>'
                    % (e(demande.get("reference")), e(JETON_FORMULAIRE),
                       e(demande["proposition"].get("modifieLe")))
                )
        if demande.get("statut") in ("PROPOSITION_VALIDEE", "PROPOSITION_ACCEPTEE"):
            lien = "/proposition?" + urllib.parse.urlencode({
                "reference": demande["reference"], "acces": demande.get("accesClient", "")
            })
            action += (
                '<p><a href="%s">Consulter la proposition côté client</a></p>'
                '<p>Lien confidentiel : son détenteur peut consulter et accepter cette offre. '
                'Consultez ci-dessous le suivi de l’email de proposition. '
                'En démonstration locale, ce lien fonctionne seulement sur cet ordinateur.</p>'
                % e(lien)
            )
        action += programme_accepte(demande)
        action += panneau_emails(demande)
        blocs.append(
            '<table border="1" cellpadding="8" cellspacing="0">'
            + lignes + "</table>" + action + "<br>"
            )
    body = (
        "<p>Demandes reçues depuis le questionnaire. "
        "Aucune réservation n’est confirmée à cette étape.</p>"
        '<p><a href="/demandes">Actualiser la liste</a></p>'
        + ("".join(blocs) if blocs else "<p>Aucune demande reçue.</p>")
    )
    avertissement = (
        "%d fichier(s) illisible(s) ou invalide(s)." % erreurs
        if erreurs else ""
    )
    return page("Demandes de voyage", body, err=avertissement)
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if urllib.parse.urlparse(self.path).path.startswith("/proposition"):
            sys.stderr.write("[%s] Page proposition client\n" % datetime.now().strftime("%H:%M:%S"))
        else:
            sys.stderr.write("[%s] %s\n" % (datetime.now().strftime("%H:%M:%S"), fmt % args))
    def send_html(self, content, status=200):
        body = content.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)
    def send_static(self, name):
        base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
        path = os.path.join(base, os.path.basename(name))
        if not os.path.isfile(path):
            return self.send_html(page("Introuvable", "<p>Page introuvable.</p>"), 404)
        types = {".css": "text/css", ".png": "image/png", ".ico": "image/x-icon"}
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", types.get(os.path.splitext(path)[1], "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)
    def send_json(self, data, status=200, extra_headers=None):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for name, value in extra_headers.items():
                self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)
    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        try:
            return json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}
    def auth_token(self):
        cookies = http.cookies.SimpleCookie()
        try:
            cookies.load(self.headers.get("Cookie", ""))
        except http.cookies.CookieError:
            return None
        cookie = cookies.get("detour_session")
        return cookie.value if cookie else None
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)
        if url.path == "/auth/me":
            auth.init_auth_db()
            manager = auth.get_session(self.auth_token())
            if not manager:
                return self.send_json({"error": "Session absente ou expirée."}, 401)
            return self.send_json({"manager": manager})
        msg = q.get("msg", [""])[0]
        err = q.get("err", [""])[0]
        if url.path == "/proposition":
            acces = q.get("acces", [""])[0]
            demande = lire_proposition_client(q.get("reference", [""])[0], acces)
            if demande is None:
                return self.send_html("<h1>Proposition introuvable ou accès invalide.</h1>", 404)
            return self.send_html(page_proposition_client(demande, acces))
        if url.path.startswith("/static/"):
            return self.send_static(url.path[len("/static/"):])
        if url.path == "/":
            return self.send_html(home())
        if url.path == "/demandes":
            return self.send_html(demandes_voyage())
        if url.path == "/catalogue":
            return self.send_html(catalogue(q))
        if url.path == "/dispo":
            return self.send_html(dispo(q))
        if url.path == "/options":
            return self.send_html(options(msg, err))
        if url.path == "/reservations":
            return self.send_html(reservations(msg, err))
        return self.send_html(page("Introuvable", "<p>Page introuvable.</p>"), 404)
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/auth/login":
            data = self.read_json()
            email = data.get("email", "")
            password = data.get("password", "")
            if not isinstance(email, str) or not isinstance(password, str):
                return self.send_json({"error": "Identifiants invalides."}, 400)
            if not email.strip() or not password:
                return self.send_json({"error": "E-mail et mot de passe obligatoires."}, 400)
            auth.init_auth_db()
            manager = auth.authenticate(email, password)
            if not manager:
                return self.send_json({"error": "Adresse e-mail ou mot de passe incorrect."}, 401)
            token = auth.create_session(manager["id"])
            cookie = http.cookies.SimpleCookie()
            cookie["detour_session"] = token
            cookie["detour_session"]["httponly"] = True
            cookie["detour_session"]["samesite"] = "Lax"
            cookie["detour_session"]["path"] = "/"
            cookie["detour_session"]["max-age"] = auth.SESSION_DURATION
            return self.send_json(
                {"manager": manager},
                extra_headers={"Set-Cookie": cookie.output(header="").strip()},
            )
        if path == "/auth/logout":
            auth.delete_session(self.auth_token())
            cookie = http.cookies.SimpleCookie()
            cookie["detour_session"] = ""
            cookie["detour_session"]["path"] = "/"
            cookie["detour_session"]["max-age"] = 0
            return self.send_json(
                {"message": "Déconnexion réussie."},
                extra_headers={"Set-Cookie": cookie.output(header="").strip()},
            )
        length = int(self.headers.get("Content-Length", "0") or 0)
        form = urllib.parse.parse_qs(self.rfile.read(length).decode("utf-8"))
        f = lambda k: form.get(k, [""])[0]
        if path == "/demandes/reessayer-email":
            if not secrets.compare_digest(f("jeton"), JETON_FORMULAIRE):
                return self.send_html(page("Email", "", err="Formulaire expiré. Actualisez la page."), 400)
            try:
                with open(chemin_demande(f("reference")), encoding="utf-8") as fichier:
                    demande_email = json.load(fichier)
                type_email = f("type_email")
                if type_email not in ("reception", "proposition"):
                    raise ValueError()
                if type_email == "proposition" and demande_email.get("statut") not in ("PROPOSITION_VALIDEE", "PROPOSITION_ACCEPTEE"):
                    raise ValueError()
                notifications.reessayer(f("reference"), type_email)
            except (OSError, ValueError):
                return self.send_html(page("Email", "", err="Demande ou notification invalide."), 400)
            return self.redirect("/demandes")
        if path == "/proposition/accepter":
            if f("accord") != "oui" or not accepter_proposition(f("reference"), f("acces"), f("jeton")):
                return self.send_html("<h1>Acceptation non enregistrée. Actualisez votre lien et réessayez.</h1>", 400)
            return self.redirect("/proposition", reference=f("reference"), acces=f("acces"))
        if path == "/demandes/valider-proposition":
            erreur = valider_proposition(f("reference"), f("jeton"), f("version"))
            if erreur:
                return self.send_html(page("Validation impossible", '<a href="/demandes">Retour aux demandes</a>', err=erreur), 400)
            try:
                notifications.ajouter(f("reference"), "proposition")
            except (OSError, ValueError):
                return self.send_html(page("Proposition validée", '<a href="/demandes">Retour aux demandes</a>',
                                           err="Proposition conservée ; email non planifié. Réessayez depuis la liste."), 503)
            return self.redirect("/demandes")
        if path == "/demandes/proposition":
            valeurs = {cle: f(cle) for cle in ("titre", "programme", "dateDebut", "dateFin", "prixTotal", "devise")}
            erreur = enregistrer_proposition(f("reference"), f("jeton"), valeurs)
            if erreur:
                contenu = formulaire_proposition({"reference": f("reference")}, valeurs)
                return self.send_html(page("Corriger la proposition", contenu, err=erreur), 400)
            return self.redirect("/demandes")
        if path == "/demandes/prendre-en-charge":
            erreur = prendre_en_charge(f("reference"), f("jeton"))
            if erreur:
                return self.send_html(
                    page("Demandes de voyage", "", err=erreur),
                    400
                )
            return self.redirect("/demandes")
        if path == "/options":
            try:
                participants = int(f("participants"))
            except ValueError:
                participants = 0
            res, err = api("POST", "/api/v1/options",
                           body={"prestation_id": f("prestation_id"), "date": f("date"), "participants": participants})
            if err:
                return self.redirect("/options", err=err)
            return self.redirect("/options", msg="Option %s posée." % res["option"]["id"])
        if path == "/confirmer":
            res, err = api("POST", "/api/v1/reservations",
                           body={"option_id": f("option_id"), "approuve_par": f("approuve_par")}, approval=f("approval"))
            if err:
                return self.redirect("/options", err=err)
            return self.redirect("/reservations", msg="Réservation %s confirmée." % res["reservation"]["id"])
        if path == "/annuler":
            res, err = api("POST", "/api/v1/reservations/%s/annuler" % urllib.parse.quote(f("reservation_id")),
                           approval=f("approval"))
            if err:
                return self.redirect("/reservations", err=err)
            return self.redirect("/reservations", msg="Réservation %s annulée." % res["reservation"]["id"])
        return self.send_html(page("Introuvable", "<p>Page introuvable.</p>"), 404)
    def redirect(self, location, **params):
        self.send_response(303)
        self.send_header("Location", location + ("?" + urllib.parse.urlencode(params) if params else ""))
        self.end_headers()
if __name__ == "__main__":
    if not API_KEY:
        print("ATTENTION : DETOUR_API_KEY non définie.")
    print("Back-office DETOUR v%s sur http://127.0.0.1:%d (API : %s)" % (VERSION, PORT, API_URL))
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
