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

## Intégration sur origin/pre-dev

La branche `feature/ai-support-integration` adapte les apports de
`feature/ai-assistant` jusqu’à `6b40bf2` à l’architecture React/Vite de pre-dev.
Lire [INTEGRATION.md](INTEGRATION.md) pour la comparaison, les commandes de
vérification et les limites. L’ancienne page HTML autonome et son script DOM
ne sont pas réintroduits : `/assistant` utilise le contexte React partagé avec
le widget. `/assistant.html` reste un alias de compatibilité. Les pages de devis,
le routeur, les illustrations, les scripts Vite et le backend TypeScript/Prisma
existants sont conservés.

Après compilation du site, le serveur Express continue à servir `site/dist` et
le fallback SPA, sur `PORT` ou 3001. La variable facultative
`SUPPORT_SITE_DIST_DIR` permet de tester un build hors du dépôt sans écraser les
artefacts déjà suivis. `npm test` utilise une liste explicite de tests simulés :
le script réel historique `test-gemini.js` n’est jamais découvert ni lancé par
cette commande. `npm run test:gemini` reste un appel réel explicite existant ;
ne pas l’utiliser dans une suite automatique.

Les données `support-ia/data` et les secrets sont ignorés et n’ont pas été copiés
entre checkouts. Le nouveau checkout ne possède donc pas la configuration privée
du checkout source. Pour démarrer, fournir les variables via l’environnement
du processus ou la configuration locale autorisée, sans ajouter ces fichiers
à Git. Aucune migration automatique des données clients. Pour un déploiement
existant, conserver le dossier partagé actuel entre Express, Python et le worker
emails ; ne pas lancer deux serveurs Express sur ces données.

La FAQ (version 2) pointe désormais vers Layout.jsx, Contact.jsx et
Destinations.jsx. Les six destinations de pre-dev sont conservées. Le délai publié
sur la page React de devis est 48 h ouvrées ; l’ancienne entrée de divergence
24/48 h est remplacée par `devis-delai`, sans modifier l’historique des anciennes
conversations. Les anciens liens .html dans cet historique sont normalisés vers
les routes React à l’affichage. L’archive documentaire
[HISTORIQUE-SUPPORT-IA.md](HISTORIQUE-SUPPORT-IA.md) conserve les notes des étapes
précédentes et le diagnostic réel Gemini ; ses chemins HTML décrivent la branche
source et ne doivent pas guider le déploiement React.

## Fournisseur configurable : Gemini ou OpenRouter

`AI_PROVIDER=gemini` par défaut conserve Gemini et `GEMINI_MODEL` (défaut
`gemini-3.8-flash`). Pour sélectionner explicitement OpenRouter, configurer
localement `support-ia/.env` à partir de `.env.example` :

```dotenv
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-CLE_FICTIVE_A_REMPLACER
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

Redémarrer Express après configuration. Ne jamais préfixer ces variables par
`VITE_` ni les mettre dans le navigateur. Le fichier privé `.env` n’est pas
fourni ou modifié par cette intégration. La clé reste exclusivement dans
l’en-tête Authorization de la requête serveur OpenRouter. Les préférences,
l’historique autorisé et le programme courant sont transmis au fournisseur
explicitement sélectionné, avec les mêmes protections de préparation.

Vérification publique du catalogue le 21 octobre 2026, sans appel de génération :
le modèle `nvidia/nemotron-3-super-120b-a12b:free` présente un endpoint Nvidia
annonçant les prix prompt et completion à zéro et les paramètres
`structured_outputs` et `response_format`. **L’endpoint affichait toutefois
`status: -5` et une disponibilité récente nulle : aucun fonctionnement réel
n’est confirmé et un échec externe reste possible.** Ce choix est configurable,
sans modèle OpenRouter implicite. Le catalogue et la disponibilité évoluent.

Sources officielles consultées :
- https://openrouter.ai/api/v1/models/nvidia/nemotron-3-super-120b-a12b:free/endpoints
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/docs/guides/routing/provider-selection

Le serveur accepte seulement un identifiant explicite terminé par `:free`.
Chaque appel impose `provider.max_price` à zéro pour prompt, completion et
request, `require_parameters: true` et `allow_fallbacks: false`. Il ne demande
aucun routeur automatique, modèle de secours, crédit ou abonnement. Si aucun
endpoint gratuit compatible ne répond, l’appel échoue ; aucun remplacement par
Gemini ou un modèle payant n’est effectué. Aucun réessai automatique.

L’API utilisée est `POST https://openrouter.ai/api/v1/chat/completions`.
La génération/modification demande `response_format.type=json_schema`, strict,
avec tous les champs du programme. Le schéma local existant, les limites,
contrôles de dates, versions, concurrence et transmission restent obligatoires
après réception. Les discussions simples utilisent le même contexte sans
prétendre modifier le programme. Bornes : 16 000 jetons et 90 secondes pour un
programme, 2 000 et 60 secondes pour une discussion, enveloppe maximale 512 Ko.
Une réponse tronquée, vide, invalide ou une erreur fournisseur (y compris HTTP
200 contenant `error`) est rejetée sans écraser le programme.

Les erreurs à l’écran et diagnostics identifient Gemini ou OpenRouter. Les
journaux gardent uniquement des codes/catégories techniques autorisés, statut
HTTP et indication de réessai éventuelle ; jamais le texte brut du fournisseur,
les coordonnées, la conversation ou la clé. Le diagnostic réel historique
`npm run diagnostic:gemini` reste spécifique à Gemini et ne teste pas OpenRouter.
Le précédent blocage réel Gemini reste HTTP 503 ; il n’a pas été retesté ici.

`npm test` inclut `openrouter.test.js` : transport et emails entièrement simulés,
contrat JSON, historique, limites gratuites, refus des modèles payants et
configuration absente/inconnue sans appel, HTTP 401/402/429/503, panne, délai,
enveloppe invalide ou trop grande, JSON/schéma invalides, réponse tronquée,
conservation sur erreur, jeton, versions, concurrence, restauration,
modification et transmission répétée sans nouvel email. Les suites Gemini et
back-office existantes restent applicables. Aucun appel réel OpenRouter ou
Gemini n’est nécessaire pour ces tests.

### Diagnostic OpenRouter HTTP 404 (21 octobre 2026)

La référence client `4dc6aee5-8fb5-42e4-abef-0e7b232e4664` n’a pas été
retrouvée dans le terminal accessible. Les diagnostics sont écrits sur stdout,
pas dans un fichier applicatif : son message fournisseur exact ne peut pas
être reconstitué après coup à partir du seul statut 404. Aucun .env ou fichier
de préparation client n’a été lu pour ce diagnostic. Le modèle réellement
chargé par ce processus ne peut donc pas être affirmé rétrospectivement.

L’URL `/api/v1/chat/completions`, le format `json_schema`,
`require_parameters=true`, `allow_fallbacks=false` et les plafonds de prix nuls
correspondent à la documentation officielle. `require_parameters` exclut les
endpoints ignorant des paramètres. Les plafonds ne sont pas relâchés pour
contourner un refus. Des règles de confidentialité du compte peuvent aussi
exclure les fournisseurs ; elles ne sont jamais désactivées automatiquement.

Les GET publics officiels du catalogue et des endpoints ont confirmé :
- `nvidia/nemotron-3-super-120b-a12b:free` existe. Son unique endpoint Nvidia
  annonce les prix prompt/completion à zéro et json_schema, mais `status=-5`
  et `uptime_last_30m=0`. Le modèle n’est donc pas absent ; la disponibilité
  de son endpoint constitue un blocage constaté, compatible avec le 404.
- `xingchen-agi/xing4.0-29b-a4b:free` annonce un endpoint Phala, `status=0`,
  `uptime_last_30m=100`, prix prompt/completion à zéro, `max_tokens`,
  `response_format`, `structured_outputs`, limite de sortie 235929 supérieure
  aux 16000 demandés. C’est désormais le modèle de `.env.example`.
- Un autre endpoint gratuit (Liquid) annonce une sortie limitée à 8192 :
  il n’a pas été choisi pour notre requête de 16000 jetons.

Sources publiques (consultées sans clé ni appel de génération) :
https://openrouter.ai/api/v1/models
https://openrouter.ai/api/v1/models/xingchen-agi/xing4.0-29b-a4b:free/endpoints
https://openrouter.ai/api/v1/models/nvidia/nemotron-3-super-120b-a12b:free/endpoints
https://openrouter.ai/docs/guides/routing/provider-selection
https://openrouter.ai/docs/guides/features/structured-outputs
https://openrouter.ai/docs/api/reference/errors-and-debugging

Le schéma structuré reste demandé : il existe un endpoint annoncé compatible.
La validation backend demeure obligatoire et inchangée ; aucune dégradation
silencieuse en texte libre ni nouvel essai automatique. L’accès effectif avec
le compte, sa politique et ses quotas reste à confirmer lors d’un unique essai
manuel ultérieur. Le catalogue ne garantit ni l’accès ni une réponse valide.
Pour cet essai, régler uniquement la configuration locale, puis redémarrer
Express et cliquer une fois sur la génération :

```dotenv
OPENROUTER_MODEL=xingchen-agi/xing4.0-29b-a4b:free
```

La configuration privée n’est pas modifiée par le correctif. Gemini reste
inchangé et aucun fournisseur/modèle de secours n’est activé.

Le diagnostic distingue désormais `MODEL_NOT_FOUND` (identifiant refusé),
`NO_COMPATIBLE_ENDPOINT` (aucun endpoint satisfaisant le routage) et
`NO_ENDPOINT_POLICY` (filtrage par politique). Un 404 inconnu reste
`UNCLASSIFIED`, sans présumer sa cause. Ces catégories viennent de motifs
techniques connus ; jamais du message brut recopié. Elles sont affichées sous
forme d’explications fixes et journalisées avec le modèle gratuit demandé,
le format et le verrou de prix nul, sans clé, token ou conversation.
Les tests simulés couvrent ces variantes, la non-divulgation de metadata.raw,
et la conservation intégrale du programme lors du 404.


### Diagnostics privés persistants et quota OpenRouter (429)

Les nouveaux événements de programme sont conservés dans
`support-ia/private-diagnostics/diagnostics.jsonl` et une archive `.1`.
Chaque fichier est limité à 512 Kio (deux fichiers au maximum, environ 1 Mio
au total) ; la rotation élimine uniquement la plus ancienne archive technique.
Les événements sont horodatés UTC et recherchables par référence après
redémarrage. La référence d’un ancien événement non enregistré ne peut pas
être reconstruite. Aucune ancienne conversation n’est relue ou importée.

Ce dossier est ignoré par Git et n’est pas servi par Express (qui sert
uniquement le build du site). Permissions 0700/0600 sous POSIX ; sous Windows,
héritage retiré et ACL attribuée à l’utilisateur du processus et à SYSTEM.
Un échec de permissions/écriture est annoncé par un message fixe, sans bloquer
ni prétendre avoir journalisé l’événement. Le dossier peut être défini par
`SUPPORT_DIAGNOSTICS_DIR` : choisir un emplacement privé, hors du site public.
Un seul processus Express doit écrire dans ce dossier. Les tests isolent
leurs journaux dans des dossiers temporaires, sans polluer le journal réel.

Les champs autorisés comprennent les codes et catégories techniques, modèle
`:free`, format demandé, statut HTTP, durée, date UTC, un message expurgé
construit à partir d’une formulation technique fixe, `Retry-After` en secondes
ou date HTTP normalisée, `X-RateLimit-Limit/Remaining/Reset` numériques ou date
ISO pour Reset, et les métadonnées documentées : `limit_source`, `scope`,
`resets_at`, `error_type`, codes amont de limitation connus, `reason` connue,
`limit_usd` et `spend_usd`. Les énumérations, nombres et dates sont revalidés à
l’écriture. Le reset numérique reste brut : son unité n’est pas présumée.
Aucun corps brut, message libre, metadata.raw, nom de client/fournisseur non
contrôlé, identifiant de compte, clé, jeton ou conversation n’est enregistré.
Un 429 sans précision est maintenant `HTTP_429_UNSPECIFIED`, distinct d’une
limite quotidienne signalée, d’un débit temporaire ou d’une limite amont.

Depuis `C:\Users\DELL1\detour-travel-agency-integration\support-ia` :

```powershell
npm run diagnostic:openrouter
```

Node charge la clé par `--env-file=.env` sans en afficher le contenu. La commande
fait exactement un `GET https://openrouter.ai/api/v1/key`, délai 20 secondes,
réponse bornée à 64 Kio, redirections et réessais désactivés. Elle ne charge
ni préparations, ni demandes, ni conversations et n’importe aucun module de
génération. La sortie sélectionne seulement le quota gratuit quotidien,
le type gratuit du compte, le crédit restant de la clé et le budget effectif
restant avec sa période/date ; aucun label, hash ou identifiant privé.
Une information absente n’est jamais interprétée comme quota illimité.

Recherche locale sans réseau ni chargement de clé :

```powershell
npm run diagnostic:reference -- eed98e97-01b6-4b93-a861-8cefb1d9e618
```

Cette recherche ne trouve que les événements effectivement enregistrés après
activation du journal, avant leur expiration par rotation. Redémarrer Express
pour activer le nouveau collecteur, sans lancer de génération pour tester.

Vérification réelle effectuée le 21/10/2026 à 20:18:52 UTC : uniquement le GET
de quota, HTTP 200, compte gratuit, 1 requête gratuite utilisée sur 50,
49 restantes ; crédit restant de clé 1 USD et budget effectif restant 1 USD,
sans date de réinitialisation annoncée. Cela exclut un épuisement quotidien
**à cet instant**, sans prouver rétrospectivement la cause du 429 fourni.
Une limite courte de plateforme ou de fournisseur reste possible. Aucun
changement de modèle ni activation payante et aucune génération réelle.
Le précédent journal UNCLASSIFIED ne permet pas de reconstruire son
Retry-After ou ses en-têtes disparus ; aucune échéance d’attente certaine.

Interprétation : quota quotidien restant à zéro => attendre la prochaine
journée UTC, sans chercher à le contourner par un autre modèle ; quota restant
positif => comparer l’événement conservé et son Retry-After, X-RateLimit-Reset,
metadata de quota. Un quota disponible seul ne prouve pas une limite amont.
Budget épuisé => examiner le réglage correspondant sans achat automatique ;
un budget de crédit n’établit pas à lui seul la cause d’un 429 gratuit.

Sources officielles :
https://openrouter.ai/docs/api/reference/limits
https://openrouter.ai/docs/api/reference/errors-and-debugging

`npm test` inclut `quota-diagnostic.test.js` : secondes et dates HTTP,
métadonnées et en-têtes malveillants, messages expurgés, persistance dans un
nouveau processus, rotation bornée, échec de stockage non bloquant,
API quota simulée, erreur HTTP/panne/clé absente, champs manquants et analyse
prudente du compte. Aucun appel de génération n’est effectué par ces tests.


### Vérification de bout en bout du 21 octobre 2026 — FONCTIONNEL pour un programme court

Le checkout utilisé est `C:\Users\DELL1\detour-travel-agency-integration`,
branche `feature/ai-support-integration`. Cette vérification complète les
constats historiques ci-dessus ; elle ne constitue pas une garantie de
 disponibilité future des modèles gratuits.

Configuration effective chargée par Node sans affichage de la clé :
`AI_PROVIDER=openrouter`, `OPENROUTER_MODEL=xingchen-agi/xing4.0-29b-a4b:free`.
L’URL est `/api/v1/chat/completions`, schéma complet `json_schema` strict,
`require_parameters=true`, `allow_fallbacks=false`, prix prompt/completion/request
plafonnés à zéro. Le schéma demande tous les champs et interdit les propriétés
supplémentaires ; la validation métier locale reste obligatoire. Le dernier
429 conservé (référence 8cb9d0a4-3d06-4b55-8c40-ceefbcb9e640) ne contient aucun
délai ou reset exploitable.

Les GET publics officiels ont annoncé Xing/Phala actif, gratuit, compatible
`response_format`/`structured_outputs`, limite 235929. Liquid a annoncé son
endpoint actif, disponibilité 100 % récente, prix prompt/completion nuls,
`response_format`/`structured_outputs`, limite de sortie 8192. Aucun
changement de politique de confidentialité du compte ni suppression des
contraintes de prix/routage n’a été effectué.

| Type | Requête | Résultat réellement observé |
| --- | --- | --- |
| Réel, sans génération | GET /api/v1/key, 20:34:23 UTC | HTTP 200, 1/50 requête utilisée, 49 restantes, crédit de clé et budget effectif restants 1 USD |
| Réel, génération 1 | Xing, petit JSON strict, 512 jetons maximum | HTTP 429, 1296 ms, portée non précisée, aucun Retry-After/reset exploitable |
| Réel, génération 2 | Xing, même petit JSON sans schéma fournisseur, 512 maximum | HTTP 429, 1303 ms, même absence de précision exploitable |
| Réel, génération 3 | Liquid LFM 2.5 2.6B gratuit, petit JSON strict, 512 maximum | HTTP 200, 1059 ms, finish_reason stop, objet exactement valide |
| Réel, génération 4 | Routes Express : création, préférences fictives, programme court avec Liquid, schéma complet strict, 8192 maximum | Fournisseur et intégration HTTP 200, environ 27,8 s, proposition en français de 2 jours à Lyon, version 1, schéma backend valide, sauvegarde puis GET identiques |
| Simulé | npm test | 19 tests ; générations et modifications valides/invalides, accès, versions/concurrence, restauration, validation client et transmission répétée sans doublon, confidentialité des diagnostics |
| Simulé / données locales fictives | python support-ia/backoffice_test.py | Anciennes/nouvelles demandes, instantané accepté et version, échappement HTML, verrou partagé et notifications sans doublon, aucun SMTP |
| Compilation | npm run build avec sortie isolée | 45 modules, compilation Vite réussie sans écraser site/dist suivi |
| Navigateur réel, données isolées | /assistant | Saisie et sauvegarde de Destination : passage question 1 vers 2 ; rechargement d’une préparation fictive contenant le programme réellement généré : récapitulatif et deux jours visibles, version 1, avertissements indicatifs, transmission désactivée sans accord |

Exactement quatre générations réelles, séquentielles, sans boucle de réessai.
Le quatrième appel a utilisé les véritables routes, protections et stockage
Express, sans préférences fournies à la route de génération comme source de
vérité. Référence : `a9c6c2cd-fbb6-4891-bbd3-9e038e835cb1`.
Les artefacts fictifs sont isolés sous
`support-ia/data/verification-reelle-zUEgL1/` (ignoré par Git), avec un résumé
`resultat-verification.json`. Aucun email ni demande conseiller créé. Pour le
navigateur, le programme réel a été copié dans une autre préparation fictive
isolée, puis restauré par l’interface avec son jeton de session ; aucun appel
IA supplémentaire n’était permis par ce serveur de test.

Correction minimale intégrée : maximum OpenRouter d’un programme ramené de
16000 à 8192, compatible avec l’endpoint Liquid vérifié. Discussion : 2000
inchangé. Schéma fournisseur strict conservé ; contrôles locaux, rejet d’une
réponse tronquée/invalide avant sauvegarde, versions et transmission inchangés.
Gemini reste disponible et conserve sa configuration et ses limites propres.
Le fichier privé .env n’a pas été modifié. Le modèle de .env.example est
actualisé avec la combinaison qui a réellement fonctionné.

Une seule ligne doit être changée dans le .env local (AI_PROVIDER est déjà
openrouter), puis redémarrer Express :

```dotenv
OPENROUTER_MODEL=liquid/lfm-2.5-2.6b:free
```

Les deux 429 de Xing, y compris sans schéma et avec 512 jetons, ne permettent
pas d’attribuer le refus au schéma strict ni au plafond initial 16000. Le quota
quotidien était disponible. La portée exacte de la limitation reste inconnue ;
le succès de Liquid prouve l’accès à cette autre combinaison gratuite, pas
l’absence de toute limitation transitoire du compte.

Limites : la modification conversationnelle et la transmission ont été
vérifiées avec fournisseurs/emails simulés, pas par de nouveaux appels réels.
La qualité éditoriale n’est pas garantie par le schéma : le petit modèle a
notamment supposé un départ depuis Paris et donné un budget 0–500 EUR dans
l’exemple ; ces suggestions restent à relire, hypothèses à confirmer, prix
et disponibilités non vérifiés. Le test réel porte sur deux jours, pas sur
un itinéraire long. Un programme tronqué par la limite 8192 reste refusé sans
écraser la version enregistrée. Aucun modèle payant ni secours automatique.

Sources officielles consultées pendant cette session :
https://openrouter.ai/api/v1/models/xingchen-agi/xing4.0-29b-a4b:free/endpoints
https://openrouter.ai/api/v1/models/liquid/lfm-2.5-2.6b:free/endpoints
https://openrouter.ai/docs/guides/features/structured-outputs
https://openrouter.ai/docs/guides/routing/provider-selection
https://openrouter.ai/docs/api/reference/limits
