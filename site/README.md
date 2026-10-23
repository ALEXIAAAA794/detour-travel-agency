# DÉTOUR – version React (Vite + React Router)

## Mise en route
1. `npm ci` puis `npm run dev` pour lancer l’interface React.
2. Pour utiliser le chat, lancer aussi `npm start` dans `support-ia`. Le proxy Vite relaie `/api` vers le backend local.
3. Pour la production, `npm run build` génère l’interface servie par le backend dans `site/dist`.

La clé Gemini reste dans `support-ia/.env` et n’est jamais envoyée au navigateur.

## Chat et pré-réservation

Le bouton d’accueil « Parlons de votre projet » et le bouton « parler à Nicia » ouvrent le chat React sur `/assistant`. Depuis ce chat, « Pré-réserver ce voyage » enregistre les envies puis ouvre le formulaire de Mon espace sur `/espace/prereservation` en reprenant destination, dates exactes ou période approximative, voyageurs, budget et préférences. La période approximative est enregistrée avec la demande.

La consultation des destinations et des avis reste publique. Nicia, le formulaire de pré-réservation, Mon espace et le formulaire de rendez-vous nécessitent un compte client. Une personne non connectée est envoyée à la connexion/inscription puis revient au parcours demandé. Les pré-réservations et les demandes de rendez-vous sont stockées dans PostgreSQL et consultables par les gestionnaires dans les rubriques « Demandes de voyage » et « Demandes de rendez-vous ».

La rubrique gestionnaire utilise une passerelle de session entre l’interface React et l’API : les appels `/manager-api` passent par le service `conseillers` (port 8081), qui exige une session gestionnaire et transmet les demandes à l’API (port 3000) avec la clé privée de `backend/.env`. Ne transmettez jamais cette clé au navigateur.

L’ancien parcours de préparation reste accessible sur `/assistant/classique` aux clients connectés.

## Connexion client et gestionnaire en local

La page `/login` demande si vous êtes client ou gestionnaire. Les clients sont envoyés vers `/profile` après authentification. Les gestionnaires sont authentifiés par le service `conseillers` puis redirigés vers l’interface Vite sur `http://localhost:5174`.

- Lancer le site client depuis `site` avec `npm run dev` (port 5173).
- Copier `server/.env.example` vers `server/.env`, renseigner un secret JWT et la même `DATABASE_URL` PostgreSQL que pour le backend, puis lancer l’API client depuis `server` avec `npm start` (port 4000). Le site appelle ce service via son proxy local `/client-api`.
- Lancer le service gestionnaire depuis `conseillers` avec `py app.py` (port 8081).
- Depuis `conseillers`, exécuter `py -3 auth.py` pour créer un compte gestionnaire avec un identifiant unique et un mot de passe d’au moins 12 caractères. Le prénom saisi est renvoyé avec la session et affiché dans l’accueil de l’espace gestionnaire. Les anciens comptes reçoivent un identifiant dérivé de la partie avant `@` de leur ancienne adresse.
- Lancer l’interface gestionnaire depuis `gestionnaire` avec `npm ci` puis `npm run dev` (port 5174).
- Copier `backend/.env.example` vers `backend/.env`, renseigner `DATABASE_URL`, `MANAGER_API_KEY` et, pour les emails réels, une clé Resend et une adresse `EMAIL_FROM` vérifiée. Régler `CLIENT_APP_URL` sur l’adresse du site.
- Depuis `backend`, exécuter `npm ci`, `npm run db:deploy`, puis `npm run dev`. Les migrations rattachent les demandes au compte client, ajoutent des périodes approximatives et créent des liens de préparation expirables et révocables.
- Les comptes clients, gestionnaires et sessions de gestionnaires partagent également PostgreSQL. Au démarrage, les anciens comptes sont importés depuis `server/users.json` et `conseillers/data/gestion.db` s’ils existent ; ces fichiers restent en place jusqu’à vérification manuelle de la migration.

La confirmation de réception et le lien de préparation sont envoyés par Resend quand ses paramètres sont configurés ; sinon, l’interface indique explicitement que l’email n’a pas été envoyé. Le lien de préparation expire après 7 jours et est révoqué à la transmission au gestionnaire ou à la clôture du dossier.

Le paiement est suivi manuellement : le conseiller peut enregistrer un lien HTTPS fourni par son prestataire et marquer le paiement comme reçu. Aucun paiement n’est encaissé ni vérifié automatiquement par l’application.

L’API de demandes (port 3000), PostgreSQL (port 5432), le service comptes client (port 4000), le service gestionnaire (port 8081) et Vite gestionnaire (port 5174) doivent être démarrés pour utiliser tout le parcours. L’interface et les pages/actions du back-office vérifient une session gestionnaire côté serveur. Un compte client seul ne permet pas d’y accéder.
