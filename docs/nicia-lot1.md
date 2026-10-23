# Nicia — lot 1 : suivi des critères

État du 23 octobre 2026, branche `feature/ai-support-integration`.
Référence fonctionnelle : demande utilisateur dans le texte collé. Le PDF rebranding et la maquette définissent uniquement le graphisme ; ils n’étendent pas le travail aux autres lots.

## Critères et preuves

| Critère | État | Preuve réellement obtenue / limite |
| --- | --- | --- |
| Grande page conversationnelle `/assistant`, titre demandé, cinq suggestions | Réalisé avec preuve | Build React et navigateur desktop/mobile ; titre « parlez de votre projet », accueil réel local, trois puis deux suggestions sur desktop. |
| Couleurs, typographies et logo officiels | Réalisé avec preuve | SVG négatif officiel inchangé, polices locales existantes ; Encre/Craie/Ciel, un seul accent jaune dans le logo. Petits textes en Encre pour le contraste ; Brique pour les alertes. |
| Navbar/footer temporaires et emplacements de remplacement | Réalisé avec preuve ; intégration définitive dépendante | `NiciaChrome.jsx` : exports `NiciaNavbar`, `NiciaFooter`, `NiciaShell` et props navbar/footer. Habillage Encre testé au navigateur. Composants définitifs de l’accueil à fournir par le collaborateur. |
| Point d’entrée Nicia à sa position actuelle | Réalisé avec preuve | Le lien flottant existant ouvre `/assistant` ; visibilité et href vérifiés au navigateur, préparation conservée. Aucun changement de Home.jsx. |
| Bouton d’accueil « Parlez de votre projet » | Dépendance d’un autre lot | Route à utiliser : `/assistant`, via React Link. L’accueil du collaborateur n’a pas été modifié. |
| Accueil exact et prénom/pseudo facultatif FR/EN | Réalisé avec preuve | Accueil local conforme au texte demandé ; tests d’identité, premier prénom et refus, sans appel fournisseur. |
| Correction du prénom et conservation du besoin dans le même message | Réalisé avec preuve | Tests API et navigateur : « Je m’appelle Alex et je voudrais… » garde nom et texte complet ; correction via formulaire/« Appelle-moi… », puis rechargement. Heuristiques locales pour les formulations courantes ; formulaire explicite disponible en cas d’ambiguïté. |
| Refus de prénom distinct d’une contrainte de voyage | Réalisé avec preuve | « Je préfère ne pas prendre l’avion » n’est pas un refus de prénom ; « aucune » n’est pas un pseudonyme. Tests ciblés. |
| Chaque suggestion a une première réponse locale FR/EN | Réalisé avec preuve | Dix cas API, zéro appel fournisseur ; suggestions ne suppriment pas l’historique. Si des envies existent déjà, elles sont conservées et les questions locales ne redemandent pas les champs connus. |
| Questions adaptées par le modèle, une ou deux à la fois | Implémenté ; recette réelle restante | Appel du fournisseur configuré avec profil, envies et 40 derniers messages autorisés ; plafond de deux « ? » et validation JSON. Contexte et langue contrôlés dans les requêtes simulées. Le choix FR/EN suit les marqueurs du message, avec repli sur la langue de l’interface en cas d’ambiguïté ; cette détection reste heuristique. Le comportement sémantique d’un vrai modèle n’a pas été vérifié : un mock ne prouve pas qu’il ne redemandera jamais une information connue. |
| Destination, départ, période, voyageurs, budget/devise/base, activités, expérience, rythme et contraintes | Réalisé techniquement avec preuve simulée | Schéma d’extraction borné, fusion serveur, récapitulatif éditable et calendriers facultatifs. Montants/devise/base de budget nouveaux ancrés dans les messages client ; sinon extraction rejetée. Qualité de collecte libre réelle à confirmer. |
| Période approximative, absence de dates inventées | Réalisé avec preuve | Tests et navigateur : « un week-end en mai » conservé sans dates ajoutées ; dates ISO 2027-05-15/16 saisies ensuite et restaurées. Calendrier impossible/inversé rejeté. Date complète absente des réponses refusée lors de l’extraction : « Noël 2027 » ne devient pas automatiquement le 25 décembre. Formats explicites ISO, numériques et jour/mois/année FR/EN testés ; dates de réponse hors période connues refusées. La période initiale reste explicitement affichée comme telle quand des dates précises sont renseignées. |
| Historique et préférences serveur, panne sans perte | Réalisé avec preuve | Message enregistré avant l’appel. Panne 503 simulée, rechargement, bouton « Réessayer ce message » : même tour, une seule occurrence du message, préférences conservées. Reprise à la borne des 200 entrées testée. |
| Extraction invalide sans écrasement ni privilèges | Réalisé avec preuve | JSON invalide, champs rôle/empreinte inconnus, mauvais types/dates/listes, trop de questions et prix rejetés. Prénom « admin » ne crée aucun rôle. Les données sont rendues comme texte, jamais comme HTML. |
| Isolation des dossiers et protection par jeton | Réalisé avec preuve locale | Routes conversation/envies/relais protégées ; token d’un autre dossier et absence de token refusés 404. Le contexte envoyé pour B ne contient pas celui de A. Aucune URL avec jeton ou coordonnées. Ce n’est pas une validation du lot emails. |
| Concurrence, versions et idempotence | Réalisé avec preuve | Verrou partagé avec les routes existantes ; double appel/édition concurrente refusés 409. UUID des tours, dernier tour repris sans doublon, dix réponses dédupliquées. Une sauvegarde identique ne crée pas de révision ; les modifications de contenu en créent une. |
| Pas de prix/estimation IA ni offre commerciale dans ce nouveau parcours | Réalisé pour les contrôles testés ; limite sémantique | Nouveau prompt distinct et JSON borné ; montants en devises/symboles, chiffres et mots de prix explicites rejetés dans la réponse/points forts. FAQ tarifaire redirigée vers le conseiller. Budget souhaité affiché séparément. Les garde-fous locaux et instructions ne garantissent pas la détection de toute paraphrase non testée. |
| Aucun horaire, disponibilité, réservation ou paiement confirmé | Réalisé au niveau du parcours ; comportement réel restant | Instructions explicites, refus FAQ existants et absence d’outil de réservation/paiement/transmission automatique dans la nouvelle conversation. Aucune prestation réelle testée ou annoncée. |
| FAQ existante et Contact | Réalisé avec preuve | FAQ locale et sources conservées ; Contact visible dans la conversation, le relais et le chrome. Les tests existants FR/EN passent. |
| Récapitulatif des envies/points forts modifiable | Réalisé avec preuve | Simulation structurée puis édition du budget 500, devise EUR, total ; dates/préférences restaurées au navigateur. Il s’agit d’un souhait client, pas d’une estimation. |
| Bouton « Pré-réserver ce voyage » | Réalisé avec preuve | Bouton visible mais désactivé : aucun raccordement réel trouvé. Message honnête, Contact disponible, aucun lien mort présenté comme opérationnel. |
| Pré-réservation réelle et formulaire | Dépendance d’un autre lot | Le collaborateur fournit route, contrôle d’accès, récepteur serveur et accusé idempotent. Aucun formulaire développé ici. |
| Contrat de passage de relais | Réalisé en simulation seulement | Adaptateur enregistré uniquement dans un test : snapshot serveur sans jeton/historique, révision obsolète refusée, deux essais -> une réception. Hors test, adaptateur absent : refus 409, rien envoyé. |
| Ancien parcours, anciennes données et programmes | Réalisé avec preuve | Ancien composant conservé à `/assistant/classique`, consulté dans le navigateur ; compatibilité des nouveaux champs avec l’ancien PATCH testée. Routes de programme et ancienne confirmation gardées. Aucun fichier de données supprimé. |
| Clé et modèle OpenRouter | Configuration existante conservée | Aucun .env lu/modifié ni changement de modèle. Tests OpenRouter simulés : `:free`, prix de routage nuls, fallback désactivé, 4 096 jetons, JSON textuel validé côté serveur. Aucune simulation en mode normal. |
| Disponibilité et qualité du modèle réel avec la nouvelle clé | Restant | Aucun appel réel effectué, aucun diagnostic fournisseur relancé. À observer dans l’unique parcours manuel final. |
| Emails, SMTP, paiement, back-office et propositions commerciales | Dépendances / hors périmètre | Aucun code de ces lots modifié ; changements locaux antérieurs laissés en place. Aucune validation ni envoi réel revendiqués. |

## Trois raccordements

1. **Navbar/footer** : remplacer les emplacements `navbar` et `footer` de `NiciaShell` par les composants définitifs de l’accueil, en conservant l’habillage et les liens réels. Pas de faux liens Mon espace/Confidentialité sans route existante.
2. **Accueil** : bouton du collaborateur vers `/assistant`, sans paramètre personnel ni jeton. L’alias `/assistant.html` et l’ancien parcours `/assistant/classique` restent accessibles.
3. **Pré-réservation** : appeler `configurerRelais` depuis `support-ia/nicia-relais.js` uniquement après livraison effective de la route. Contrat `nicia-preparation-v1` décrit dans le README : snapshot serveur, accusé `{reference}`, idempotence durable par préparation/révision, route relative sans données dans l’URL. L’accès autorisé à la préparation expose ensuite `nicia.relais.reference` et sa révision pour le module cible ; celui-ci vérifie aussi l’autorisation et la cohérence de révision. Aucun jeton transmis au récepteur, aucun email déclenché par Nicia.

## Vérifications exécutées

- `npm test --prefix support-ia` : **54 tests réussis**, transport IA simulé. Les anciens cas restent inclus.
- `node --test support-ia/nicia.test.js` : validation, profil, dix suggestions, extraction, panne/reprise, contexte, isolation, concurrence, compatibilité, relais et transport OpenRouter simulés.
- `npm --prefix site run build -- --emptyOutDir false` : build réussi, aucun ancien artefact supprimé.
- Navigateur sur un serveur temporaire dédié avec répertoires de données fictifs et fournisseur simulé : desktop 1536×1024 et mobile 390×844, zéro débordement horizontal observé ; FR/EN, pseudo/correction, contexte visible, période/dates, édition/restauration du budget, panne/rechargement/réessai sans doublon, point d’entrée et ancien parcours. Focus clavier et absence d’erreur au démarrage contrôlés.
- Aucun appel IA réel, SMTP, email, achat, paiement, envoi conseiller ou réservation pendant ces tests. Les messages du fournisseur simulé sont explicitement identifiés comme tels dans la recette, jamais dans l’application normale.

## Écarts et limites

La maquette sert de disposition ; l’accueil est celui explicitement demandé (question du prénom), et les contrôles calendrier/récapitulatif/relais s’ajoutent sous la conversation. Pas de faux dialogue prérempli. Le logo négatif officiel est l’unique accent jaune. Ballast n’est pas utilisé pour le petit texte sur Craie (contraste 4,22:1) ; Encre est privilégiée. Les textes historiques ne sont pas traduits ou réécrits lors d’un changement de langue. La génération commerciale historique reste dans le parcours précédent explicite ; elle ne fait pas partie de cette nouvelle conversation.

Limites héritées : stockage fichiers et verrou en mémoire sur un processus, pas de coordination multi-instance ; modèle gratuit susceptible d’indisponibilité ou de limitations, pas de bascule payante. La validation structurée n’est pas une preuve de compréhension sémantique ni de résistance universelle aux injections.

## Un seul parcours manuel final

Sur `/assistant` avec le serveur configuré normalement : envoyer « Je m’appelle Alex et je voudrais un week-end calme à Lyon, au départ de Nantes, en mai, pour deux personnes, avec un budget souhaité total de 500 EUR ». Observer les questions réellement produites, corriger le prénom et une envie, puis recharger. Vérifier la conservation des réponses, l’absence d’estimation IA et le bouton pré-réservation honnêtement indisponible tant que son lot n’est pas raccordé. Si le fournisseur échoue, conserver le message et signaler cette limite ; aucune série de diagnostics ou réessais automatiques n’est demandée.
