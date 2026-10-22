import html
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import http.cookies
import auth

API_URL = os.environ.get("DETOUR_API_URL", "http://127.0.0.1:8765").rstrip("/")
API_KEY = os.environ.get("DETOUR_API_KEY", "")
PORT = int(os.environ.get("PORT", "8080"))
VERSION = "1.3.2"

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


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (datetime.now().strftime("%H:%M:%S"), fmt % args))

    def send_html(self, content, status=200):
        body = content.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
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
        c = cookies.get("detour_session")
        return c.value if c else None

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)

        if url.path == "/auth/me":
            auth.init_auth_db()
            manager = auth.get_session(self.auth_token())
            if not manager:
                return self.send_json(
                    {"error": "Session absente ou expir?e."}, 401
                )
            return self.send_json({"manager": manager})

        msg = q.get("msg", [""])[0]
        err = q.get("err", [""])[0]

        if url.path.startswith("/static/"):
            return self.send_static(url.path[len("/static/"):])
        if url.path == "/":
            return self.send_html(home())
        if url.path == "/catalogue":
            return self.send_html(catalogue(q))
        if url.path == "/dispo":
            return self.send_html(dispo(q))
        if url.path == "/options":
            return self.send_html(options(msg, err))
        if url.path == "/reservations":
            return self.send_html(reservations(msg, err))

        return self.send_html(
            page("Introuvable", "<p>Page introuvable.</p>"), 404
        )

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path

        # Connexion : lire le JSON avant tout autre traitement du corps.
        if path == "/auth/login":
            data = self.read_json()
            email = data.get("email", "")
            password = data.get("password", "")

            if not isinstance(email, str) or not isinstance(password, str):
                return self.send_json({"error": "Identifiants invalides."}, 400)

            if not email.strip() or not password:
                return self.send_json(
                    {"error": "E-mail et mot de passe obligatoires."}, 400
                )

            auth.init_auth_db()
            manager = auth.authenticate(email, password)
            if not manager:
                return self.send_json(
                    {"error": "Adresse e-mail ou mot de passe incorrect."}, 401
                )

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

        # Les autres routes utilisent les formulaires HTML.
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw_body = self.rfile.read(length).decode("utf-8")
        form = urllib.parse.parse_qs(raw_body)
        f = lambda k: form.get(k, [""])[0]

        if path == "/options":
            try:
                participants = int(f("participants"))
            except ValueError:
                participants = 0

            res, err = api(
                "POST",
                "/api/v1/options",
                body={
                    "prestation_id": f("prestation_id"),
                    "date": f("date"),
                    "participants": participants,
                },
            )
            if err:
                return self.redirect("/options", err=err)
            return self.redirect(
                "/options", msg="Option %s posée." % res["option"]["id"]
            )

        if path == "/confirmer":
            res, err = api(
                "POST",
                "/api/v1/reservations",
                body={
                    "option_id": f("option_id"),
                    "approuve_par": f("approuve_par"),
                },
                approval=f("approval"),
            )
            if err:
                return self.redirect("/options", err=err)
            return self.redirect(
                "/reservations",
                msg="Réservation %s confirmée." % res["reservation"]["id"],
            )

        if path == "/annuler":
            res, err = api(
                "POST",
                "/api/v1/reservations/%s/annuler"
                % urllib.parse.quote(f("reservation_id")),
                approval=f("approval"),
            )
            if err:
                return self.redirect("/reservations", err=err)
            return self.redirect(
                "/reservations",
                msg="Réservation %s annulée." % res["reservation"]["id"],
            )

        return self.send_html(
            page("Introuvable", "<p>Page introuvable.</p>"), 404
        )
    def redirect(self, location, **params):
        self.send_response(303)
        self.send_header("Location", location + ("?" + urllib.parse.urlencode(params) if params else ""))
        self.end_headers()


if __name__ == "__main__":
    if not API_KEY:
        print("ATTENTION : DETOUR_API_KEY non définie.")
    print("Back-office DETOUR v%s sur http://127.0.0.1:%d (API : %s)" % (VERSION, PORT, API_URL))
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
