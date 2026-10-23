import json
import getpass
import urllib.request
import urllib.error
import http.cookiejar

email = "berenice@gmail.com"
password = getpass.getpass("Mot de passe : ")

opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
)

req = urllib.request.Request(
    "http://127.0.0.1:8080/auth/login",
    data=json.dumps({"email": email, "password": password}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    with opener.open(req, timeout=10) as response:
        print("STATUT :", response.status)
        print("REPONSE :", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("STATUT :", e.code)
    print("REPONSE :", e.read().decode("utf-8"))
except Exception as e:
    print("ERREUR :", repr(e))
