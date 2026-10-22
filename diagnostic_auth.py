import sys
import getpass

sys.path.insert(0, "conseillers")
import auth

email = "berenice@gmail.com"
print("Base de donnees :", auth.DB_PATH)

with auth.connect_db() as conn:
    row = conn.execute(
        "SELECT email, password_salt, password_hash FROM managers WHERE email = ?",
        (email,)
    ).fetchone()

if row is None:
    print("DIAGNOSTIC : compte absent de cette base")
    raise SystemExit(1)

print("Compte trouve :", row["email"])
print("Hash present :", bool(row["password_hash"]))
print("Sel present :", bool(row["password_salt"]))

password = getpass.getpass("Saisis le nouveau mot de passe : ")
print("Test authentification :", "OK" if auth.authenticate(email, password) else "ECHEC")
