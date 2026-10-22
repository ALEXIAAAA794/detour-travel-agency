# API backend

## Demandes de pré-réservation

Le formulaire du site crée une demande avec `POST /api/travel-requests`. Elle est enregistrée dans PostgreSQL avec le statut `PENDING_REVIEW`.

L'interface du gestionnaire peut lister les demandes via `GET /api/travel-requests/manager`, avec l'en-tête `x-manager-key` égal à `MANAGER_API_KEY`. La réponse contient `{ "requests": [...] }`, triées de la plus récente à la plus ancienne. Le jeton privé d'accès du client n'est jamais inclus. La même clé protège la mise à jour du statut via `PATCH /api/travel-requests/:id/status`.

Pour envoyer une confirmation automatique au client, configurer `RESEND_API_KEY` et `EMAIL_FROM` dans `.env` avec une adresse d'expédition vérifiée chez Resend. Sans ces variables, la demande est tout de même enregistrée et le site indique que l'email n'est pas parti.
