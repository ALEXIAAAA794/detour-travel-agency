# DÉTOUR — Assistant IA

## Guide de revue Nicia — état courant

### Démarrer avec Groq

Dans PowerShell, depuis `C:\Users\DELL1\detour-travel-agency-integration` :

```powershell
npm --prefix site run build -- --emptyOutDir false
Set-Location support-ia
npm start
```

La page est `http://127.0.0.1:3001/assistant` (port par défaut). `npm start` charge le `.env` **serveur** du dossier `support-ia` ; les variables déjà présentes dans l’environnement du processus ont priorité. Ne pas écraser un `.env` existant. Configuration attendue, à régler localement sans versionner de clé :

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=cle_privee_a_renseigner_localement
GROQ_MODEL=openai/gpt-oss-120b
```

Aucune bascule automatique vers un autre fournisseur. Pour développer le frontend dans un second terminal à la racine : `npm --prefix site run dev` ; ouvrir l’URL annoncée par Vite suivie de `/assistant`. Le proxy `/api` cible Express sur `127.0.0.1:3001`.

### Fichiers principaux

| Fichier | Rôle |
|---|---|
| `site/src/pages/Assistant.jsx`, `site/src/styles/nicia.css` | Chat FR/EN, récapitulatif, Contact et volet Confidentialité ; collecte prénom/dates par conversation. |
| `site/src/support/SupportContext.jsx`, `client.js`, `nicia-errors.js` | État client, restauration autorisée, même tour au réessai, messages d’erreur utilisateur. |
| `support-ia/server.js`, `nicia.js`, `preparations.js` | Routes, contrôle du jeton, verrou, persistance et idempotence. |
| `support-ia/ai.js`, `ai-context.js` | Sélection explicite du fournisseur et instructions DÉTOUR. |
| `support-ia/groq.js`, `groq-schema.js` | Transport Groq et adaptation strict/nullable vers les préférences métier. |
| `support-ia/nicia-schema.js`, `nicia-preferences.js`, `dates.js`, `nicia-ton.js` | Validation stricte, ancrage, dates réelles, réponses locales et garde-fous. |
| `support-ia/nicia-historique.js`, `nicia-trace.js` | Échanges persistants et contrat de consultation protégée US8. |
| `support-ia/nicia-relais.js` | Adaptateur explicite de pré-réservation, fermé tant que non raccordé. |
| `support-ia/tests/nicia/` | Tests du dialogue, du ton, de la trace et de Groq, avec fournisseurs simulés. |

Les lecteurs HTTP de `gemini-http.js` et `openrouter-response.js` sont partagés, notamment avec Groq : leurs noms ne signifient pas qu’ils sont inutilisés. Les trois fournisseurs configurables, leurs outils de diagnostic et les routes classiques `/assistant/classique`, `/assistant/confirmation`, `/assistant.html` sont conservés. Aucune fonction partagée ne nécessitait d’extraction pour le retrait des seuls styles morts.

### Vérifier sans appel réel

```powershell
npm --prefix support-ia run test:nicia
npm --prefix support-ia test
npm --prefix site run build -- --emptyOutDir false
```

Les quatre tests propres à Nicia ont été déplacés sans retrait de cas : `nicia.test.js` (dialogue et intégrations), `nicia-ton.test.js` (ton FR/EN et erreurs), `nicia-trace.test.js` (trace et accès), `groq.test.js` (contrat fournisseur et régression française Nantes → Lille). Les tests partagés restent à la racine de `support-ia`. Les commandes `diagnostic:*` et `test:gemini` sont des outils manuels conservés, **pas** des contrôles à lancer dans cette revue : ils peuvent contacter un fournisseur. Les preuves historiques des lots sont conservées ci-dessous et dans `docs/` ; un test simulé ne prouve pas un comportement réel du modèle.

### Raccordements restant à livrer

- **Pré-réservation** : route réelle et adaptateur `nicia-preparation-v1` enregistré via `configurerRelais`, réception durable et idempotente. Bouton inactif sans ce raccordement ; aucun faux transfert humain.
- **Authentification conseiller** : brancher `authentifierConseiller`, `resoudrePrereservation`, `peutConsulter` sur l’identité et les droits métier existants. Sans adaptateurs, `GET /api/prereservations/:id/trace` reste fermé (`503 TRACE_NOT_CONNECTED`). Le jeton client ne suffit jamais.
- **Dashboard US8** : consommer le contrat et le lien métier vérifiable décrits dans `docs/nicia-trace.md`. Aucun écran gestionnaire modifié ; pas de lien de préréservation fabriqué.
- **Conservation** : durée et politique à décider par la PO. Aucune durée approuvée inventée, aucune purge ; le volet Confidentialité indique que la durée reste à définir.

### Nettoyage pour revue

Seules les règles CSS `nicia-tools` et `nicia-calendar`, y compris leurs variantes mobiles, sont retirées : aucun composant ne les utilise après suppression des deux formulaires. Aucun fichier applicatif complet supprimé, aucun contrat/API retiré. Tests déplacés et chemins/scripts/documentation mis à jour ; données, secrets, diagnostics privés, emails, gestionnaire, `node_modules` et anciens artefacts `dist` préservés. Le build actualise les artefacts sans vider `dist`. L’index Git n’est pas modifié.

## Périmètre de livraison actualisé

La décision utilisateur la plus récente prévaut sur les périmètres historiques décrits plus bas : intervenir uniquement sur l’assistant IA et son parcours client (widget, questionnaire, dates, récapitulatif, programme, erreurs, transmission des préférences ou du programme et confirmation de succès). Le backend nécessaire à l’enregistrement, à la validation et à la transmission de la préparation reste inclus. Les protections de préparation, les versions et l’idempotence sont préservées.

**Hors périmètre, code existant conservé :** emails, SMTP, back-office gestionnaire et écrans de proposition commerciale. Aucune nouvelle adaptation des dates ou de la charte sur ces surfaces. Les modifications et observations antérieures restent conservées ; elles ne constituent ni une nouvelle intervention ni une validation de ces autres lots.

**Dépendances des autres lots — non déclarées validées dans cette livraison :** création et acheminement de l’accusé, configuration/authentification SMTP, livraison et réception réelles, construction du lien email avec la bonne origine, ouverture vers le bon dossier, durée/expiration, renouvellement et contrôle d’accès du parcours email. Les essais locaux/simulés historiques sont conservés uniquement comme informations d’intégration, sans valoir recette des emails ou de leur accès. Leur réalisation et leur validation relèvent des lots responsables, sans action SMTP à mener ici.

La confirmation client prouve l’enregistrement serveur autorisé de la transmission ; elle ne prouve ni la réception d’un email, ni la lecture par un gestionnaire, ni une validation commerciale, ni une réservation. La recette du parcours IA utilise des emails neutralisés. FR/EN conservé.

## État actuel

- Serveur Express accessible localement sur le port 3001.
- Route GET /api/support/health testée avec succès.
- Lecture des corps JSON configurée avec une limite de 16 Kio.
- Dépendances et fichiers secrets exclus de Git.

## Démarrage historique (Gemini — compatibilité conservée)

Depuis la racine du projet, construire l’interface React :

    cd site
    npm ci
    npm run build

Dans un second terminal, depuis le dossier `support-ia` :

    npm ci
    if (-not (Test-Path .env)) { Copy-Item .env.example .env }

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


## Conformité #18 / #19 et contrat compatible

Voir [../docs/tests-ia.md](../docs/tests-ia.md) : 15 cas avec résultats observés,
nature simulée/réelle, grille détaillée et décisions PO. Décision utilisateur
appliquée : **français et anglais**, réponse dans la langue du client ; aucune
imposition du français. Le système expose des garde-fous locaux sur les motifs
explicitement testés, pas une garantie générale de résistance aux injections.
Aucun appel fournisseur ni email réel n’a été effectué pour cette conformité.

### Clé et contrat HTTP

`IA_API_KEY` est un alias **exclusivement serveur** de la clé du fournisseur
choisi par `AI_PROVIDER`. `GEMINI_API_KEY` / `OPENROUTER_API_KEY`, si présentes,
restent prioritaires. Aucun changement du modèle/fournisseur ni des validations
JSON existantes ; aucune variable de clé `VITE_*` à créer.

Le contrat historique `/api/support/messages` reste disponible. Compatibilité :

```http
POST /api/chat
Content-Type: application/json

{"message":"Bonjour","historique":[],"jeton":"UUID_PREPARATION.SECRET_CONFIDENTIEL"}
```

Autre forme : `jeton` contient seulement le secret et `preparationId` indique
l’UUID. L’alias impose un token valide ; `historique` est accepté mais ignoré,
les rôles système et réponses du navigateur n’étant jamais une autorité.
Les préférences et l’historique serveur du dossier autorisé alimentent le
contexte. Réponse inchangée `{reply:{role,content,...}}` ; pas de secret renvoyé.
Sans token : 401 sur l’alias, mauvais dossier/token : 404, lien expiré : 410.
Message : 1 à 2000 caractères ; corps total limité à 16 Kio.

### Liens de préparation email

L’accusé `reception` existant reçoit un lien vers `/assistant` pour une demande
liée à une préparation. Le token email est différent du token de session :
son hash et son expiration sont dans `data/acces-preparations/<uuid>/`, et le
lien brut nécessaire au worker est dans `data/liens-email/<reference>.json`.
Ces dossiers sont ignorés par Git, hors du build et non servis par Express,
permissions 0700/0600 POSIX, ACL utilisateur du processus et SYSTEM Windows.
Le back-office/demande/JSON public ne reçoivent ni token ni URL confidentielle.
L’URL transporte le secret dans le fragment ; React retire ce fragment avant
la requête et utilise Authorization. Le header Referrer-Policy est no-referrer.
Le client vérifie aussi la double initialisation React StrictMode et ne reprend
jamais une ancienne session d’un autre dossier à la place d’un lien invalide.

Configurer `SUPPORT_PUBLIC_URL` avec **l’origine du frontend** (sans chemin ni
query, HTTPS sauf localhost). En développement Vite :
`SUPPORT_PUBLIC_URL=http://localhost:5173`, et conserver le proxy `/api`.
Le défaut `http://127.0.0.1:3001` vise Express servant le build React courant.
Le serveur et le worker doivent partager `SUPPORT_EMAIL_LINKS_DIR` s’il est
personnalisé, ainsi que le dossier de demandes existant. Aucune configuration
privée n’a été lue ou modifiée ici.

Validité : `SUPPORT_EMAIL_LINK_TTL_SECONDS=86400` par défaut (24 h depuis la
mise en file), bornes 300 à 604800 s. Expiration vérifiée côté serveur pour
chaque accès protégé, pas seulement au chargement. Réponse claire 410 :
contacter `/contact` pour renouveler. Le renouvellement authentifié est un
processus à définir avec la PO/le lot conseiller ; aucun endpoint public
permettant d’envoyer un accès à une adresse arbitraire n’a été ajouté.
Les doublons conservent le lien et sa date : pas de nouvel email ni de
prolongation implicite. Les anciennes demandes sans préparation sont préservées.
La possession du lien autorise sa préparation jusqu’à expiration ; ce n’est
pas une authentification forte. Les jetons de session préexistants ne sont
pas migrés. L’accusé reprend le délai indicatif public de 48 h ouvrées, au lieu
de l’ancien texte 24 h divergent ; le moteur/file SMTP n’est pas refait.

### Limitation et interface

`SUPPORT_AI_RATE_LIMIT=20` : fenêtre fixe d’une minute, compteurs IP et
préparation, partagés entre discussion, alias et génération/modification,
y compris erreurs. 429 avec Retry-After ; aucun retry automatique. Pas de
confiance accordée à X-Forwarded-For. Compteurs mémoire bornés à 10000 clés ;
état local à un processus et réinitialisé au redémarrage. Une installation
multi-instance ou derrière un proxy partagé requiert une décision infra ;
aucune nouvelle base ni nouveau système d’authentification ajouté.

Page et widget indiquent « Vous parlez à une IA », montrent le chargement,
désactivent les actions pendant l’appel et proposent Réessayer après erreur.
Ce bouton rejoue l’action échouée ; les transmissions conservent leurs
protections de version et d’idempotence. Une discussion sans identifiant
persistant de message peut être répétée après une coupure ambiguë : aucun
réessai automatique. Le test navigateur local couvre un viewport iframe 375 px.

Tests sans secrets ni réseau fournisseur :

```powershell
npm test --prefix support-ia
python support-ia/backoffice_test.py
python support-ia/email-acces_test.py
npm --prefix site run build -- --outDir ../support-ia/data/conformite-interface-dist --emptyOutDir false
```

Les données temporaires fictives et les résultats de tests restent hors Git.
Aucune nouvelle preuve de comportement réel du fournisseur n’est revendiquée.
Les essais réels précédents restent des observations historiques documentées.

## Dates calendaires
Le questionnaire et le récapitulatif utilisent `dateDepart` et `dateRetour`, dates civiles `YYYY-MM-DD` sans conversion de fuseau. Les deux sont requises pour toute nouvelle demande complète, génération ou validation. Un brouillon peut être incomplet ; chaque date fournie doit être réelle et le retour ne peut précéder le départ. Durée inclusive : même jour = 1 jour ; 31 décembre au 1er janvier = 2 jours. Les propositions ont exactement un jour d’itinéraire par jour de cette période, limitée à 30 jours. Toute réponse invalide est rejetée avant sauvegarde.
Le texte historique `dates` est conservé et affiché sans interprétation ni migration. Deux dates précises sont demandées avant une nouvelle génération ; seules ces dates font foi pour l’IA. Elles sont conservées dans la demande et l’instantané accepté. Leur modification change l’empreinte du voyage et bloque une nouvelle transmission du programme obsolète. Un réessai idempotent d’une transmission déjà acceptée conserve son instantané.
Vérifications : `npm test` dans `support-ia`, `npm run build` dans `site`. Tests IA et emails simulés ; aucune donnée existante modifiée.

## Rebranding 2026 et confirmation des préférences

Source officielle consultée avant intégration : [charte](https://github.com/PANDORMedia/detour/blob/rebrand-2026/brand-2026/charte/index.html), branche `rebrand-2026`, commit `ee06f7f2d6b95ca5fc23749d3a0ba64f1c54cb6e`. SVG copiés sans modification : logo mono Encre (160 px, donc >= 96 px) et monogramme officiel (32 px widget, 48 px conseiller). Aucun fichier de marque requis manquant. Polices Bricolage Grotesque 600/800 et Instrument Sans 400/500/600 servies localement, licences OFL et provenance conservées dans `site/public/support-brand/` et `conseillers/static/support-brand/`. Aucun logo animé ni animation de réservation à l’envoi des préférences.

Périmètre CSS actuel : `.support-brand` pour assistant, questionnaire, programme, widget, erreurs et confirmation. Historique conservé hors périmètre : `.support-bo`, déjà présent sur la page conseiller « Demandes de voyage », ne fait plus l’objet d’adaptations dans ce lot. En-tête/pied de page propres au support ; pages des autres lots et parcours de proposition commerciale conservés. Une seule apparence claire. Titres statiques en minuscules ; noms propres et titres produits par le client/IA non transformés automatiquement.

Contrastes calculés : Encre/Craie 13,86:1 ; Encre/Ciel 10,13:1 ; Encre/Jaune 8,58:1. Écart volontaire au brief pour l’accessibilité : Ballast/Craie donne seulement 4,22:1, insuffisant pour le petit texte AA (4,5:1). Les petits textes secondaires utilisent Encre ; Ballast est réservé aux détails graphiques. Le jaune est limité à un accent par écran du support (repère assistant, monogramme widget/conseiller ou action principale de confirmation), jamais du texte jaune sur fond clair. Focus visibles Encre ; alertes repérées par Brique avec texte Encre.

### Parcours et preuve serveur

Après une réponse positive de `POST /api/support/demandes`, l’envoi des seules préférences ouvre `/assistant/confirmation`. Cette route React FR/EN ne contient ni référence ni jeton ni coordonnées dans son adresse. Elle vérifie toujours `GET /api/support/preparations/:id/confirmation-preferences` avec le jeton courant (session navigateur existante), y compris après rechargement. Le serveur utilise uniquement la demande liée à la préparation et retourne `reference`, `transmisLe`, `type: preferences` sous `Cache-Control: no-store`, sans coordonnées ni contenu du dossier.

Les nouvelles demandes de préférences portent `origineTransmission: preferences`. Absence de preuve, autre préparation, lien expiré ou panne : aucun titre de succès ; erreur et retour à la préparation proposés. Les demandes historiques non marquées restent lisibles, mais la nouvelle confirmation ne leur invente pas de preuve. Aucune migration ni donnée existante modifiée. Sans session autorisée conservée (autre navigateur, stockage effacé), revenir par le lien email expirant existant, puis consulter la préparation ; la confirmation publique seule ne donne aucun accès.

Un envoi refusé reste sur le formulaire, avec erreur et focus ; un réessai réussi navigue aussi vers la confirmation. Le verrou client empêche les doubles clics ; les protections serveur par préparation/référence et la file email idempotente restent inchangées. La confirmation ne prouve pas la réception d’un email. Aucun délai métier n’est annoncé. La validation/transmission d’une version de programme conserve son action et son résultat distincts ; elle n’ouvre pas cette confirmation de préférences. Les dates précises, versions et instantanés sont conservés.

### Vérifications réalisées (22 octobre 2026)

- `npm test --prefix support-ia` : 49 tests automatisés, incluant preuve persistante, absence de preuve, isolation, refus, doublon, restauration des dates et route de confirmation sous lien expiré. IA/emails simulés ; aucune preuve supplémentaire de disponibilité du fournisseur.
- `python support-ia/backoffice_test.py` et `python support-ia/email-acces_test.py` : rendu ancien/nouveau, échappement, dates, ressources de marque/type MIME, refus de traversée, portée du CSS et email MIME sans SMTP.
- `npm --prefix site run build -- --emptyOutDir false` : build React réussi, anciens artefacts conservés.
- Navigateur sur serveur temporaire isolé : questionnaire complet, dates 2027-12-31 / 2028-01-01 conservées ; double clic -> une demande ; confirmation après rechargement ; FR/EN ; accès direct sans session -> aucun succès ; retour à la préparation ; refus 409 -> formulaire intact ; panne 503 simulée puis bouton Réessayer -> même référence et confirmation. Focus vérifié sur titre de confirmation, zone d’erreur et actions clavier.
- Rendu desktop (1280 x 900) et mobile (390 x 844), carte, questionnaire, programme fictif explicitement identifié et widget, sans débordement horizontal observé. Le programme de vérification visuelle n’est pas une génération IA réelle. Vue conseiller vérifiée uniquement sur la demande fictive.

Aucune IA/SMTP réelle, aucun secret chargé, aucun commit/push. Pour une recette finale éventuelle : un seul envoi de préférences fictives, vérifier la carte FR/EN puis recharger et revenir à la préparation ; l’accusé SMTP et l’accès depuis son lien sont des dépendances non validées des autres lots, sans recette supplémentaire demandée ici.

## Identité de l’assistant : Nicia
Le nom public est **Nicia** : « Nicia, votre assistant IA » / « Nicia, your AI assistant ». Titres, widget, accueil, auteurs des messages et noms accessibles utilisent ce nom ; la majuscule du nom propre est conservée selon la charte. L’accueil synthétique suit le choix FR/EN ; les conversations déjà enregistrées restent intactes. Les instructions système partagées par Gemini et OpenRouter donnent ce nom sans changer les garde-fous, le format JSON ou les contrats API. Aucun identifiant technique, route, email ni écran gestionnaire renommé.
Contrôles sans fournisseur réel : tests d’identité FR/EN et instructions serveur via `npm test`, puis build React.

## Nouvelle version Nicia — lot 1 conversationnel (23 octobre 2026)

La page principale `/assistant` (alias `/assistant.html`) utilise désormais une conversation, pas le questionnaire séquentiel. L’accueil local demande un prénom/pseudo facultatif ; son absence ne bloque ni une question directe ni les suggestions. Le choix et sa correction sont enregistrés séparément des coordonnées client. Les messages conservés ne sont pas réécrits. Cinq suggestions FR/EN démarrent par une réponse locale ; la FAQ reste locale et sourcée. Les tours suivants appellent le transport IA configuré avec le contexte autorisé : **aucune simulation n’est activée en fonctionnement normal**.

La nouvelle conversation ne crée aucun programme commercial et ne chiffre pas le voyage. Le budget repris dans le récapitulatif est seulement le souhait du client. La période approximative est conservée telle quelle ; les calendriers dans le fil sont facultatifs. Le récapitulatif des envies/points forts reste modifiable. Aucune ancienne transmission au conseiller n’est automatique.

L’ancien composant reste dans `site/src/pages/LegacyAssistant.jsx`, accessible explicitement à `/assistant/classique`, avec les anciennes routes API et données préservées. L’ancien widget est conservé comme composant d’archive `LegacySupportChat.jsx` ; le point d’entrée à sa position habituelle rejoint maintenant `/assistant`.

### API conversationnelle et persistance

- `GET /api/support/nicia/config` : disponibilité du raccordement, sans donnée client.
- `POST /api/support/nicia/:id/conversation` : Bearer existant ; `{tourId: UUID, langue: "fr"|"en", message}` OU `suggestion` (imaginer, destination, weekend, famille, detour) OU `profil: {nomUsage: string|null}`. Une seule action par tour. Les noms n’affectent aucun rôle ni droit. Pas d’historique ou de préférences navigateur acceptés sur cette route.
- `PATCH /api/support/nicia/:id/envies` : Bearer existant ; `{preferences: {...}}`, champs autorisés et dates validés, fusion avec les données existantes.
- `POST /api/support/nicia/:id/relais` : Bearer existant ; `{revisionAttendue: entier}`, aucune donnée client dans l’URL. La préparation est copiée côté serveur, pas acceptée depuis le navigateur.

Champs des envies : destination, villeDepart, dates (texte), dateDepart/dateRetour (YYYY-MM-DD facultatifs), participants, budget souhaité, devise ISO, baseBudget (total/personne/a_preciser), activites, experience, rythme, contraintes. Les listes/textes, dates et participants sont bornés. Le JSON du modèle doit contenir uniquement reponse, preferences et pointsForts ; il est validé avant sauvegarde. Les sorties chiffrées explicites sont refusées, les montants de budget extraits sont ancrés dans les messages client et une date complète absente des réponses ne peut être créée à partir d’un mois, d’une année ou d’une fête approximative. Ces contrôles ne prouvent pas une compréhension sémantique parfaite de toute réponse libre.

Le message utilisateur est sauvegardé avant l’appel ; la panne laisse les préférences précédentes et le message en attente. Le rechargement permet de reprendre le même tour. Les cent derniers tours finalisés sont dédupliqués par UUID/signature, les appels concurrents utilisent le verrou existant et la limite par minute. La réponse publique omet signatures et empreintes. Les fichiers clients restent dans le stockage privé existant. Limites : 200 entrées d’historique, 2 000 caractères par message, un processus serveur ; pas de nouvelle base ni authentification. Une coupure pendant un appel IA peut nécessiter un réessai de l’utilisateur, jamais une boucle automatique.

Le mode Nicia garde le fournisseur et le modèle serveur actuels ; OpenRouter reste exclusivement `:free`, prix de routage nuls et sans fallback payant. JSON textuel avec validation backend, sans imposer un json_schema fournisseur sur cette nouvelle conversation ; 4 096 jetons maximum. Gemini reste disponible. Aucune clé consultée/copiée/modifiée pour cette implémentation. Les anciens modes programme restent séparés et disponibles uniquement dans leur parcours explicite.

### Trois raccordements à fournir / réutiliser

1. **Navbar/footer** : `site/src/components/NiciaChrome.jsx` exporte `NiciaNavbar`, `NiciaFooter` et `NiciaShell({navbar, footer, children})`. Ces deux emplacements peuvent recevoir les vrais composants de l’accueil. Habillage temporaire Encre, logo négatif officiel inchangé, polices locales. Pas de refonte de l’accueil ni de liens fictifs Mon espace/Confidentialité sans route livrée.
2. **Bouton d’accueil** : le collaborateur utilise un `Link to="/assistant"` pour « Parlez de votre projet ». La page d’accueil n’a pas été modifiée.
3. **Pré-réservation** : aucune route/contrat existant trouvé dans ce checkout. Le bouton est désactivé avec un accès Contact ; aucun faux succès ou lien mort. Point de configuration : `support-ia/nicia-relais.js`, fonction `configurerRelais({chemin, contrat:"nicia-preparation-v1", recevoir})`, à enregistrer après livraison effective de la route du collaborateur, avant les requêtes. `chemin` doit être relatif, sans requête, fragment, identifiant client ni jeton. `recevoir(snapshot)` reçoit exclusivement `{preparationId, revision, voyage, profil, pointsForts, idempotence}` côté serveur et retourne `{reference}` seulement après enregistrement réel. Il doit dédupliquer durablement sur `idempotence` (préparation + révision), y compris si la réponse est perdue ; le module Nicia déduplique également le réessai d’une même révision. La page cible peut lire `nicia.relais.reference` et sa révision depuis la préparation autorisée ; elle vérifie la cohérence de révision et récupère son dossier côté serveur via l’identifiant de relais et l’accès existant, jamais via des coordonnées ou jetons dans l’URL. Le module de pré-réservation fournit sa route React/serveur, son contrôle d’accès, sa réception idempotente et son accusé technique. Les emails, paiement et gestionnaire ne sont pas développés ici.

Suivi détaillé des preuves et dépendances : `docs/nicia-lot1.md`. Les tests simulés ne valident ni la disponibilité ni le comportement réel du modèle avec la nouvelle clé ; aucun diagnostic fournisseur relancé.


## Nicia lot 2 — ton et engagements DÉTOUR (#31 / #26)

Nouveau parcours uniquement : Nicia est un assistant IA qui recueille les envies et prépare un récapitulatif. Une personne compose l’offre commerciale, vérifie, signe et confirme la réservation. Ton précis, chaleureux, calme ; une ou deux questions utiles, prénom facultatif respecté, FR/EN conservés. « Nous » désigne l’agence. Aucune affirmation d’envoi à une personne sans opération effective ; aucun humour sur les prix ou les erreurs.

Un budget déclaré n’est pas une demande de tarif : l’exemple Ulrich / Nantes / deux personnes / budget total 800 euros passe dans la collecte. Le faux positif « de 800 » reconnu comme un vol est corrigé dans le mode FAQ Nicia, sans changer la FAQ des autres parcours. Le budget peut être reformulé explicitement comme souhait uniquement avec ses valeurs ancrées ; aucune estimation créée par Nicia. Tarifs, disponibilité, vols précis et confirmation de réservation sont traités par des limites locales avec un lien « Contacter un conseiller » / « Contact an adviser ». Les motifs commerciaux explicites (« à partir de », « sous réserve », équivalents EN et astérisques) sont rejetés dans une sortie IA. Ces contrôles lexicaux ne garantissent pas toutes les interprétations possibles.

Le rendu Nicia utilise un catalogue d’erreurs utilisateur FR/EN, jamais les textes arbitraires du réseau ; les autres parcours gardent leurs contrats. Les sources Contact restent cliquables sans afficher leur identifiant ou chemin technique. La panne conserve les envies et le message, avec réessai explicite du même tour. Le catch Nicia réutilise le journal privé expurgé existant, sans nouvel outil de diagnostic. Les anciennes traces programme ne permettent pas d’expliquer l’échec réel Monaco ; aucune cause fournisseur spécifique ne peut être affirmée. Aucun appel réel ni changement de fournisseur/modèle/configuration effectué pour ce lot.

Preuves, dix conversations et grille exacte des critères/restants/dépendances : [docs/nicia-ton.md](../docs/nicia-ton.md). Commandes : `node --test support-ia/tests/nicia/nicia-ton.test.js`, `npm --prefix support-ia test`, `npm --prefix site run build -- --emptyOutDir false`. Les réponses simulées contrôlent le code et ne prouvent pas le ton, l’extraction ou la disponibilité du modèle réel. La recette réelle du lot 1 est déjà en cours côté utilisateur ; aucune série supplémentaire de diagnostics n’est demandée. Offre commerciale, signature, confirmation de réservation et transfert humain effectif dépendent des autres lots ; emails et gestionnaire non modifiés.


### Correctif saisie / réponse réelle (23 octobre 2026)
Composeur Nicia : hauteur adaptée 48–160 px, texte non coupé, focus sur le conteneur arrondi, poignée supprimée ; défilement uniquement pour les longs messages. Vérifié desktop/mobile sur fournisseur simulé. Après panne : un GET autorisé réconcilie l’historique ; message enregistré affiché une seule fois et champ vidé, texte conservé si sauvegarde non confirmée. Réessayer utilise le même tour sans génération automatique.

Trace réelle existante `77a70b96-7954-4a24-a0fd-8cb8d1072e28` : timeout à la lecture du corps après HTTP 200, 60 s au total. La mesure transport est corrigée pour inclure la lecture du corps. Unique essai réel autorisé, isolé avec préférences fictives et email interdit : modèle configuré inchangé `liquid/lfm-2.5-2.6b:free`, JSON textuel, 4 096 jetons, routage gratuit sans fallback ; rejet `INVALID_EXTRACTION` / HTTP backend 502 après 32,6 s. Message conservé, aucune demande/email. Sortie non sauvegardée ; sous-motif JSON mal formé ou hors schéma non établi sur cette trace agrégée. La distinction de parsing `dialogue_json` réutilise désormais le journal expurgé existant. **IA réelle encore bloquée**, malgré la saisie corrigée. Détails et preuves dans [nicia-ton.md](../docs/nicia-ton.md). Aucun changement de modèle ou délais et aucun autre appel réel.


### Contrat d’extraction Nicia partagé
Le dialogue OpenRouter utilise désormais `response_format: json_schema` strict avec le contrat de `nicia-schema.js`, également utilisé dans les instructions et le contrôle backend. Les trois champs racine sont requis ; les préférences inconnues sont omises, jamais null, sans objets imbriqués ni propriétés supplémentaires. Règles métier, dates et ancrage restent stricts ; aucune conversion ou conversation prédéfinie en cas de rejet. Les autres modes et le modèle configuré ne changent pas.

Unique essai réel après correction : encore bloqué **avant** le JSON du dialogue, `AI_RESPONSE_INVALID/enveloppe_json`, HTTP fournisseur 200, référence `19b63e80-6d32-409a-a170-ccf713156ec6`. Aucun résultat métier sauvegardé, message fictif conservé une fois, aucune demande/email. Aucun nouvel appel. Les anciens rejets ne permettent pas de reconstruire le champ qui posait problème. Détails, limites et tests dans [nicia-ton.md](../docs/nicia-ton.md).

### État final avant lot 3
Configuration du processus Express vérifiée : OpenRouter, liquid/lfm-2.5-2.6b:free, clé présente, URL officielle, bon dossier d’intégration. Deux appels : HTTP 200 puis 220 octets d’espaces et timeout 60 s ; ensuite HTTP 400, raisonnement obligatoire impossible à désactiver. Paramètre de désactivation retiré. Nicia utilise désormais un lecteur SSE borné côté serveur ; JSON final strict inchangé côté frontend. Autres modes conservés. 75 tests et build réussis, mais aucun succès réel récent : résultat B, dépendance fournisseur. Voir docs/nicia-ton.md pour preuves et limites. Aucun appel supplémentaire, changement de modèle ou achat.


## Nicia lot 3 — US21 / #30, trace conseiller
Les nouvelles écritures de l’historique portent UUID et horodatage serveur ; les anciennes gardent leurs dates inconnues et un ID de lecture déterministe. Sources publiques effectivement utilisées conservées ; aucune réponse échouée/partielle transformée en réponse complète.

`GET /api/prereservations/:id/trace` est livré **fermé par défaut** (503) : aucune authentification conseiller avec rôle ni relation métier réelle de préréservation n’existe dans ce checkout. Le jeton client, X-Team-Key et X-Role n’ouvrent pas cette route. Un adaptateur serveur d’authentification, un contrôle d’accès dossier et un résolveur de relation autoritatif sont requis ; le lien retour du relais Nicia est aussi vérifié. Aucun changement du dashboard ou des emails.

Contrat US8, exemple fictif, tests, dépendances et grille de tâches cochables : [docs/nicia-trace.md](../docs/nicia-trace.md). Pas de durée de conservation approuvée trouvée ; aucune donnée supprimée, décision PO requise et information client FR/EN correspondante. L’issue #30 reste ouverte jusqu’au raccordement réel et à l’UI de l’autre lot. Tests : `node --test support-ia/tests/nicia/nicia-trace.test.js`, `npm --prefix support-ia test`, build React habituel. Aucun appel IA réel nécessaire.


## Fournisseur Groq — dialogue Nicia

Configuration serveur (clé privée déjà configurée par l’utilisateur ; ne jamais la placer dans React) :

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=gsk_CLE_FICTIVE_A_REMPLACER
GROQ_MODEL=openai/gpt-oss-120b
```

Le backend doit être redémarré pour charger le nouveau code et les variables .env ; le fichier .env réel n’est pas modifié par cette intégration. Les variables héritées priment sur --env-file ; GROQ_API_KEY est prioritaire sur l’alias IA_API_KEY. URL fixe : `https://api.groq.com/openai/v1/chat/completions`. Aucun basculement vers Gemini/OpenRouter, changement automatique de modèle, retry, achat ou activation d’un autre palier de service. Le compte Groq de l’utilisateur doit conserver son offre/quota gratuit ; le code n’effectue aucune modification de facturation. Gemini et OpenRouter restent disponibles par choix explicite.

### Schéma strict adapté, métier inchangé

La [documentation Groq Structured Outputs](https://console.groq.com/docs/structured-outputs) annonce le mode strict pour GPT-OSS 120B et exige tous les champs requis et additionalProperties:false à chaque objet. Les inconnues utilisent une union avec null. Le streaming et les outils ne sont pas disponibles dans ce mode : le transport Groq envoie `stream:false`, aucun outil, `response_format.json_schema.strict:true`.

`groq-schema.js` définit un schéma fournisseur distinct : trois champs racine requis, treize préférences requises dont les valeurs sont nullables. La normalisation vérifie toutes les propriétés AVANT de retirer uniquement les null documentés (signifiant « aucune modification extraite »). Les null n’effacent jamais une préférence existante ; un champ absent, une propriété supplémentaire ou un mauvais type n’est pas silencieusement corrigé. Les valeurs non nulles repassent dans le contrat Nicia et ses limites, dates calendaires, ancrage, budget souhaité, ton et interdictions commerciales. Les contraintes avancées de longueur/pattern restent imposées par le backend même si le schéma fournisseur ne porte que leurs descriptions. Aucun assouplissement de ces règles.

Un faux positif réel a été corrigé : la réponse peut reformuler « budget total de 800 euros » fourni par le client, pas seulement « votre budget souhaité est de… ». Les espaces insécables et la reformulation FR/EN sont testés. Montant exact, devise et base doivent correspondre au souhait ; un prix produit ou une valeur inventée reste refusé. Les nombres sont comparés comme jetons numériques, plus comme sous-chaînes (800 ne valide pas 1800).

### Quota, contexte et limites

La [documentation des quotas](https://console.groq.com/docs/rate-limits) annonce pour le plan gratuit de ce modèle 30 RPM, 1 000 RPD, 8 000 TPM et 200 000 TPD ; les limites du compte font autorité. Le backend garde l’historique autorisé complet et toutes les préférences, sans tronquer silencieusement. Borne conservatrice : 18 000 octets pour la requête sérialisée, schéma et contexte inclus ; ce n’est pas un comptage exact des tokens. Au-delà, refus explicite `AI_CONTEXT_LIMIT` / HTTP 422, données conservées et message FR/EN avec accès Contact. La limite existante de messages reste active.

Sortie : `max_completion_tokens:1536`, raisonnement low, délai 60 s et corps borné à 512 000 octets. Une sortie tronquée, refusée, mal formée ou hors métier n’est jamais sauvegardée. Les 401/429/délais ne déclenchent aucun retry ni fournisseur de secours. Les diagnostics restent privés et en liste blanche : fournisseur/modèle, statut, catégorie technique, Retry-After, compteurs de requêtes/tokens restants et délai de reset documenté. Aucun corps, clé, conversation ou raisonnement n’est journalisé.

Ce fournisseur couvre le dialogue Nicia et les questions de l’ancien chat. La génération/modification commerciale de programme du parcours historique n’est pas portée à Groq dans cette intervention : refus explicite `AI_MODE_UNSUPPORTED` avant appel, programmes enregistrés conservés, sans bascule automatique. La trace du lot 3, le stockage et les accès restent inchangés.

### Résultats réellement obtenus

Tests simulés ciblés : réponse valide, schéma invalide, null/required/propriété supplémentaire, 401, 429 et Retry-After/reset, panne, délai, enveloppe invalide, fin tronquée, contexte trop volumineux sans effacement ; API Nicia FR/EN, budget, correction, préservation sur panne, reprise du même UUID, restauration et refus d’accès client non autorisé. Commande : `node --test support-ia/tests/nicia/groq.test.js`, intégrée à `npm --prefix support-ia test`. Build React exécuté après modification du message de limite.

**Deux appels réels seulement**, via Express/Nicia dans une préparation fictive isolée, module email bloqué et aucune demande créée :

| Appel | Résultat observé |
|---|---|
| 1 : présentation Camille + Nantes, départ Paris, deux voyageurs, budget total 800 euros | Groq HTTP 200 en 1,58 s ; 2 411 tokens d’entrée et 264 de sortie (2 675 au total). JSON strict conforme. Le backend a initialement refusé la reformulation du budget, faux positif corrigé. La réponse réelle capturée a ensuite été revalidée et enregistrée par le parcours de test **sans nouvel appel fournisseur**. Cette relecture n’est pas présentée comme un nouvel appel réel réussi. |
| 2 : correction en anglais Nantes → Lille dans la même conversation | Groq et backend HTTP 200 en 1,01 s ; 2 540 tokens d’entrée et 214 de sortie (2 754 au total). Destination Lille, départ Paris, deux voyageurs et budget total 800 euros conservés. |

La restauration par un nouveau client JS renvoie quatre messages avec IDs uniques et horodatages, les préférences corrigées et une seule copie du message de correction. Rejouer le tour accepté renvoie 200 sans appel fournisseur ; GET/restauration n’en déclenche aucun. Aucun secret affiché, aucun appel à un autre fournisseur ni email. Les captures portent exclusivement sur les données synthétiques et restent hors dépôt. Aucun test de disponibilité durable n’est déduit de ces deux appels.

Résultat : **dialogue réel Groq fonctionnel sur la correction testée**, avec première réponse réelle revalidée après correction du filtre de budget. Pour une validation courte après redémarrage du backend : ouvrir /assistant, donner un prénom et un souhait avec budget, corriger la destination, puis recharger ; les souhaits et les messages doivent rester présents une seule fois.

Vérification finale Groq : **85 tests réussis**, build React réussi, contrôle de diff ciblé sans erreur. Fichiers de cette intégration : groq.js, groq-schema.js, groq.test.js, ai.js, ai-context.js, diagnostic.js, nicia.js, nicia-preferences.js, package.json, .env.example, README.md ; site/src/support/nicia-errors.js ; docs/nicia-ton.md. Les modifications locales du lot 3 et l’index sont préservés. Aucun commit/push.


Résultat du nettoyage de revue : `npm --prefix support-ia run test:nicia` **26/26**, suite complète **88/88**, build React réussi sans vidage de `dist`. Le contrôle ciblé des fichiers de ce nettoyage passe. Le contrôle global signale uniquement deux espaces finaux préexistants à la ligne 21 des licences `site/public/support-brand/OFL-Bricolage-Grotesque.txt` et `OFL-Instrument-Sans.txt` ; ces fichiers restent intacts. Aucun appel IA réel, aucune modification de l’index, des emails ou du gestionnaire.
