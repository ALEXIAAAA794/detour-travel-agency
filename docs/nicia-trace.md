# Nicia lot 3 — US21 / issue #30 : trace de l’agent

## Fonctionnement livré

L’historique serveur de la préparation reste l’unique source. Aucune nouvelle base et aucune copie de conversation dans les demandes ou emails. Les nouvelles écritures passent par `creerMessage` : UUID stable persisté, rôle technique user/model, contenu, horodatage UTC serveur (heure d’enregistrement) et état reçu/complet. Un message client Nicia est enregistré avant l’appel ; la réponse assistant seulement après réception complète et validation métier. Les suggestions et FAQ locales sont des réponses complètes identifiées de la même façon, sans être présentées comme des réponses du modèle.

Le tour UUID existant assure le réessai et la déduplication. Le registre de réponses finalisées est désormais borné à 100 tours (au lieu de dix), couvrant tous les nouveaux échanges possibles dans les 200 entrées d’historique ; les signatures déjà oubliées dans les anciens fichiers ne peuvent pas être reconstruites. Rechargement et réessai ne changent pas les identifiants enregistrés. Les nouvelles confirmations d’édition de préférences et de programme utilisent aussi ces métadonnées ; les anciennes routes conservent leurs contrats. Les écritures restent atomiques par fichier et utilisent les verrous existants ; la limite héritée d’un processus serveur demeure.

Les sources effectivement enregistrées avec la réponse sont conservées (identifiant FAQ, libellé public, URL Contact/Destinations et version de base quand connue). Aucune source n’est reconstruite depuis les mots du client ou une supposition du modèle. La projection ne renvoie que les identifiants de sources publiques connus et les routes autorisées ; une source inconnue ou une URL privée n’est pas exportée.

**Anciennes données :** pas de migration destructive ni de réécriture en lecture. Si l’ancien message n’a pas d’ID, un identifiant `legacy-...` déterministe est calculé à partir de la préparation, de sa position et de son contenu. Il reste stable lors d’un rechargement et de l’ajout de messages. Une date absente reste `null`, avec statut `historique_ancien` ; aucune date de création supposée n’est utilisée. Aucune source manquante n’est inventée. Les rôles système ou inconnus ne sont pas exportés.

## État des dépendances vérifiées

Le backend TypeScript expose les destinations et possède un modèle Booking, mais aucun raccordement de préréservation à la préparation Nicia n’a été trouvé. Booking et demande de préférences ne sont donc pas renommés « préréservation ». Le relais du lot 1 reste le point métier prévu : le futur récepteur retourne une référence réelle après enregistrement idempotent ; Nicia la conserve dans `preparation.nicia.relais.reference`.

Aucune authentification conseiller avec identité et rôle n’est présente dans Express. La clé technique X-Team-Key du service prestataires et le jeton de formulaire du conseiller ne constituent pas une session utilisateur authentifiée avec rôle ; ils ne sont pas réutilisés pour ouvrir la trace. Aucun changement du dashboard ou de son authentification n’est effectué.

**Route livrée mais fermée en fonctionnement normal :** `GET /api/prereservations/:id/trace` retourne 503 `TRACE_NOT_CONNECTED`, même avec un jeton client ou un faux en-tête de rôle. Aucun dossier n’est alors lu. Aucun jeton supplémentaire ou clé d’accès globale n’est créé pour contourner cette dépendance.

## Raccordement serveur attendu

Le responsable de l’authentification et du lot préréservation remplace l’instanciation fermée dans `support-ia/server.js` par `creerTraceRouter` avec :

- `authentifierConseiller(req)` : vérifier la session/signature/expiration par le mécanisme métier réel et retourner `{id, role:"conseiller"}` ; retourner null si non authentifié. Ne jamais dériver une identité de X-Role, du corps, d’un ID, du prénom ou du jeton client. Le middleware reste responsable de la validation cryptographique et de l’expiration ; le routeur vérifie indépendamment le rôle.
- `resoudrePrereservation(id)` : consulter le stockage métier autoritatif et retourner le dossier réel `{id, preparationId, ...données nécessaires aux droits}`. La relation doit être enregistrée côté serveur depuis le snapshot du relais `nicia-preparation-v1`, pas depuis un identifiant fourni librement par le navigateur. Pas de lecture de conversation via un simple ID de préparation.
- `peutConsulter(conseiller,dossier)` : contrôle serveur d’affectation/périmètre dossier, strictement true pour autoriser. L’existence du rôle conseiller n’accorde pas à elle seule tous les dossiers.
- `lirePreparation(id)` : par défaut, lecture bornée au stockage existant via `preparations.js`, sans exposition HTTP distincte. Une autre implémentation serveur peut être injectée par le responsable du stockage.

L’absence d’un adaptateur obligatoire maintient le refus. **Remplacer le montage fermé existant ; ne pas ajouter un second montage derrière lui**, car le premier renverrait toujours 503. Aucun mécanisme d’activation via un en-tête ou une variable publique.

Après authentification et contrôle de rôle, le dossier doit être autorisé avant toute lecture de préparation. Le routeur vérifie aussi le lien retour déjà enregistré : `preparation.id === dossier.preparationId` et `preparation.nicia.relais.reference === dossier.id`. Une référence inconnue/non autorisée renvoie la même erreur 404. Une relation manquante/incohérente renvoie 409 sans contenu. Le relais actuel ne garde qu’une référence courante : consultation d’une ancienne référence après remplacement demanderait un contrat métier de relations versionnées, non inventé ici.

## Contrat pour US8 / dashboard

Requête : `GET /api/prereservations/pre-fictive-001/trace` via le même mécanisme de session conseiller que celui raccordé au serveur. Aucun jeton client, prompt ou coordonnées dans l’URL. Le proxy React existant `/api` pointe déjà vers Express.

Réponse 200 fictive :

```json
{
  "versionContrat": 1,
  "prereservationId": "pre-fictive-001",
  "echanges": [
    {
      "id": "11b0a29c-1724-49e7-80c5-44f41179bca1",
      "role": "client",
      "message": "Quelles destinations propose DÉTOUR ?",
      "horodatage": "2026-10-23T09:00:00.000Z",
      "statut": "message_recu",
      "sources": []
    },
    {
      "id": "f9e10b8c-c285-47f1-9279-b4d2aa9bebae",
      "role": "assistant",
      "message": "Le site présente des idées de séjours à Nantes et Lyon, entre autres. Cela ne confirme aucune disponibilité.",
      "horodatage": "2026-10-23T09:00:00.100Z",
      "statut": "reponse_complete",
      "sources": [{"id":"agence-destinations","titre":"Destinations","url":"/destinations"}],
      "versionBase": 2
    },
    {
      "id": "legacy-00000000000000000000000000000000",
      "role": "client",
      "message": "Ancienne envie conservée",
      "horodatage": null,
      "statut": "historique_ancien",
      "sources": []
    }
  ]
}
```

L’exemple est illustratif et ne représente aucune conversation réelle. Ordre de stockage conservé ; ne pas trier les dates inconnues en fabriquant une date. `id` sert de clé de liste/déduplication, `horodatage:null` s’affiche « date inconnue ». `versionBase` est optionnelle. Liste bornée par l’historique existant (200 entrées), pas de pagination nouvelle. Aucun message d’échec ou fragment n’est exporté comme `reponse_complete` ; un message client en attente demeure `message_recu` sans réponse associée inventée.

Erreurs : 401 `ADVISER_AUTH_REQUIRED`, 403 `ADVISER_ROLE_REQUIRED`, 404 `TRACE_NOT_FOUND`, 409 `TRACE_LINK_MISSING`, 503 `TRACE_NOT_CONNECTED` / `TRACE_UNAVAILABLE`. Les 401/403/200 sont testés avec un adaptateur de session **simulé**, pas avec une authentification réelle absente. Toute réponse porte `Cache-Control:no-store` et `Pragma:no-cache`.

US8 doit afficher les messages et titres comme texte (`textContent` ou interpolation React), jamais comme HTML ; utiliser seulement les URLs de sources renvoyées et ne pas conserver la trace dans un cache partagé. Le contrat ne renvoie aucun profil client, préférence structurée, prompt système, clé, empreinte, jeton, signature de tour, diagnostic privé ou donnée conseiller. Le message lui-même reste une donnée privée pouvant contenir ce que le client y a écrit : l’accès dossier est donc indispensable.

## Conservation et information client

Aucun TTL, durée approuvée ou purge de conversation trouvé dans le code. La borne de 200 entrées bloque l’allongement ; elle n’est pas une durée de conservation. Les fichiers ne sont pas effacés par ce lot. La rotation des diagnostics privés est distincte de l’historique et ne fixe aucune politique de conservation des échanges.

Le client voit en FR/EN que les échanges sont enregistrés avec la préparation, que la consultation conseiller nécessite une préréservation rattachée et un accès autorisé, et que la durée reste à définir. Aucun partage déjà effectué n’est annoncé. **Décision PO nécessaire** : finalité et durée de conservation, point de départ, traitement des demandes sans suite, modalités de suppression/archivage et information de confidentialité validée. Ce lot ne prétend pas approuver une conservation sans limite ni valider juridiquement une politique.

## Tests exécutés et limites

`node --test support-ia/tests/nicia/nicia-trace.test.js` : quatre tests ciblés passés, données temporaires fictives et transport IA bloqué/simulé. Contrôles : UUID/horodatages, sources et version, persistance, stabilité des anciennes identités sans date fabriquée, absence de mutation à la lecture, projection sans champs secrets ni rôle système ; route réelle fermée malgré jeton client/faux rôle/clé technique ; authentification conseiller simulée, accès anonyme/client refusé, dossier A isolé de B et lien retour incohérent refusé ; FAQ, réessai identique et rechargement sans doublon ; deux échecs simulés laissant un seul message client et aucune réponse inventée.

La suite complète et le build React sont exécutés après intégration (résultats finaux ci-dessous). Aucun appel IA réel, fournisseur changé, configuration IA modifiée ni email réel. L’authentification et la relation métier sont seulement simulées pour les tests autorisés ; aucune consultation réelle conseiller ou UI dashboard validée.

## Fichiers de ce lot

Nouveaux : `support-ia/nicia-historique.js`, `support-ia/nicia-trace.js`, `support-ia/tests/nicia/nicia-trace.test.js`, `docs/nicia-trace.md`.

Modifiés par portions : `support-ia/nicia.js`, `support-ia/preparations.js`, `support-ia/server.js` (écritures historiques et montage fermé), `support-ia/package.json` (tests), `support-ia/README.md`, `site/src/pages/Assistant.jsx` (information FR/EN). Les autres modifications locales antérieures restent intactes. Index préservé, aucun commit/push. Aucun fichier du dashboard, gestionnaire ou email modifié.

## Grille issue #30

| Tâche | État exact |
|---|---|
| Réutiliser et persister l’historique serveur avec ID/rôle/message/date serveur pour les nouveaux échanges | Cochable : code + tests |
| Conserver les sources effectivement utilisées ; compatibilité ancienne sans inventer les données absentes | Cochable : projection et tests |
| Réessai/rechargement sans doublon ; aucune réponse IA échouée/partielle marquée complète | Cochable : tests nouveaux + protections des lots 1/2 |
| Ajouter GET /api/prereservations/:id/trace protégé et fermé si les dépendances manquent | Cochable pour la route et son comportement fermé ; accès réel non livré |
| Fournir le contrat US8 et un exemple fictif sans secrets | Cochable : ce document |
| Relation métier réelle préparation → préréservation | Non satisfait : récepteur/stockage préréservation d’un autre lot absent |
| Authentification conseiller réelle, rôle et périmètre de dossiers raccordés | Non satisfait : mécanisme réel absent ; branche autorisée testée uniquement par simulation |
| Historique effectivement visible dans le dashboard conseiller | Non satisfait : interface US8 hors périmètre, intégration à faire par son responsable |
| Durée de conservation approuvée et information définitive | Non satisfait : décision PO attendue ; fonctionnement actuel décrit sans durée inventée |

**L’issue entière ne peut pas être fermée.** La trace technique et son contrat sont livrés ; restent le rattachement métier, l’authentification réelle, l’intégration US8 et la décision de conservation. Le blocage fournisseur du lot 2 n’est ni relancé ni masqué par cette livraison.

Résultats finaux : **79 tests réussis, zéro échec**, dont les quatre tests trace ; build React réussi (53 modules). Contrôles de diff des fichiers du lot sans erreur ; index inchangé. Le contrôle de déduplication couvre aussi un réessai après onze tours supplémentaires.
