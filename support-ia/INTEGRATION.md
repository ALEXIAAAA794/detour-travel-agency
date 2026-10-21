# Intégration Support IA — revue locale

Branche d’intégration : `feature/ai-support-integration`, créée directement depuis
`origin/pre-dev` récupéré le 21 octobre 2026 : `c3ada158b0c857ce1f779b7c6b68d1de5ad79486`.
Branche source comparée : `feature/ai-assistant`, jusqu’à `6b40bf2` inclus.
Ancêtre commun : `d9177996e3fd99de2c291993e124797d9bdcc23c`.
Aucun merge global/cherry-pick, commit, push ou reset. Les changements restent
non commités pour revue. Le checkout source et ses six fichiers locaux sont intacts.

## Sauvegarde et récupération

Archive hors du dépôt :
`C:/Users/DELL1/.codex/visualizations/2026/10/21/01a15f1c-18ec-78f0-86a6-d21a1220a31d/sauvegarde-integration-support-ia-20261021/travail-local.zip`. Elle contient exactement les six fichiers locaux
README, diagnostic.js, gemini.js, gemini-http.js, gemini-http.test.js et
gemini-local-diagnostic.js, avec patchs Git, manifeste du commit source et empreintes.
L’archive a été relue et ses empreintes vérifiées. Aucun .env, secret ni donnée
client n’y est inclus. Le fichier RESTAURER.txt explique la restauration sélective.
Les fichiers source n’ont pas été supprimés ni déplacés.

## Comparaison et choix d’intégration

| Domaine | Déjà dans pre-dev | Apport manquant intégré |
|---|---|---|
| Site | React/Vite, routes, pages, images et chat flottant | Page React /assistant, huit préférences, contexte commun widget/page, reprise protégée |
| Messages | Validation, Gemini texte | Historique serveur, contexte autorisé, FAQ sourcée et modèle configurable |
| Demandes | JSON, requestId, réessai idempotent simple | Jeton de préparation, rythme/contraintes, rattachement unique, verrou partagé et notifications |
| Programmes | Absent | JSON validé, versions, obsolescence, modifications explicites, accord et instantané transmis |
| Conseillers | Back-office prestataires initial inchangé depuis l’ancêtre | Demandes, propositions, acceptation client, notifications, programme accepté échappé |
| Gemini | Lecture de clé à l’appel, modèle fixe, corps d’erreur brut | Configuration conservée à l’appel, nom normalisé, lecture bornée et diagnostics expurgés |
| Déploiement | site/dist, fallback SPA, PORT et scripts start/test:gemini | Préservés ; export de app pour tests, root explicite sendFile pour chemins cachés |
| Backend catalogue | Express/TypeScript/Prisma | Aucun fichier ni schéma changé |

Méthode : appliquer les deltas Support IA aux fichiers ayant un ancêtre identique
(conseillers/app.py et demandes.js), fusionner le routage Express en conservant
les ajouts pre-dev, puis porter l’interface sur React. Les modules absents sont
ajoutés individuellement. Aucun remplacement global du site, de son package,
du catalogue backend, de dist ou des dépendances suivies.
Le README racine contenait déjà des marqueurs de conflit orphelins ; seuls ces
marqueurs ont été retirés et un lien vers ce guide ajouté. Aucune autre portion
de documentation de collaborateurs n’est remplacée.

Les liens/sources FAQ sont réancrés sur les fichiers React publics, avec empreintes
actualisées et six destinations. Les tests de l’ancienne page DOM ne sont pas
réintroduits : un nouveau test du client partagé contrôle restauration, jeton,
création dédupliquée, limites, absence de programme navigateur et conservation
du résultat sur panne. Le backend garde les tests métier des étapes 1 à 4.

## Vérifications reproductibles

- `cd support-ia` puis `npm test` : API, métier, FAQ, diagnostic et client React ;
  Gemini et notifications simulés, données temporaires. Aucun appel réel automatique.
- Depuis la racine : `python support-ia/backoffice_test.py` : anciennes demandes,
  rendu du programme, échappement, verrou Python/Node et idempotence emails sans SMTP.
- Depuis site : `node node_modules/vite/bin/vite.js build --outDir <dossier-neuf-hors-depot>`.
  Le build de validation a été écrit hors des dist suivis, sans les remplacer.
- Depuis la racine : `node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json`.
  Aucun accès DB, migration ni seed.
- `git diff --check` et comparaison des six empreintes avec la sauvegarde.

Vérification navigateur effectuée sur un serveur local isolé : chargement de
/assistant, saisie de Lyon, passage à la question 2, restauration après rechargement,
question FAQ avec source Contact et absence d’erreur JS. Aucune génération réelle
ni transmission de demande pendant ce parcours. Le fallback SPA a été corrigé
pour un checkout sous .codex et couvert par un test ; les URL /api inconnues
restent des 404 et ne retournent pas le site.

## Limites et diagnostic Gemini

Le dernier diagnostic réel est inchangé : models.list HTTP 200, puis deux essais
uniques (gemini-3.8-flash minimal et gemini-3.1-flash-lite JSON) refusés par Google
avec 503 / UNAVAILABLE / forte demande en 1,68 s et 1,23 s. Aucun modèle fonctionnel
établi, aucun fallback automatique, délai inchangé, .env non modifié. Les outils
locaux de diagnostic non suivis ont été conservés et intégrés, sans les exécuter.
Le problème fournisseur reste à faire vérifier par Google ; une intégration verte
sur tests simulés ne constitue pas une preuve de génération réelle réussie.

Le stockage reste JSON partagé local et un seul Express pour les programmes.
Une nouvelle version ne remplace pas l’instantané accepté ; conflit à traiter par
le conseiller. L’accès client reste fondé sur la possession du jeton. Les emails
exigent leur configuration privée et le worker existant. La base catalogue Prisma
n’est pas utilisée comme nouvelle source de vérité des préparations.
Les dépendances et dist déjà suivis dans pre-dev ne sont ni supprimés ni modifiés ;
les ajouts gitignore évitent seulement de nouveaux fichiers privés/générés.

Aucune décision fonctionnelle indispensable ne bloque cette préparation locale.
Les essais réels Gemini et la configuration de déploiement ne sont pas inventés
ou remplacés par une simulation en fonctionnement normal.

Résultats finaux : 14 tests Node réussis ; vérifications Python/back-office/verrou/emails réussies ; build React réussi ; contrôle TypeScript sans émission réussi ; diff sans erreur. Les six empreintes du checkout source correspondent toujours à la sauvegarde. Aucun fichier backend catalogue, node_modules ou dist suivi modifié et aucun fichier supprimé. Le checkout source reste sur feature/ai-assistant ; le nouveau checkout est sur feature/ai-support-integration.
