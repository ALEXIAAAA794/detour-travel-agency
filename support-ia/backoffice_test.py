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

programme = {"version": 3, "valideLe": "2027-01-01", "contenu": {"titre": "<script>programme</script>", "resume": "Résumé", "itineraire": [{"jour": 1, "titre": "Visite", "etapes": [{"lieu": "<b>Lyon</b>", "activites": ["<img src=x>"]}]}], "transports": ["train"], "hebergements": ["hôtel"], "budget": {"minimum": 100, "maximum": 200, "devise": "EUR", "hypotheses": ["2 voyageurs"]}, "informationsManquantes": ["horaires"], "pointsAVerifier": ["tarifs"]}}
rendu = app.programme_accepte({"programmeAccepte": programme, "accesClient": "secret-ne-pas-afficher"})
assert "Version 3" in rendu and "Jour 1" in rendu and "horaires" in rendu and "tarifs" in rendu
assert "&lt;script&gt;programme&lt;/script&gt;" in rendu and "<script>programme</script>" not in rendu
assert "&lt;img src=x&gt;" in rendu and "secret-ne-pas-afficher" not in rendu
assert app.programme_accepte(ancienne) == ""
print("Programme accepté : version, détail, compatibilité et échappement OK")

import tempfile
with tempfile.TemporaryDirectory(prefix="detour-verrou-test-") as dossier_test, patch.dict(app.os.environ, {"SUPPORT_DEMANDES_DIR": dossier_test}):
    chemin_verrou = Path(dossier_test) / ".ecriture.lock"
    with app.verrou_demandes():
        assert chemin_verrou.exists()
        import subprocess
        controle_node = subprocess.run(["node", "-e", "try { require('./support-ia/stockage-demandes').verrouiller(); process.exitCode = 1; } catch(e) { if (e.code !== 'EEXIST') process.exitCode = 2; }"], cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True)
        assert controle_node.returncode == 0, "Le verrou Python doit aussi bloquer Node"
        try:
            fd = app.os.open(str(chemin_verrou), app.os.O_CREAT | app.os.O_EXCL | app.os.O_WRONLY, 0o600)
        except FileExistsError:
            pass
        else:
            app.os.close(fd)
            raise AssertionError("Le verrou doit refuser une deuxième écriture")
    assert not chemin_verrou.exists()
print("Verrou partagé : exclusion et libération OK")

with tempfile.TemporaryDirectory(prefix="detour-email-idempotent-") as dossier_email, patch.object(app.notifications, "dossier", return_value=Path(dossier_email)):
    reference_email = "11111111-1111-4111-8111-111111111111"
    premier = app.notifications.ajouter(reference_email, "reception")
    second = app.notifications.ajouter(reference_email, "reception")
    assert premier == second
    assert len(list(Path(dossier_email).glob("*.json"))) == 1
print("File réelle de notifications : ajout répété sans doublon ni envoi SMTP OK")
