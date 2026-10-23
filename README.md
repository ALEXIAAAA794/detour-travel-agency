# DÉTOUR Voyages

Application de voyage composée d'un site client React, d'une interface de gestion, d'une API, d'un service d'authentification client, d'un back-office conseillers, d'un assistant IA et d'une base PostgreSQL.

## Installation locale avec Docker Desktop (Windows)

### Prérequis

- Windows 10/11 avec Docker Desktop installé et démarré (Docker Engine en mode Linux).
- Git, pour récupérer le dépôt.
- Une clé API Gemini si l'assistant IA doit répondre. Sans clé valide, les autres services peuvent démarrer, mais les réponses IA ne fonctionneront pas.

### 1. Récupérer le projet

Dans PowerShell :

```powershell
git clone https://github.com/ALEXIAAAA794/detour-travel-agency.git
Set-Location detour-travel-agency
```

Si le dépôt est déjà présent, ouvre PowerShell dans son dossier racine.

### 2. Créer les fichiers de configuration locaux

À la racine du dépôt, crée puis édite la configuration Docker :

```powershell
Copy-Item .env.docker.example .env.docker
notepad .env.docker
```

Remplace `POSTGRES_PASSWORD`, `MANAGER_API_KEY` et `JWT_SECRET` par des valeurs aléatoires propres à ta machine. Pour `POSTGRES_PASSWORD`, utilise uniquement des lettres, chiffres et `_` afin que l'URL PostgreSQL soit valide. Garde ces secrets privés et ne les ajoute jamais à Git.

Crée ensuite la configuration privée de l'assistant IA :

```powershell
Copy-Item support-ia\.env.example support-ia\.env
notepad support-ia\.env
```

Remplace `GEMINI_API_KEY` par ta clé Gemini. Le fournisseur par défaut est `gemini` ; conserve `AI_PROVIDER=gemini` pour ce choix. Ce fichier contient des valeurs d'exemple : il faut les remplacer avant d'utiliser l'assistant. Ne partage pas et ne commite pas les clés réelles.

### 3. Démarrer l'application

Vérifie que Docker Desktop est démarré, puis lance à la racine :

```powershell
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps
```

Le premier lancement construit les conteneurs et initialise la base PostgreSQL dédiée à Docker. Il peut prendre plusieurs minutes.

| Service | Adresse locale |
|---|---|
| Site client | http://localhost:5173 |
| Interface gestionnaire | http://localhost:5174 |
| API backend | http://localhost:3000 |
| Authentification client | http://localhost:4000 |

### 4. Créer un compte gestionnaire

Dans un autre terminal PowerShell, depuis la racine du dépôt :

```powershell
docker compose --env-file .env.docker run --rm --no-deps conseillers python /app/conseillers/auth.py
```

Suis les invites du terminal pour créer le compte, puis connecte-toi sur http://localhost:5174.

### Commandes pratiques

Afficher les journaux des services :

```powershell
docker compose --env-file .env.docker logs -f
```

Arrêter les services sans supprimer les données :

```powershell
docker compose --env-file .env.docker down
```

Les données PostgreSQL sont conservées dans un volume Docker nommé. **N'utilise pas `docker compose down -v` si tu veux garder les données**, car cette commande supprime les volumes. PostgreSQL est exposé localement sur le port `5433` par défaut ; si ce port est déjà utilisé, modifie `POSTGRES_HOST_PORT` dans `.env.docker`.

Cette installation est réservée au développement local. Ne réutilise pas ces commandes ou ces identifiants pour une base de production.

## Support IA

L'assistant et les préparations de voyage sont accessibles sur `/assistant`. La clé du fournisseur IA reste côté serveur dans `support-ia/.env`. Pour les tests, les diagnostics et les détails de l'intégration, consulte le [guide Support IA](support-ia/INTEGRATION.md).
