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
La modification conversationnelle et la transmission du programme sont décrites dans l’étape 3 ci-dessous.


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
utilise désormais l’action dédiée décrite dans l’étape 3. Une demande déjà transmise n’est ni supprimée ni réécrite.

Pour diagnostiquer un essai réel : relancer Express avec sa configuration habituelle,
recharger la page et cliquer une seule fois sur « Générer mon programme ». Relever
le message et les lignes de console portant la référence diagnostic, sans partager
la configuration, les en-têtes ou le contenu client. Ne pas cliquer sur l’envoi des
préférences pendant cet essai.


## Support IA — étape 3 : modifier, accepter et transmettre

Le formulaire de discussion pose une question et conserve l’historique ; il ne
modifie pas le programme. Une action distincte « Demander cette modification du
programme » accepte un changement en langage naturel (1 à 2 000 caractères).
Le serveur fournit à Gemini les préférences, le programme courant et l’historique
protégé, puis réutilise la validation JSON et les diagnostics de l’étape 2.
Seule une réponse valide incrémente la version et enregistre l’échange de
modification. Les erreurs, dont HTTP 503 fournisseur, conservent la version
précédente et permettent un nouvel essai manuel, sans repli simulé en production.
Une préférence modifiée rend le programme obsolète ; il faut le régénérer avant
modification ou acceptation. Aucun envoi au conseiller lors d’une modification.

Routes protégées par `Authorization: Bearer <jeton>` :

- `POST /api/support/preparations/:id/programme/modifications` :
  `{ "versionAttendue": 1, "modification": "Alléger le deuxième jour" }`.
- `POST /api/support/preparations/:id/programme/transmission` :
  `{ "versionAcceptee": 2, "accord": true, "client": { "nom": "...", "email": "..." } }`.
  Aucun programme fourni par le navigateur n’est utilisé : le serveur copie
  lui-même son programme sauvegardé et le revalide. La case d’accord est décochée
  quand le programme affiché ou son état d’obsolescence change.

L’acceptation exige une proposition valide (pas un statut `precisions`), des
préférences complètes, une version à jour, des coordonnées valides et l’accord
explicite. La demande contient `programmeAccepte` : contenu, préférences au moment
de l’accord, version, `valideLe`, `accord`, `preparationId`, `demandeReference`.
Cet instantané est indépendant de la version courante de préparation. Le
back-office affiche son itinéraire, ses suggestions, son estimation, ses hypothèses,
les informations manquantes et avertissements, ainsi que la version acceptée et
la date d’accord. Tout le contenu est échappé ; aucun jeton client n’est ajouté.
Les anciennes demandes sans programme conservent leur affichage.

Pour une préparation sans demande, la transmission crée une seule demande `RECUE`.
Si des préférences ont déjà été envoyées, le programme est ajouté à cette demande
uniquement lorsqu’elle est `RECUE` ou `EN_ETUDE` avec, éventuellement, une proposition
`BROUILLON`. Les champs existants, statuts et travaux du conseiller ne sont pas
écrasés. Les coordonnées doivent correspondre à celles de la demande existante ;
sinon HTTP 409 et contact conseiller. Plusieurs demandes déjà liées à une même
préparation produisent également un conflit, sans suppression ni fusion automatique.
Un état commercial validé/accepté refuse tout nouveau rattachement.

Un réessai de la même version acceptée retourne le même rattachement, même si
le conseiller a ensuite avancé le dossier : aucun nouvel instantané ni nouvelle
demande. La file de notifications existante, unique par demande/type `reception`,
assure l’absence de deuxième email. Après une coupure survenue après la sauvegarde,
réessayer avec la même version permet aussi de planifier l’accusé manquant.
L’écran distingue l’enregistrement de la transmission du statut réel de cet accusé.
La transmission d’une autre version après un premier accord est refusée (409) :
il faut contacter le conseiller ; aucun remplacement silencieux de l’instantané.
L’ancien envoi de préférences réutilise également une demande liée identique et
refuse de créer une autre demande si ses coordonnées/préférences diffèrent.

La validation client ne change pas le statut commercial existant et ne confirme
aucune réservation. La validation commerciale du conseiller et l’acceptation de
sa proposition restent les parcours existants, distincts de l’accord sur un
programme IA indicatif. Aucun paiement ni nouvelle authentification.

Écritures : le fichier `.ecriture.lock` dans le dossier des demandes est partagé
par Node et Python pour empêcher l’écrasement d’un travail conseiller concurrent.
Le remplacement des JSON est atomique. Node renvoie un conflit ou une erreur
réessayable si le dossier est occupé ; Python attend au plus huit secondes.
Relancer les DEUX serveurs après mise à jour pour activer ce verrou partout.
`SUPPORT_DEMANDES_DIR`, si utilisé, doit désigner le même dossier dans Node et
Python ; sans cette variable, les chemins par défaut restent inchangés. Les
notifications conservent leur chemin habituel : en production garder le dossier
de données par défaut pour cette file existante.

Limites réelles : un seul processus Express pour la coordination des programmes,
stockage partagé local, accès client par possession du jeton, pas de vérification
email/identité supplémentaire. Un arrêt brutal peut laisser un verrou : faire
vérifier l’arrêt des écrivains et traiter ce verrou manuellement, sans l’effacer
automatiquement. Les versions courantes précédentes ne sont pas archivées ; seul
l’instantané accepté reste figé. La reprise client après changement ultérieur de
version nécessite de contacter le conseiller pour tout nouvel accord. La précision
factuelle et les disponibilités nécessitent toujours une vérification humaine.
L’indisponibilité réelle HTTP 503 du dernier essai Gemini n’est pas résolue ni
masquée par ces tests ; aucun appel réel n’est nécessaire pour la suite simulée.

Vérifications : depuis `support-ia`, `npm test` (Gemini et notifications simulés,
JSON temporaires isolés), puis `python backoffice_test.py` (anciennes/nouvelles
demandes synthétiques, programme échappé, verrou Python reconnu par Node).
La suite `etape3.test.js` couvre modifications valides/invalides, panne, version
périmée, accès interdit, question sans mutation, consentement et coordonnées,
concurrence, transmission répétée, programme navigateur ignoré, rattachement à
une demande en étude, conservation du brouillon, état commercial fermé et
immutabilité de l’instantané après modification. Les tests d’interface utilisent
un DOM simulé ; la présentation visuelle reste à vérifier dans le navigateur.


## Support IA — étape 4 : connaissances publiques et réponses FAQ

Périmètre reçu : le message de demande se termine après « Utiliser uniquement les
informations vérifiables ». L’implémentation couvre la base structurée, son
intégration dans les réponses et la vérification des régressions ; aucun critère
absent de la suite du message n’a été supposé.

Aucune FAQ autonome n’a été trouvée dans le dépôt. La base
`connaissances.json` contient sept entrées établies à partir des pages publiques
locales : horaires, coordonnées, destinations présentées, gratuité du devis,
délais contradictoires, caractère indicatif des tarifs et exemples de transport.
Chaque entrée possède un identifiant stable, une question, des réponses FR/EN et
une provenance (`fichier`, `extrait`, empreinte SHA-256 de l’extrait). Les sources
sont vérifiées par le serveur avant utilisation. Un extrait disparu, modifié ou
inaccessible exclut l’entrée ; sa réponse n’est pas utilisée. La liste des fichiers
lisibles est fermée à `site/contact.html`, `site/destinations.html` et
`site/js/assistant.js`, ce dernier pour le délai de confirmation affiché au client.
Aucun fichier `.env`, dossier de données, conversation ou document privé ne sert
à construire cette base. Ajouter une source impose une modification du code de
liste blanche, de la base et des tests, jamais un chemin fourni par le client.

La vérification porte sur ce que publient les fichiers du dépôt, pas sur
l’actualité ou la validité extérieure des coordonnées, horaires et offres :
le site comporte notamment un pied de page ancien et une licence explicitement
fictive. Les réponses précisent cette limite. Les prix historiques numériques,
noms de prestataires, actualités, témoignages et promesses de réservation ne sont
pas présentés comme des faits commerciaux actuels. Les CGV sont un lien vide ;
aucune règle d’annulation, remboursement, assurance, paiement ou formalité n’a été
inventée. Le délai du formulaire public (48 h ouvrées) et celui de l’assistant
(24 h maximum) divergent : la réponse expose cette divergence et demande
confirmation au conseiller, sans corriger arbitrairement les parcours existants.

`POST /api/support/messages` conserve son contrat et sa protection par jeton
lorsqu’une préparation est fournie. Les questions reconnues sur la FAQ reçoivent
une réponse déterministe (`reply.type = "faq"`), sans appel Gemini, avec
`baseVersion`, `sources` (identifiant, titre, URL publique autorisée) et
`informationsManquantes`. Les informations manquantes ou politiques non documentées
sont signalées et orientées vers Contact. Il s’agit d’une réponse métier fondée
sur les fichiers, jamais d’une fausse réponse IA simulée. Le serveur conserve
ces références avec la réponse dans l’historique protégé ; elles sont restaurées
et affichées sous forme de liens locaux sûrs. Les anciens messages sans sources
restent compatibles. Aucun programme ni aucune demande n’est créé par une FAQ.

La reconnaissance est lexicale, avec normalisation des accents et quelques
formulations françaises/anglaises ; elle ne constitue pas une recherche sémantique
exhaustive. Les traductions anglaises reprennent uniquement les mêmes faits.
Les autres demandes conservent le parcours Gemini existant (`type = conversation`).
Le contexte système de Gemini reçoit les entrées vérifiées et l’instruction de
ne pas inventer de faits DÉTOUR absents de la base. Les suggestions générales
restent des contenus générés à vérifier ; leurs références ne sont pas attribuées
artificiellement à la FAQ. L’indisponibilité externe Gemini HTTP 503 reste possible
pour ce parcours et les programmes ; aucun basculement vers une simulation en
fonctionnement normal. La FAQ factuelle reste utilisable sans clé ni appel IA.

Vérifications : `npm test` puis `python backoffice_test.py` depuis `support-ia`.
`connaissances.test.js` contrôle chaque provenance réelle, les identifiants, le
refus des chemins privés et des extraits périmés, les réponses FR/EN, les données
absentes, le délai contradictoire, les tentatives de faire inventer une politique,
les sources persistantes, le contrôle d’accès et l’absence d’appel IA ou d’envoi
de demande pour une FAQ. Le parcours Gemini est testé avec une réponse simulée.
`assistant.test.js` vérifie aussi les sources restaurées, l’affichage texte et le
rejet des URL non autorisées. Les suites des étapes 1 à 3 et du back-office restent
dans la vérification globale, sans appel payant ni envoi SMTP.

Pour actualiser une entrée, vérifier le nouveau contenu public, adapter la réponse
et son extrait/empreinte, puis exécuter les tests. Relancer Express après modification
des fichiers de code ou de la base JSON. Une vérification dans un navigateur reste
nécessaire pour l’aspect visuel ; les tests d’interface utilisent un DOM simulé.


## Diagnostic réel du blocage Gemini — 21 octobre 2026

Périmètre : diagnostic de la configuration existante, sans reprendre les quatre
étapes ni lire/écrire leurs données. Les variables privées ont été chargées dans
le processus Node avec `--env-file=.env` sans afficher leur contenu et sans modifier
le fichier. Aucun identifiant client, historique, préparation ou demande n’a été
utilisé. Aucun abonnement, crédit ou service supplémentaire n’a été activé.

Vérification documentaire Google effectuée le 21/10/2026 :

- Modèles et méthodes : https://ai.google.dev/api/models
- Endpoint et paramètres : https://ai.google.dev/api/generate-content
- Catalogue actuel : https://ai.google.dev/gemini-api/docs/models
- Modèle alternatif : https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- Interprétation des erreurs : https://ai.google.dev/gemini-api/docs/troubleshooting

L’endpoint REST `https://generativelanguage.googleapis.com/v1beta/models/{modele}:generateContent`,
l’authentification par en-tête `x-goog-api-key`, les contenus user/model et
`generationConfig.responseMimeType = application/json` sont documentés. Le modèle
par défaut `gemini-3.8-flash` est toujours répertorié par Google : il n’a pas été
supposé valide sans vérification. Le mode JSON garantit un format, pas la validité
métier ; notre validation backend reste nécessaire. La limite programme de 16 000
jetons est inférieure aux 65 536 retournés par models.list pour les deux modèles
ci-dessous. Les délais existants (60 s discussion, 90 s programme) n’expliquent
pas un refus serveur en moins de deux secondes et n’ont pas été augmentés.

Résultats réels, heures UTC :

| Opération | Modèle/paramètres | Résultat |
|---|---|---|
| 17:51:26 — GET models.list | clé existante, pageSize=1000 | HTTP 200, 183 ms, aucune page restante ; modèles generateContent listés |
| 17:51:36 — génération n°1 | gemini-3.8-flash, prompt synthétique minimal, 256 jetons max, sans MIME JSON ni contexte | HTTP 503, 1 678 ms, code 503, statut UNAVAILABLE, message technique classé MODEL_HIGH_DEMAND |
| 17:51:55 — génération n°2 | gemini-3.1-flash-lite, petit programme synthétique, application/json, 2 048 jetons max | HTTP 503, 1 228 ms, code 503, statut UNAVAILABLE, message technique classé MODEL_HIGH_DEMAND |

Les deux modèles sont retournés comme disponibles avec la clé et supportent
`generateContent` ; leurs limites d’entrée/sortie sont 1 048 576 / 65 536.
Le fournisseur signale dans les deux erreurs une forte demande/capacité insuffisante.
Aucun délai Retry-After numérique ni détail google.rpc.RetryInfo exploitable n’a
été observé par le diagnostic. Exactement DEUX appels de génération ont été faits,
sans boucle, sans nouvel essai automatique ni augmentation du délai. Aucun
programme réel n’a été généré ou sauvegardé, même synthétique : les deux échecs
HTTP surviennent avant l’extraction ou la validation JSON.

Conclusion établie : refus fournisseur de type indisponibilité/capacité, reproductible
sur un appel minimal et un deuxième modèle accessible. Le nom du modèle initial,
la taille du contexte client, le schéma de programme et le parsing local ne sont
pas la cause de ces refus reproduits. Limite : ce diagnostic ne permet pas de
distinguer une saturation générale, un routage régional ou une restriction propre
au projet. `models.list` réussi prouve la réponse de ce service avec la clé, pas
un droit/quota/fonctionnement garanti de toutes les générations. Aucun modèle
fonctionnel n’a été trouvé ; aucun changement GEMINI_MODEL n’est recommandé sur
la base d’un succès inexistant. Le défaut reste gemini-3.8-flash, configurable.
La compatibilité JSON de l’alternative est documentée mais NON validée en réel.

Changements ciblés : `gemini-http.js` centralise l’origine, normalise un éventuel
préfixe `models/` dans GEMINI_MODEL (l’ancien code l’encodait en segment invalide)
et refuse les noms mal formés. Cette correction de robustesse n’explique pas le
503 constaté, puisque la configuration effective n’avait pas ce préfixe.
Les erreurs fournisseur sont lues avec une borne de 65 536 octets ; seuls code,
statut connu, catégorie/message technique prédéfinis et délais de réessai strictement
validés sont conservés. Un message inconnu n’est pas affiché brut, pour éviter
qu’un fournisseur fasse remonter une clé, un projet, un prompt ou des coordonnées.
Les logs applicatifs reprennent uniquement les champs expurgés et une référence
diagnostic. Aucun corps complet, détail ErrorInfo ou en-tête privé n’est journalisé.

Outil autonome (ne pas le lancer en boucle) depuis `support-ia` :

    node --env-file=.env gemini-local-diagnostic.js --list

Cette commande liste uniquement les modèles. Les modes `--minimal` et `--json`
effectuent chacun UN appel réel de génération, avec données exclusivement
synthétiques, sans sauvegarde ni email, délai fixe 30 s et sortie bornée. Un override
GEMINI_MODEL dans l’environnement du processus permet un essai ciblé sans modifier
.env. La commande ne valide pas un parcours complet de production ni sa facturation.
Aucun de ces modes n’est exécuté par `npm test` ou par le serveur normal.

Vérifications locales sans nouveau coût IA : `npm test` et
`python backoffice_test.py`. Les tests `gemini-http.test.js` contrôlent le modèle,
la normalisation, la lecture bornée, la confidentialité, les erreurs non JSON,
Retry-After et RetryInfo. Les autres tests restent simulés et ne constituent pas
une preuve de disponibilité réelle.

Suite précise si les refus persistent : transmettre au support Gemini/Google AI
Studio les deux horaires UTC, modèles, paramètres synthétiques, HTTP/code 503,
statut UNAVAILABLE et catégorie forte demande, en demandant de vérifier l’accès
`generateContent` et le routage/capacité du projet. Ne pas joindre clé, .env ni
conversation. Ne pas activer de facturation ni changer de fournisseur automatiquement.
