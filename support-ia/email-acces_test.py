"""Raccordement réel entre création Node et préparation MIME Python, sans SMTP ni lecture .env."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
from unittest.mock import patch

base=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("notifications_email_test",base/"notifications.py")
notifications=importlib.util.module_from_spec(spec)
spec.loader.exec_module(notifications)
reference="11111111-1111-4111-8111-111111111111"
preparation="22222222-2222-4222-8222-222222222222"
with tempfile.TemporaryDirectory(prefix="detour-email-acceptation-") as temporaire:
    root=Path(temporaire)
    env={**os.environ,"SUPPORT_EMAIL_LINKS_DIR":str(root/"liens"),"SUPPORT_EMAIL_ACCESS_DIR":str(root/"acces"),"SUPPORT_PUBLIC_URL":"https://example.invalid"}
    resultat=subprocess.run(["node","-e",f"require('./acces-email').creerLien('{reference}','{preparation}')"],cwd=base,env=env,capture_output=True,text=True)
    assert resultat.returncode==0,"Création du lien impossible"
    demandes=root/"demandes"
    demandes.mkdir()
    demande={"reference":reference,"client":{"nom":"Client fictif","email":"test@example.invalid"},"preparationId":preparation}
    (demandes/(reference+".json")).write_text(json.dumps(demande),encoding="utf-8")
    config={"SMTP_FROM":"sender@example.invalid","SUPPORT_DEMANDES_DIR":str(demandes)}
    with patch.dict(os.environ,env):
        message,_,_=notifications.preparer({"reference":reference,"type":"reception"},config)
    corps=message.get_content()
    lien=json.loads((root/"liens"/(reference+".json")).read_text(encoding="utf-8"))
    assert lien["url"] in corps
    assert lien["expireLe"] in corps
    assert "confidentiel" in corps and "expire" in corps
    assert "48 h ouvrées" in corps and "24 heures" not in corps
    assert "aucune réservation" in corps
    assert "jeton" not in (demandes/(reference+".json")).read_text(encoding="utf-8")
    print("Email MIME : lien confidentiel expirant inclus, données et file isolées, aucun SMTP")
