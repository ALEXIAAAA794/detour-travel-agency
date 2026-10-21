# DÉTOUR — Assistant IA

## État actuel

- Serveur Express accessible localement sur le port 3001.
- Route GET /api/support/health testée avec succès.
- Lecture des corps JSON configurée avec une limite de 16 Kio.
- Dépendances et fichiers secrets exclus de Git.

## Démarrage

Depuis le dossier support-ia :

    npm ci
    node server.js

## Vérification

Ouvrir http://127.0.0.1:3001/api/support/health

Réponse attendue :

    {"status":"ok","service":"detour-support-ia"}

## Fonctionnalités à développer

- Réponses multilingues fondées sur la FAQ et le catalogue.
- Recueil des souhaits de voyage et validation du récapitulatif.
- Enregistrement et transmission des demandes au conseiller.
- Interface de chat et orientation vers le contact humain.

## Réception des messages

POST /api/support/messages

Le message doit être une chaîne de 1 à 2 000 caractères après
suppression des espaces en début et fin.

Tests manuels réalisés :
- Texte entouré d’espaces : accepté et nettoyé.
- Espaces uniquement : refusés avec HTTP 400 et INVALID_MESSAGE.
- Message numérique : refusé avec HTTP 400 et INVALID_MESSAGE.
- Texte de 2 001 lettres ASCII : refusé avec HTTP 400 et INVALID_MESSAGE.

La route interroge Gemini après validation du message. Une préparation protégée
permet de conserver les échanges et leurs préférences (voir étape 1 ci-dessous).

## Gestion des erreurs de réception

Tests manuels réalisés :
- JSON mal formé : HTTP 400 avec INVALID_REQUEST.
- Corps JSON supérieur à 16 Kio : HTTP 413 avec PAYLOAD_TOO_LARGE.
- Message valide après le refus : accepté sans redémarrage du serveur.

Les erreurs de réception sont renvoyées au format JSON.

## Interface de chat

Page accessible sur /assistant.html depuis le serveur Express.

- Interface conforme à la palette DÉTOUR.
- Messages affichés comme du texte.
- Bouton désactivé pendant la requête et réactivé ensuite.
- Message d’indisponibilité et lien de contact en cas d’échec.

Un appel direct à Gemini a réussi. Le parcours depuis le navigateur
a été testé en situation d’échec ; sa réponse IA réussie reste à vérifier.

Démarrage avec la configuration locale, depuis support-ia :

    node --env-file=.env server.js

    ## Questionnaire de voyage

- Huit questions : destination, dates et durée, participants,
  budget, activités, expérience recherchée, rythme et contraintes particulières.
- Questionnaire guidé fonctionnant sans appel à Gemini.
- Récapitulatif affiché à la fin du parcours.
- Possibilité de recommencer en conservant les messages précédents.
- Brouillon conservé côté serveur et restauré après rechargement dans la même session.
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

## Support IA — étape 1

Le questionnaire recueille huit préférences, dont `rythme` et `contraintes`.
« Aucune » est une réponse valide. Les nouvelles demandes exigent ces champs
(texte non vide, au plus 2 000 caractères). Les anciennes demandes restent lisibles
sans réécriture ; le back-office affiche « Non renseigné » pour les champs absents.

Les préparations et leurs discussions sont conservées en JSON dans
`support-ia/data/preparations`, hors des fichiers servis au navigateur et exclus de Git.
Les demandes transmises portent leur `preparationId`. Les emails et le traitement
conseiller continuent à utiliser les fichiers de demandes existants.

API : `POST /api/support/preparations` crée une préparation et retourne son `id`
et un `jeton` confidentiel ; `GET /api/support/preparations/:id` restaure son état ;
`PATCH /api/support/preparations/:id` enregistre `{ voyage: {...} }` (préférences
partielles autorisées). Les lectures et modifications nécessitent
`Authorization: Bearer <jeton>`. Un identifiant seul ou le jeton d’un autre client
renvoient 404. Le jeton est stocké sous forme d’empreinte SHA-256 côté serveur,
et dans `sessionStorage` côté navigateur, jamais dans les URL ni les demandes.
`POST /api/support/messages` accepte `preparationId` et ce même en-tête ;
les anciens appels sans préparation restent utilisables sans mémoire.
La transmission d’une demande avec `preparationId` vérifie également le jeton.

Le navigateur restaure les échanges et reprend le questionnaire après rechargement.
Recommencer crée une nouvelle préparation et conserve les anciennes données serveur.
Les corrections du récapitulatif sont sauvegardées à la validation du champ,
puis à nouveau avant tout appel IA ou transmission de la demande.
Les réponses IA réussies et les changements de préférences alimentent l’historique ;
un échec IA ne crée pas de réponse fictive. Gemini reçoit les préférences actuelles
et les 40 derniers messages. L’historique est limité à 200 messages par préparation.

Configurer `GEMINI_MODEL` dans l’environnement du serveur ; sans configuration,
le modèle reste `gemini-3.8-flash`. Aucun changement du fichier `.env` n’est nécessaire.

Vérifications sans service payant : `npm test` depuis `support-ia`, puis
`python backoffice_test.py`. Gemini et la planification des emails sont simulés,
les fichiers de test sont créés dans des dossiers temporaires distincts ; aucune
demande réelle ni configuration privée n’est lue par ces tests.

Limites : accès client par possession du jeton, sans compte ni récupération après
fermeture de la session du navigateur. Toute personne possédant le jeton peut lire
la préparation ; ne pas le partager. Déploiement distant : HTTPS et contrôle d’accès
infrastructure requis. Le back-office conserve son accès local existant et ne reçoit
pas de nouvelle route de lecture des discussions. Le stockage et le verrouillage
sont prévus pour un seul processus Express ; une politique de conservation, des
quotas et une coordination multiprocessus restent à prévoir avant ouverture publique.
La limite HTTP existante de 16 Kio continue à s’appliquer à l’ensemble du JSON.
Les dossiers de test peuvent être redirigés via `SUPPORT_PREPARATIONS_DIR` et
`SUPPORT_DEMANDES_DIR` (en production conserver le dossier partagé avec Python).


### Démarrage du questionnaire et restauration

Le clic sur « Personnaliser mon voyage » affiche immédiatement la première question,
sans attendre la création serveur. Sans accès mémorisé, aucune requête de restauration
n’est lancée au chargement. Une restauration en cours ne bloque pas ce bouton ;
sa réponse tardive ne peut pas remplacer un nouveau questionnaire. Les opérations de
préparation ont un délai de huit secondes. Si la sauvegarde échoue, le questionnaire
continue dans la page avec un avertissement ; garder la page ouverte jusqu’à la reprise
de la sauvegarde. L’envoi de la demande nécessite toujours la sauvegarde serveur.
Aucune ancienne préparation n’est supprimée en cas d’échec ou de redémarrage.

Si `/api/support/preparations` renvoie 404 alors que `/assistant.html` fonctionne,
relancer le serveur Express depuis `support-ia` : un processus lancé avant la mise
à jour sert le nouveau JavaScript statique mais ne charge pas les nouvelles routes.
Le serveur HTML statique sur le port 8000 ne fournit pas ces routes : ouvrir la page
via Express sur le port 3001. Recharger ensuite la page du navigateur.

Tests du démarrage et de la restauration sans réseau ni IA :
`node --test assistant.test.js` depuis `support-ia`.


## Support IA — étape 2 : programme indicatif

Dans le récapitulatif, « Générer mon programme » sauvegarde les corrections puis
appelle `POST /api/support/preparations/:id/programme` avec
`Authorization: Bearer <jeton>` et `{ "versionAttendue": 0 }` pour le premier
programme (ensuite le numéro actuellement affiché). Le backend relit exclusivement
les préférences enregistrées : aucune préférence fournie à cette route ne sert
à générer le programme. Aucun email ni demande conseiller n’est créé par cette action.

Structure `programme.contenu` : `statut` (`proposition` ou `precisions`), `titre`,
`resume`, `itineraire` (jours numérotés, titres, étapes avec lieu et activités),
`transports`, `hebergements`, `budget` (`minimum`, `maximum`, `devise`, `hypotheses`),
`informationsManquantes` et `pointsAVerifier`. Validation effective des types,
longueurs, nombres, bornes budgétaires, ordre des jours et tailles de listes ;
les champs supplémentaires sont exclus par liste blanche. Maximum 30 jours,
10 étapes/jour, 10 activités/étape, 30 entrées pour les autres listes. Titres/lieux
limités à 200 caractères, résumé à 3 000 et autres textes à 1 000. Budget total
indicatif entre 0 et 100 000 000, minimum <= maximum et devise de trois lettres.
Une réponse demandant des précisions doit contenir au moins une question ;
une proposition doit comporter au moins un jour. Hypothèses budgétaires obligatoires.

Les préférences indispensables absentes, les dates numériques impossibles ou
inversées (`AAAA-MM-JJ`, `JJ/MM/AAAA`, `JJ.MM.AAAA`) produisent un HTTP 422 avec
les précisions demandées. Les formulations naturelles restent confiées à Gemini,
qui reçoit la consigne de demander des précisions en cas d’ambiguïté, de respecter
la langue du client et de ne pas inventer de dates exactes. Le backend rejette aussi
les dates numériques précises inventées à partir d’une période approximative.

Le programme sauvegardé comprend `version`, `genereLe`, `empreinteVoyage` et
`contenu`. Le GET protégé restaure cette version. Le champ `programmeObsolete`
signale un changement ultérieur des préférences. Une génération réussie remplace
la version courante et incrémente son numéro ; les versions antérieures ne sont
pas archivées dans cette étape. Les anciennes préparations sans programme restent
compatibles. Une erreur IA (503), une réponse invalide (502) ou un conflit (409)
ne remplace jamais un programme sauvegardé. Après un conflit de version, recharger
la page avant de réessayer. Les informations sensibles ne sont pas journalisées.

Les boutons et champs concernés sont bloqués durant la génération. Le verrou
serveur commun aux opérations de préparation évite les générations simultanées
et les modifications pendant le calcul. La version attendue et la comparaison
finale des préférences/version empêchent l’enregistrement d’un résultat devenu
obsolète. Cette garantie reste prévue pour un seul processus Express : un déploiement
multiprocessus nécessitera une coordination partagée. Après une interruption réseau,
recharger pour récupérer une éventuelle génération terminée côté serveur.

Gemini utilise toujours `GEMINI_MODEL` (défaut inchangé), avec un délai de 90 s,
16 000 jetons de sortie maximum, une enveloppe de réponse limitée à 512 000 octets
et un JSON de programme limité à 100 000 octets. Le navigateur attend au plus 100 s.
Les suggestions, estimations et données à vérifier sont affichées exclusivement
comme du texte. Aucun catalogue, disponibilité, prix ferme ni réservation n’est
vérifié par cette étape ; la fiabilité factuelle exige un contrôle conseiller.
Les libellés de l’interface restent en français ; la langue du contenu généré est
demandée au modèle à partir des réponses et de l’historique client.

Tests : `npm test` et `python backoffice_test.py` depuis `support-ia`.
La suite `programmes.test.js` simule Gemini et utilise un stockage temporaire isolé :
JSON valide/invalide, structure invalide, dates inventées, panne, contrôle du jeton,
source serveur, persistance, versions, concurrence et réponses obsolètes.
`assistant.test.js` vérifie aussi la restauration du programme, l’affichage texte,
le verrou de double clic et la conservation du résultat en cas d’échec.
La modification conversationnelle et la transmission du programme restent à l’étape 3.


### Diagnostic d’une génération en échec

Les journaux standard du processus Express contiennent désormais une référence
aléatoire propre à l’opération, sa durée, l’étape (`appel_gemini`, `http_gemini`,
`enveloppe_json`, `extraction`, `programme_json`, `schema`, `dates`, `taille` ou
`sauvegarde`), le statut HTTP Gemini lorsqu’il existe et certains motifs de fin
comme `MAX_TOKENS`. Aucune clé, URL, jeton, identité, préférence, conversation,
réponse brute ni message d’erreur fournisseur n’est journalisé. La référence
retournée au navigateur permet de retrouver l’échec dans la console serveur.
Les journaux ne sont pas écrits dans les dossiers de données.

Un 400/404 fournisseur invite à contrôler la configuration et le nom du modèle ;
un 429 peut indiquer un quota ou une limitation ; un 5xx peut indiquer une panne
fournisseur. Un délai dépassé est distingué d’une erreur réseau. Un statut 200 ne
suffit pas : vérifier ensuite la fin de génération, l’extraction, le JSON et le schéma.
Le mode de réponse JSON est explicitement demandé à Gemini ; un encadrement
Markdown complet éventuel est retiré avant parsing, sans accepter de texte arbitraire
et sans assouplir la validation. Aucun nouvel appel automatique ni repli simulé.
Référence API : https://ai.google.dev/api/generate-content

Le bouton « Envoyer mes préférences au conseiller » conserve le parcours existant
`POST /api/support/demandes` (coordonnées + préférences), même sans programme ou
après un échec IA. Il peut planifier l’accusé de réception existant. Il n’envoie pas
le contenu du programme et ne constitue pas une validation de celui-ci. La génération
appelle uniquement la route de préparation ; la validation/transmission du programme
reste réservée à l’étape 3. Une demande déjà transmise n’est ni supprimée ni réécrite.

Pour diagnostiquer un essai réel : relancer Express avec sa configuration habituelle,
recharger la page et cliquer une seule fois sur « Générer mon programme ». Relever
le message et les lignes de console portant la référence diagnostic, sans partager
la configuration, les en-têtes ou le contenu client. Ne pas cliquer sur l’envoi des
préférences pendant cet essai.
