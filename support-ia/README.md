# DÉTOUR — Assistant IA

## État actuel

- Serveur Express accessible localement sur le port 3001.
- Route GET /api/support/health testée avec succès.
- Lecture des corps JSON configurée avec une limite de 16 Kio.
- Dépendances et fichiers secrets exclus de Git.

## Démarrage

Depuis la racine du projet, construire l’interface React :

    cd site
    npm ci
    npm run build

Dans un second terminal, depuis le dossier `support-ia` :

    npm ci
    Copy-Item .env.example .env

Ajouter une clé Gemini valide dans `.env`, puis lancer :

    npm start

Le fichier `.env` est ignoré par Git. Ne pas partager ni committer la clé.
Le serveur sert alors l’interface React construite dans `site/dist`.

Pour développer React avec rechargement automatique, lancer `npm run dev`
dans `site` et `npm start` dans `support-ia`. Le proxy Vite transmet les
requêtes `/api` au serveur local du support IA.

## Test indépendant de Gemini

Avant d’utiliser Gemini depuis l’interface, vérifier l’appel direct depuis
le dossier support-ia :

    npm run test:gemini

Ce test envoie une courte requête au modèle `gemini-3.8-flash` et affiche la
réponse reçue. Il n’utilise pas l’interface de chat. Une erreur HTTP inclut
le diagnostic renvoyé par Google pour faciliter la correction de la clé,
du modèle ou des limites de l’API.

## Vérification

Ouvrir http://127.0.0.1:3001/api/support/health

Réponse attendue :

    {"status":"ok","service":"detour-support-ia"}

## Évolutions possibles

- Réponses multilingues fondées sur la FAQ et le catalogue.
- Recueil des souhaits de voyage et validation du récapitulatif.
- Enregistrement et transmission des demandes au conseiller.
- Amélioration de l’orientation vers le contact humain.

## Réception des messages

POST /api/support/messages

Le message doit être une chaîne de 1 à 2 000 caractères après
suppression des espaces en début et fin.

Tests manuels réalisés :
- Texte entouré d’espaces : accepté et nettoyé.
- Espaces uniquement : refusés avec HTTP 400 et INVALID_MESSAGE.
- Message numérique : refusé avec HTTP 400 et INVALID_MESSAGE.
- Texte de 2 001 lettres ASCII : refusé avec HTTP 400 et INVALID_MESSAGE.

Cette route appelle Gemini après validation du message. Le test indépendant
ci-dessus permet de vérifier l’appel séparément de l’interface.

## Gestion des erreurs de réception

Tests manuels réalisés :
- JSON mal formé : HTTP 400 avec INVALID_REQUEST.
- Corps JSON supérieur à 16 Kio : HTTP 413 avec PAYLOAD_TOO_LARGE.
- Message valide après le refus : accepté sans redémarrage du serveur.

Les erreurs de réception sont renvoyées au format JSON.

## Interface de chat

Le bouton « Besoin d’aide ? » apparaît sur les pages du site React. Il envoie
les messages à `POST /api/support/messages` via le proxy Vite en développement
ou directement au backend en production.

- Interface conforme à la palette DÉTOUR.
- Messages affichés comme du texte.
- Bouton désactivé pendant la requête et réactivé ensuite.
- Message d’indisponibilité et lien de contact en cas d’échec.

Quand l’API Gemini renvoie une erreur, le chat affiche un message d’indisponibilité
et propose de contacter un conseiller.

    ## Questionnaire de voyage

- Six questions : destination, dates et durée, participants,
  budget, activités et expérience recherchée.
- Questionnaire guidé fonctionnant sans appel à Gemini.
- Récapitulatif affiché à la fin du parcours.
- Possibilité de recommencer en conservant les messages précédents.
- Brouillon conservé uniquement en mémoire dans la page :
  un rechargement l’efface.
- Aucune demande transmise ni réservation effectuée à ce stade.

## Vérification des envois

- Correction d’un gestionnaire de clic ajouté plusieurs fois.
- Après redémarrage du questionnaire, une validation produit
  un seul message de confirmation et une seule référence.

  ## Consultation par le conseiller

- Page locale : http://127.0.0.1:8080/demandes
- Lecture des demandes enregistrées par Express.
- Affichage des coordonnées, souhaits, références et statuts.
- Demandes triées de la plus récente à la plus ancienne.
- Test manuel : une demande enregistrée est visible dans le back-office.

Cette intégration nécessite que Node.js et Python accèdent au même
dossier de données. Le traitement par le conseiller reste à développer.

## Prise en charge par le conseiller

- Passage du statut RECUE à EN_ETUDE depuis le back-office.
- Statut enregistré sur disque et conservé après actualisation.
- Badge beige « Reçue » et bleu nuit « En cours d’étude ».
- Protection du formulaire par jeton et écriture via fichier temporaire.
- Cette action ne confirme aucune réservation et n’envoie aucun email.

## Proposition du conseiller

- Création et modification d’un brouillon pour une demande EN_ETUDE.
- Titre, programme, dates, prix total et devise.
- Vérification des champs, des dates et du prix côté serveur.
- Brouillon conservé après actualisation : test manuel réussi.
- Aucun envoi au client, paiement ou réservation déclenché.

## Validation et acceptation de la proposition

- Le conseiller valide le brouillon enregistré, qui devient non modifiable.
- Le client consulte la proposition via un lien confidentiel.
- Son acceptation est enregistrée et visible dans le back-office.
- Test manuel du parcours complet réussi.
- Aucun email automatique, paiement ou réservation prestataire déclenché.
- Accès par lien secret dans cette version locale, sans compte client.