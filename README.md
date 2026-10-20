# DÉTOUR

Outils web de l'agence DÉTOUR Voyages.

## site/

Site vitrine public (www.detour-voyages.fr). HTML statique, jQuery 1.8.

```bash
cd site
python3 -m http.server 8000
```

Puis http://127.0.0.1:8000

Le formulaire de devis ouvre la messagerie du visiteur (mailto). Les demandes arrivent sur contact@detour-voyages.fr.

## conseillers/

Back-office des conseillers. Consultation du catalogue prestataires, vérification des disponibilités, pose d'options, confirmation et annulation des réservations via l'API prestataires.

Python 3.9+, aucune dépendance.

```bash
cd conseillers
DETOUR_API_URL=http://127.0.0.1:8765 DETOUR_API_KEY=xxxx python3 app.py
```

Puis http://127.0.0.1:8080

| Variable | Défaut |
|---|---|
| `DETOUR_API_URL` | `http://127.0.0.1:8765` |
| `DETOUR_API_KEY` | aucune, obligatoire |
| `PORT` | `8080` |

La clé d'approbation est demandée au conseiller à chaque confirmation ou annulation. Elle n'est pas stockée.

## brand/

Logo et visuels sources.
<<<<<<< Updated upstream
=======
bonjour tout le monde Cava ? 
>>>>>>> Stashed changes
