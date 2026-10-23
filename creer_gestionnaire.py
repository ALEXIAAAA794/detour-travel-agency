import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "conseillers"))
import auth

auth.init_auth_db()

name = input("Nom du gestionnaire : ").strip()
email = input("Adresse e-mail : ").strip()
password = getpass.getpass("Mot de passe (12 caractères minimum) : ")
confirm = getpass.getpass("Confirme le mot de passe : ")

if password != confirm:
    print("Erreur : les mots de passe ne correspondent pas.")
    sys.exit(1)

try:
    auth.create_manager(name, email, password)
    print(f"Compte créé pour {email}.")
except Exception as exc:
    print(f"Création impossible : {exc}")
    sys.exit(1)
