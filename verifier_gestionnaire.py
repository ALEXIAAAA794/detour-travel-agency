import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd() / "conseillers"))
import auth

auth.init_auth_db()
conn = auth.connect_db()
try:
    row = conn.execute(
        "SELECT id, name, email FROM managers WHERE email = ?",
        ("berenice@gmail.com",)
    ).fetchone()
    print(dict(row) if row else "Compte introuvable")
finally:
    conn.close()
