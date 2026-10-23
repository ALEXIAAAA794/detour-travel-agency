
import hashlib
import hmac
import secrets
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "gestion.db"
SESSION_DURATION = 8 * 60 * 60  # 8 heures


def connect_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    with connect_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS managers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS manager_sessions (
                token_hash TEXT PRIMARY KEY,
                manager_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY (manager_id) REFERENCES managers(id)
                    ON DELETE CASCADE
            );
        """)


def hash_password(password, salt_hex=None):
    salt = (
        bytes.fromhex(salt_hex)
        if salt_hex
        else secrets.token_bytes(16)
    )
    hashed = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )
    return hashed.hex(), salt.hex()


def create_manager(name, email, password):
    name = name.strip()
    email = email.strip().lower()

    if not name or not email:
        raise ValueError("Le nom et l'email sont obligatoires.")
    if len(password) < 12:
        raise ValueError("Le mot de passe doit contenir au moins 12 caractères.")

    password_hash, salt = hash_password(password)

    with connect_db() as conn:
        conn.execute(
            """INSERT INTO managers
               (name, email, password_hash, password_salt, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (name, email, password_hash, salt, int(time.time())),
        )


def authenticate(email, password):
    email = email.strip().lower()

    with connect_db() as conn:
        manager = conn.execute(
            "SELECT * FROM managers WHERE email = ?",
            (email,),
        ).fetchone()

    if manager is None:
        return None

    candidate, _ = hash_password(password, manager["password_salt"])
    if not hmac.compare_digest(candidate, manager["password_hash"]):
        return None

    return {
        "id": manager["id"],
        "name": manager["name"],
        "email": manager["email"],
    }


def create_session(manager_id):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = int(time.time()) + SESSION_DURATION

    with connect_db() as conn:
        conn.execute(
            """INSERT INTO manager_sessions
               (token_hash, manager_id, expires_at)
               VALUES (?, ?, ?)""",
            (token_hash, manager_id, expires_at),
        )

    return token


def get_session(token):
    if not token:
        return None

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = int(time.time())

    with connect_db() as conn:
        row = conn.execute(
            """SELECT m.id, m.name, m.email, s.expires_at
               FROM manager_sessions s
               JOIN managers m ON m.id = s.manager_id
               WHERE s.token_hash = ?""",
            (token_hash,),
        ).fetchone()

        if row is None:
            return None

        if row["expires_at"] <= now:
            conn.execute(
                "DELETE FROM manager_sessions WHERE token_hash = ?",
                (token_hash,),
            )
            return None

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
    }


def delete_session(token):
    if not token:
        return

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with connect_db() as conn:
        conn.execute(
            "DELETE FROM manager_sessions WHERE token_hash = ?",
            (token_hash,),
        )


if __name__ == "__main__":
    import getpass

    init_auth_db()
    print("Création du compte gestionnaire DETOUR")
    name = input("Nom : ")
    email = input("Email : ")
    password = getpass.getpass("Mot de passe (12 caractères minimum) : ")
    confirm = getpass.getpass("Confirme le mot de passe : ")

    if password != confirm:
        raise SystemExit("Les mots de passe ne correspondent pas.")

    try:
        create_manager(name, email, password)
        print("Compte gestionnaire créé.")
    except sqlite3.IntegrityError:
        print("Cet email possède déjà un compte.")
    except ValueError as exc:
        print(exc)
