# Avancement de Slate

Dernière mise à jour : 2026-07-26. Branche produit `slate/main`, basée sur upstream
`ac73800ea37` (Code - OSS 1.131.0).

Ce document est le point d'entrée pour savoir où en est le projet. Le détail des critères
d'acceptation du chat reste dans [`docs/backlog-chat.md`](backlog-chat.md) ; les décisions
d'architecture dans [`docs/adr/`](adr/) et les conceptions dans
[`docs/superpowers/specs/`](superpowers/specs/).

## État global

| | |
|---|---|
| Sprint 1 — fork, identité, empaquetage | terminé |
| Sprint 2 — panneau de chat IA | en cours, 3 items sur 7 |
| Prochain item | S2-04, rendu des messages et saisie |
| Application | compile, se lance, produit un installateur Windows |
| Chat | panneau visible, service de conversation en place, aucun appel réseau |

## Sprint 1 — fondations du fork

Le Sprint 1 n'a pas de backlog numéroté ; son contenu se lit dans les commits. Ce qui est livré :

| Livrable | État |
|---|---|
| Identité produit (`product.json`, 24 champs), séparation des marques | terminé |
| CI autonome sur runners publics (`.github/workflows/slate-ci.yml`) | terminé |
| Documentation de compilation ([`docs/build.md`](build.md)) | terminé |
| Empaquetage Windows et images de marque générées | terminé |
| Revue de licences ([`docs/licensing.md`](licensing.md)) | terminé |
| Procédure de synchronisation amont ([`docs/upstream-sync.md`](upstream-sync.md)) | terminé |
| README, CONTRIBUTING, SECURITY réécrits | terminé |

Le workflow CI est autonome parce que les workflows d'upstream ciblent des pools self-hosted
Microsoft (`1ES.Pool=1es-vscode-oss-*`) inaccessibles depuis un fork.

## Sprint 2 — panneau de chat IA

| # | Item | État | Livrable |
|---|---|---|---|
| S2-01 | Stratégie vis-à-vis de l'agent host upstream | terminé | [`adr/001-agent-host.md`](adr/001-agent-host.md) |
| S2-02 | Squelette du panneau de chat | terminé | `contrib/slate/browser/` |
| S2-03 | Service de conversation, sans réseau | terminé | `contrib/slate/common/` |
| S2-04 | Rendu des messages et saisie | à faire | — |
| S2-05 | Stockage sécurisé de la clé API | à faire | — |
| S2-06 | Appel du fournisseur avec réponse en streaming | à faire | — |
| S2-07 | Fichier actif et sélection joints au contexte | à faire | — |

La conception de la tranche S2-03 → S2-07 est arrêtée dans
[`superpowers/specs/2026-07-26-slate-chat-bout-en-bout-design.md`](superpowers/specs/2026-07-26-slate-chat-bout-en-bout-design.md).

### Détail des items terminés

**S2-01** — le chat Slate est un composant autonome du workbench : ni agent host, ni extension
Copilot comme fournisseur, ni authentification GitHub. Slate réutilise les primitives génériques
(vues, injection de dépendances, `CancellationToken`, rendu Markdown, service de secrets) et écrit
à neuf sous `contrib/slate/`.

**S2-02** — vue enregistrée dans la barre auxiliaire droite, icône, commande `Slate: Open Chat`,
et première maquette visuelle. La direction visuelle est posée dans [`docs/design.md`](design.md)
et portée par `browser/media/slateWorkbench.css`.

**S2-03** — `common/slateChatModel.ts` (modèle de messages indépendant du fournisseur) et
`common/slateChatService.ts` (historique en mémoire, transitions d'état, un événement par
mutation). Singleton enregistré. 7 tests verts sous `test/common/`.

### Ordre imposé

S2-05 précède S2-06 : le stockage de la clé doit être en place avant tout code réseau, pour éviter
une clé en dur transitoire. La spec exige aussi un `grep` récursif sur le dossier de données
`.slate` après saisie, pour confirmer que la clé n'y figure pas en clair. Aucune ligne de S2-06
n'est écrite avant que ce contrôle passe.

## Arborescence du code Slate

```
src/vs/workbench/contrib/slate/
  browser/media/slateChat.css        style du panneau
  browser/media/slateWorkbench.css   surcharges de coque (tranche design)
  browser/slateChat.contribution.ts  vue, commande, singleton, contribution d'accueil
  browser/slateChatView.ts           rendu du panneau
  common/slateChatModel.ts           modèle de messages
  common/slateChatService.ts         historique et transitions d'état
  test/common/slateChatService.test.ts
```

Un seul point d'accroche dans le code d'upstream : l'import de la contribution dans
`src/vs/workbench/workbench.common.main.ts`. Les autres surfaces à conflits sont recensées dans
[`docs/upstream-sync.md`](upstream-sync.md).

## Contraintes techniques établies

Vérifiées dans le code, pas supposées. Elles ont écarté l'architecture qu'on choisirait
spontanément et méritent d'être relues avant S2-06.

- Le SDK Anthropic est inutilisable depuis la couche `browser`. Trois verrous se cumulent :
  `eslint.config.js` n'autorise aucun module npm sous `hasBrowser`, `packages: 'external'` dans
  `build/lib/optimize.ts` empêche esbuild d'empaqueter le SDK, et `@anthropic-ai/sdk@0.82.0`
  n'expose aucun bundle UMD que `importAMDNodeModule` pourrait charger. L'appel réseau vivra donc
  en couche `node`, atteinte par canal IPC.
- Placer le service réseau en couche `node` ne protège pas la clé. `ISecretStorageService` est un
  service du rendu : la clé est déchiffrée là quelle que soit l'architecture. Le choix se justifie
  par l'empaquetage, pas par la confidentialité.
- Le service de conversation est en `common/` et non `browser/`, parce que
  `test/unit/node/index.js` exclut `**/browser/**/*.test.js` de son glob : un test placé sous
  `test/browser/` ne serait jamais exécuté par `npm run test-node`.
- `claude-opus-5` est absent de l'union de modèles du SDK installé. La chaîne passe en `string`,
  mais un 404 `model` au premier appel réel signalerait un SDK trop ancien.

## Vérification

| Commande | Portée |
|---|---|
| `npm run typecheck-client` | sources sous `src/` |
| `npm run test-node` | tests unitaires Node, dont le service de conversation |
| `npm run valid-layers-check` | respect des couches, requis dès qu'une cible est ajoutée |
| `npm run eslint` | règles du dépôt, dont `local/code-import-patterns` |
| `npm run compile` puis `./scripts/code.bat` | vérification manuelle du panneau |

Une transpilation (`node build/next/index.ts transpile`) est nécessaire avant `test-node` après
l'ajout d'un fichier, sinon le test n'existe pas dans `out/`.

## Historique des commits

| Commit | Contenu |
|---|---|
| `cae402aeb53` | identité produit, CI fork, documentation de build |
| `482d035f515` | empaquetage Windows, images de marque, revue de licences |
| `f456c06334f` | README, CONTRIBUTING, SECURITY |
| `8a251237f77` | spec de conception du chat de bout en bout (S2-03 à S2-07) |
| `f19225f6476` | panneau de chat et service de conversation (S2-02, S2-03) |

## Hors périmètre actuel

Les références `@file` / `@folder` / `@codebase`, l'édition inline, les diffs, l'indexation,
l'agent multi-fichiers, l'exécution des tests et tout second fournisseur de modèles. La frontière
`ISlateChatProvider` et l'ordre de rendu `tools` → `system` → `messages` sont posés dès maintenant
pour que ces items n'exigent pas de remaniement.
