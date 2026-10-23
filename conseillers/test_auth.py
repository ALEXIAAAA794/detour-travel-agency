import contextlib
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import auth


class ManagerAuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.connection = MagicMock()
        self.connection_context = contextlib.nullcontext(self.connection)
        self.database_patch = patch.object(
            auth, "connect_db", return_value=self.connection_context
        )
        self.database_patch.start()

    def tearDown(self):
        self.database_patch.stop()

    def test_manager_creation_normalizes_identifier_and_stores_password_hash(self):
        with patch.object(auth, "hash_password", return_value=("hash", "salt")):
            auth.create_manager(" Alice Martin ", "Agent-01", "motdepasse-test-123")

        query, values = self.connection.execute.call_args.args
        self.assertIn('INSERT INTO "ManagerAccount"', query)
        self.assertEqual(values, ("Alice Martin", "agent-01", "hash", "salt"))

    def test_manager_authentication_uses_existing_scrypt_hash(self):
        password_hash, salt = auth.hash_password("motdepasse-test-123")
        self.connection.execute.return_value.fetchone.return_value = {
            "id": 4,
            "name": "Alice Martin",
            "identifier": "agent-01",
            "passwordHash": password_hash,
            "passwordSalt": salt,
        }

        manager = auth.authenticate("AGENT-01", "motdepasse-test-123")

        self.assertEqual(manager["identifier"], "agent-01")
        self.assertEqual(manager["firstName"], "Alice")
        self.assertIsNone(auth.authenticate("agent-01", "incorrect-password"))

    def test_expired_manager_session_is_deleted(self):
        self.connection.execute.return_value.fetchone.return_value = {
            "id": 4,
            "name": "Alice Martin",
            "identifier": "agent-01",
            "expiresAt": auth.datetime.fromtimestamp(1, auth.timezone.utc),
        }

        self.assertIsNone(auth.get_session("session-token"))
        self.connection.execute.assert_any_call(
            'DELETE FROM "ManagerSession" WHERE "tokenHash" = %s',
            (auth.hashlib.sha256(b"session-token").hexdigest(),),
        )

    def test_legacy_email_generates_manager_identifier(self):
        identifier = auth._legacy_identifier(
            {"email": "Marie.Dupont@example.invalid", "identifier": None},
            {"email", "identifier"},
        )
        self.assertEqual(identifier, "marie.dupont")

    def test_legacy_manager_and_live_session_are_imported_without_changing_password_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "legacy.db"
            legacy = sqlite3.connect(database)
            legacy.executescript("""
                CREATE TABLE managers (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    identifier TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE manager_sessions (
                    token_hash TEXT PRIMARY KEY,
                    manager_id INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL
                );
            """)
            legacy.execute(
                "INSERT INTO managers VALUES (?, ?, ?, ?, ?, ?)",
                (4, "Alice Martin", "Manager-01", "existing-hash", "existing-salt", 1_700_000_000),
            )
            legacy.execute(
                "INSERT INTO manager_sessions VALUES (?, ?, ?)",
                ("session-hash", 4, int(auth.time.time()) + 3600),
            )
            legacy.commit()
            legacy.close()

            self.connection.execute.return_value.fetchone.side_effect = [
                {"id": 9},
            ]
            with patch.object(auth, "connect_db", return_value=self.connection_context):
                auth._import_legacy_database(database)

        statements = self.connection.execute.call_args_list
        account_values = statements[0].args[1]
        self.assertEqual(account_values[1:4], ("manager-01", "existing-hash", "existing-salt"))
        self.assertEqual(account_values[4], datetime.fromtimestamp(1_700_000_000, timezone.utc))
        self.assertIn('"ManagerSession"', statements[1].args[0])
        self.assertEqual(statements[1].args[1][0:2], ("session-hash", 9))

    def test_password_hash_matches_legacy_scrypt_format(self):
        password_hash, salt = auth.hash_password("motdepasse-test-123")
        self.assertEqual(len(bytes.fromhex(password_hash)), 64)
        self.assertEqual(len(bytes.fromhex(salt)), 16)
        self.assertEqual(auth.hash_password("motdepasse-test-123", salt)[0], password_hash)


if __name__ == "__main__":
    unittest.main()
