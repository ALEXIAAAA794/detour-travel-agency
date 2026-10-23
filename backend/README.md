# API backend

## Demandes de pré-réservation

Le formulaire du site crée une demande avec `POST /api/travel-requests`. Elle est enregistrée dans PostgreSQL avec le statut `PENDING_REVIEW`.

L'interface du gestionnaire peut lister les demandes via `GET /api/travel-requests/manager`, avec l'en-tête `x-manager-key` égal à `MANAGER_API_KEY`. La réponse contient `{ "requests": [...] }`, triées de la plus récente à la plus ancienne. Le jeton privé d'accès du client n'est jamais inclus. La même clé protège la mise à jour du statut via `PATCH /api/travel-requests/:id/status`.

Pour envoyer une confirmation automatique au client, configurer `RESEND_API_KEY` et `EMAIL_FROM` dans `.env` avec une adresse d'expédition vérifiée chez Resend. Sans ces variables, la demande est tout de même enregistrée et le site indique que l'email n'est pas parti.

## Rendez-vous clients

`POST /api/appointments` crée une demande à partir du compte client connecté. `GET /api/appointments/mine` retourne les rendez-vous de ce compte. Les gestionnaires consultent toutes les demandes avec `GET /api/appointments/manager` et peuvent modifier leur statut avec `PATCH /api/appointments/:id/status`.

## Avis clients

`GET /api/reviews` retourne uniquement les avis approuvés. Un client connecté peut proposer un avis avec `POST /api/reviews` ; il reste en attente jusqu'à sa modération. Le gestionnaire les consulte sur `GET /api/reviews/manager` et les publie ou refuse via `PATCH /api/reviews/:id/status`.

Après avoir vérifié que `DATABASE_URL` pointe vers la base visée, appliquer les migrations avec `npm run db:deploy` depuis `backend/`.

## Environnement Docker local

Depuis la racine du dépôt, copier `.env.docker.example` vers `.env.docker`, remplacer les valeurs secrètes locales, puis démarrer Docker Desktop et lancer :

```powershell
docker compose --env-file .env.docker up --build
```

Le site client est disponible sur `http://localhost:5173` et l'interface gestionnaire sur `http://localhost:5174`. PostgreSQL est publié sur le port local `5433` pour ne pas entrer en conflit avec un PostgreSQL déjà installé sur `5432`.

Les comptes clients et gestionnaires, leurs sessions, les demandes de voyage, rendez-vous et avis sont enregistrés dans le même PostgreSQL. Au premier démarrage, le service client importe les comptes de `server/users.json` s'il existe, et le service gestionnaire importe les comptes et sessions de `conseillers/data/gestion.db` s'ils existent. Ces imports sont idempotents et les anciens fichiers ne sont pas supprimés. Le premier démarrage initialise uniquement la base PostgreSQL du service Compose à partir du schéma Prisma, puis marque son état initial comme base de développement. Les démarrages suivants appliquent les nouvelles migrations avec `prisma migrate deploy`. La base PostgreSQL locale du port 5432 et ses données ne sont pas modifiées par ce processus.

Pour créer un compte gestionnaire, ouvrir un second terminal à la racine du projet et lancer :

```powershell
docker compose --env-file .env.docker run --rm --no-deps conseillers python /app/conseillers/auth.py
```

Le premier démarrage nécessite Docker Desktop. Si le service client ne trouve pas un ancien `server/users.json` ou que le gestionnaire ne trouve pas `conseillers/data/gestion.db`, vérifier que ces fichiers existent sur l'hôte avant le premier démarrage Compose. L'import historique ne supprime et ne modifie jamais ces fichiers.

Le volume nommé PostgreSQL et le volume des demandes d'email survivent à `docker compose down`. **Ne lancez pas `docker compose down -v` si vous souhaitez conserver les données**, car cette commande supprime les volumes. Sauvegardez régulièrement PostgreSQL avec `pg_dump`. Les comptes migrés restent dans PostgreSQL ; les fichiers historiques ne sont pas supprimés. Pour activer Resend, ajouter `RESEND_API_KEY` et `EMAIL_FROM` au service `backend` dans `compose.yaml`.

Cette configuration est réservée au développement local. Les migrations des comptes sont appliquées à la base PostgreSQL dédiée du service Compose. Ne pointez pas cette procédure de démarrage sur une base de production ou une base existante non sauvegardée.
