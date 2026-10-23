import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from contextlib import closing, contextmanager
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

SESSION_DURATION = 8 * 60 * 60


def _database_url():
    value = os.environ.get("DATABASE_URL")
    if value:
        return value
    env_file = Path(__file__).resolve().parent.parent / "backend" / ".env"
    try:
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            name, separator, value = line.partition("=")
            if separator and name.strip() == "DATABASE_URL":
                return value.strip().strip("\"'")
    except OSError:
        return ""
    return ""


DATABASE_URL = _database_url()
LEGACY_DB_PATH = Path(
    os.environ.get(
        "LEGACY_MANAGER_DB_PATH",
        Path(__file__).resolve().parent / "data" / "gestion.db",
    )
)


@contextmanager
def connect_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL doit être configurée pour l'authentification gestionnaire.")
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as connection:
        yield connection


def _legacy_identifier(row, columns):
    identifier = str(row["identifier"] or "").strip() if "identifier" in columns else ""
    if not identifier and "email" in columns:
        base = (row["email"] or "gestionnaire").split("@", 1)[0].strip()
        identifier = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip(".-_").lower()
    return identifier.lower() or "gestionnaire"


def _import_legacy_database(path):
    if not path.is_file():
        return

    uri = "file:" + path.resolve().as_posix() + "?mode=ro"
    with closing(sqlite3.connect(uri, uri=True)) as legacy:
        legacy.row_factory = sqlite3.Row
        tables = {
            row["name"]
            for row in legacy.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        if "managers" not in tables:
            raise RuntimeError("La base historique gestionnaire ne contient pas la table managers.")

        columns = {
            row["name"]
            for row in legacy.execute("PRAGMA table_info(managers)").fetchall()
        }
        required = {"id", "name", "password_hash", "password_salt", "created_at"}
        if not required.issubset(columns):
            raise RuntimeError("La table historique des gestionnaires a un format inattendu.")
        managers = legacy.execute("SELECT * FROM managers ORDER BY id").fetchall()
        old_sessions = (
            legacy.execute("SELECT token_hash, manager_id, expires_at FROM manager_sessions").fetchall()
            if "manager_sessions" in tables
            else []
        )

    id_map = {}
    used_identifiers = set()
    with connect_db() as connection:
        for manager in managers:
            base = _legacy_identifier(manager, columns)
            identifier = base
            suffix = 2
            while identifier.casefold() in used_identifiers:
                identifier = "%s%d" % (base, suffix)
                suffix += 1
            used_identifiers.add(identifier.casefold())
            created_at = datetime.fromtimestamp(manager["created_at"], timezone.utc)
            result = connection.execute(
                """INSERT INTO "ManagerAccount"
                   ("name", "identifier", "passwordHash", "passwordSalt", "createdAt")
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT ("identifier") DO NOTHING
                   RETURNING "id" """,
                (
                    manager["name"],
                    identifier,
                    manager["password_hash"],
                    manager["password_salt"],
                    created_at,
                ),
            ).fetchone()
            if result is None:
                result = connection.execute(
                    'SELECT "id" FROM "ManagerAccount" WHERE "identifier" = %s',
                    (identifier,),
                ).fetchone()
            id_map[manager["id"]] = result["id"]

        now = int(time.time())
        for session in old_sessions:
            manager_id = id_map.get(session["manager_id"])
            if manager_id is None or session["expires_at"] <= now:
                continue
            connection.execute(
                """INSERT INTO "ManagerSession" ("tokenHash", "managerId", "expiresAt")
                   VALUES (%s, %s, %s)
                   ON CONFLICT ("tokenHash") DO NOTHING""",
                (
                    session["token_hash"],
                    manager_id,
                    datetime.fromtimestamp(session["expires_at"], timezone.utc),
                ),
            )

    print("Import des comptes gestionnaires historiques terminé.")


def init_auth_db(legacy_path=None):
    with connect_db() as connection:
        connection.execute("SELECT 1")
    _import_legacy_database(Path(legacy_path) if legacy_path else LEGACY_DB_PATH)


def hash_password(password, salt_hex=None):
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    hashed = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )
    return hashed.hex(), salt.hex()


def create_manager(name, identifier, password):
    name = name.strip()
    identifier = identifier.strip().lower()

    if not name or not identifier:
        raise ValueError("Le nom et l'identifiant sont obligatoires.")
    if not re.fullmatch(r"[A-Za-z0-9._-]{3,40}", identifier):
        raise ValueError(
            "L'identifiant doit contenir de 3 à 40 caractères : lettres, chiffres, point, tiret ou tiret bas."
        )
    if len(password) < 12:
        raise ValueError("Le mot de passe doit contenir au moins 12 caractères.")

    password_hash, salt = hash_password(password)
    with connect_db() as connection:
        connection.execute(
            """INSERT INTO "ManagerAccount"
               ("name", "identifier", "passwordHash", "passwordSalt")
               VALUES (%s, %s, %s, %s)""",
            (name, identifier, password_hash, salt),
        )


def manager_profile(manager):
    name = manager["name"].strip()
    first_name = name.split(maxsplit=1)[0] if name else ""
    return {
        "id": manager["id"],
        "name": name,
        "firstName": first_name,
        "identifier": manager["identifier"],
    }


def authenticate(identifier, password):
    identifier = identifier.strip().lower()
    with connect_db() as connection:
        manager = connection.execute(
            """SELECT "id", "name", "identifier", "passwordHash", "passwordSalt"
               FROM "ManagerAccount" WHERE "identifier" = %s""",
            (identifier,),
        ).fetchone()

    if manager is None:
        return None

    candidate, _ = hash_password(password, manager["passwordSalt"])
    if not hmac.compare_digest(candidate, manager["passwordHash"]):
        return None
    return manager_profile(manager)


def create_session(manager_id):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.fromtimestamp(
        int(time.time()) + SESSION_DURATION,
        timezone.utc,
    )
    with connect_db() as connection:
        connection.execute(
            """INSERT INTO "ManagerSession" ("tokenHash", "managerId", "expiresAt")
               VALUES (%s, %s, %s)""",
            (token_hash, manager_id, expires_at),
        )
    return token


def get_session(token):
    if not token:
        return None

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with connect_db() as connection:
        row = connection.execute(
            """SELECT m."id", m."name", m."identifier", s."expiresAt"
               FROM "ManagerSession" s
               JOIN "ManagerAccount" m ON m."id" = s."managerId"
               WHERE s."tokenHash" = %s""",
            (token_hash,),
        ).fetchone()

        if row is None:
            return None
        if row["expiresAt"] <= datetime.now(timezone.utc):
            connection.execute(
                'DELETE FROM "ManagerSession" WHERE "tokenHash" = %s',
                (token_hash,),
            )
            return None

    return manager_profile(row)


def delete_session(token):
    if not token:
        return

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with connect_db() as connection:
        connection.execute(
            'DELETE FROM "ManagerSession" WHERE "tokenHash" = %s',
            (token_hash,),
        )


if __name__ == "__main__":
    import getpass

    import psycopg.errors

    init_auth_db()
    print("Création du compte gestionnaire DETOUR")
    name = input("Nom : ")
    identifier = input("Identifiant (3 à 40 caractères) : ")
    password = getpass.getpass("Mot de passe (12 caractères minimum) : ")
    confirm = getpass.getpass("Confirme le mot de passe : ")

    if password != confirm:
        raise SystemExit("Les mots de passe ne correspondent pas.")

    try:
        create_manager(name, identifier, password)
        print("Compte gestionnaire créé.")
    except psycopg.errors.UniqueViolation:
        print("Cet identifiant est déjà utilisé.")
    except ValueError as exc:
        print(exc)
