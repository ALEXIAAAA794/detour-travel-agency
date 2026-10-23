from pathlib import Path

p = Path("conseillers/app.py")
s = p.read_text(encoding="utf-8")

if 'url.path == "/auth/me"' in s or 'path == "/auth/login"' in s:
    raise SystemExit("Des routes auth sont déjà présentes. Arrêt sans modification.")

if "import http.cookies" not in s:
    s = s.replace(
        "from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer",
        "from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer\nimport http.cookies\nimport auth",
        1,
    )

if "import auth" not in s:
    raise SystemExit("Impossible d'ajouter l'import auth.")

helpers = '''
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

'''

marker = "    def do_GET(self):"
if marker not in s:
    raise SystemExit("Handler do_GET introuvable. Aucun changement enregistré.")

s = s.replace(marker, helpers + marker, 1)

get_marker = "        q = urllib.parse.parse_qs(url.query)"
get_route = '''
        if url.path == "/auth/me":
            auth.init_auth_db()
            manager = auth.get_session(self.auth_token())
            if not manager:
                return self.send_json({"error": "Session absente ou expirée."}, 401)
            return self.send_json({"manager": manager})
'''
if get_marker not in s:
    raise SystemExit("Emplacement de la route GET introuvable.")

s = s.replace(get_marker, get_marker + get_route, 1)

post_marker = "        path = urllib.parse.urlparse(self.path).path"
post_routes = '''
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
'''
if post_marker not in s:
    raise SystemExit("Emplacement des routes POST introuvable.")

s = s.replace(post_marker, post_marker + post_routes, 1)

Path("conseillers/app.py.before_auth").write_text(
    p.read_text(encoding="utf-8"), encoding="utf-8"
)
p.write_text(s, encoding="utf-8")
print("Routes d'authentification ajoutées.")
