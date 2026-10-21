"""Vérification sur des données synthétiques, sans lire les demandes réelles."""
import importlib.util
import io
import json
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("conseillers_test", Path(__file__).resolve().parents[1] / "conseillers" / "app.py")
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
ancienne = {"reference": "ancienne", "statut": "RECUE", "client": {"nom": "Test", "email": "test@example.invalid"}, "voyage": {"destination": "Lyon"}}
recente = {**ancienne, "reference": "recente", "voyage": {"rythme": "tranquille", "contraintes": "<script>test</script>"}}
with patch.object(app.os, "listdir", return_value=["ancienne.json", "recente.json"]), patch("builtins.open", side_effect=lambda fichier, **kwargs: io.StringIO(json.dumps(ancienne if str(fichier).endswith("ancienne.json") else recente))), patch.object(app.notifications, "etat", return_value={"statut": "NON_PLANIFIE"}):
    resultat = app.demandes_voyage()
assert "Non renseigné" in resultat
assert "tranquille" in resultat
assert "&lt;script&gt;test&lt;/script&gt;" in resultat
assert "<script>test</script>" not in resultat
print("Back-office : anciennes/nouvelles demandes et échappement HTML OK")
