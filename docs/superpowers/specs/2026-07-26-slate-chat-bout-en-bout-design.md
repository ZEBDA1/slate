# Chat Slate fonctionnel de bout en bout — conception

Date : 2026-07-26. Périmètre : items S2-03 à S2-07 de [`docs/backlog-chat.md`](../../backlog-chat.md).

Objectif de la tranche : le panneau de chat de Slate envoie un message à Claude, affiche la
réponse au fur et à mesure, peut être interrompu, et montre à l'utilisateur le contexte joint
avant l'envoi. Fin de la tranche : la mention « Design preview » disparaît de la vue.

## 1. Contraintes vérifiées dans le dépôt

Ces sept points ont été lus dans le code, pas supposés. Ils déterminent l'architecture et
expliquent pourquoi elle n'est pas celle qu'on choisirait spontanément.

| Constat | Source | Conséquence |
|---|---|---|
| `connect-src 'self' https: ws:` | `src/vs/code/electron-browser/workbench/workbench.html` | La sortie réseau est déjà permise. Aucune modification de CSP. |
| `'when': 'hasBrowser', 'allow': []` | `eslint.config.js` (règle `local/code-import-patterns`) | La couche `browser` n'a droit à aucun module npm. |
| `@anthropic-ai/sdk` autorisé pour la seule cible `src/vs/platform/agentHost/~`, absent des restrictions de `src/vs/platform/*/~` | `eslint.config.js` | Une nouvelle cible `platform` doit être déclarée explicitement. |
| `packages: 'external'` | `build/lib/optimize.ts` | esbuild n'empaquette aucun module npm dans le workbench. |
| La couche `browser` charge `@xterm/xterm` via `importAMDNodeModule(nom, 'lib/xterm.js')`, qui injecte une balise script vers **un fichier UMD unique** | `src/vs/base/browser/amd.ts`, `node_modules/@xterm/xterm/lib/xterm.js` | Ce contournement exige un bundle UMD préexistant. |
| `@anthropic-ai/sdk@0.82.0` n'expose ni `dist/`, ni UMD, ni bundle — seulement ESM et CJS éclatés (`core/`, `internal/`, `_vendor/`, `helpers/`) | `node_modules/@anthropic-ai/sdk` | Le contournement précédent est inapplicable. |
| `src/vs/code/~` ne peut importer que `vs/base`, `vs/base/parts`, `vs/platform/*/~`, `vs/editor`, `vs/code` — jamais `vs/workbench/contrib/**` | `eslint.config.js` | Le service réseau ne peut pas vivre sous `contrib/slate/` : le bootstrap du processus partagé ne pourrait pas l'atteindre. |

Deux corrections par rapport aux hypothèses de départ de la discussion :

- **Le SDK est inutilisable depuis le rendu.** Les trois derniers verrous se cumulent. Le rendre
  possible imposerait d'ajouter au build une étape de pré-empaquetage du SDK — une pièce
  d'infrastructure absente du backlog. Upstream ne le fait pas non plus : les seuls fichiers qui
  importent réellement le SDK sont sous `src/vs/platform/agentHost/node/claude/`, et le rendu les
  atteint par canaux IPC.
- **Placer le service en couche `node` ne protège pas la clé.** `ISecretStorageService` est un
  service du rendu (`src/vs/workbench/services/secrets/electron-browser/secretStorageService.ts`,
  adossé à `IStorageService` et `IEncryptionService`). La clé est déchiffrée dans le rendu quelle
  que soit l'architecture, puis transmise au processus partagé. Le choix de la couche `node` se
  justifie par l'empaquetage, pas par la confidentialité.

## 2. Architecture

Trois unités, chacune avec une responsabilité unique et une frontière explicite.

```
src/vs/platform/slateChat/
  common/slateChatProvider.ts     interface ISlateChatProvider, nom de canal, types d'événements
  node/slateChatProviderService.ts implémentation SDK (seul fichier qui connaît Anthropic)
  test/node/                       tests de la traduction d'événements et des erreurs

src/vs/workbench/contrib/slate/
  common/slateChatModel.ts         modèle de messages, indépendant du fournisseur
  common/slateChatService.ts       historique et transitions d'état
  browser/slateChatView.ts         rendu (existant, à brancher)
  browser/slateChatApiKey.ts       commandes de saisie et d'effacement de la clé
  electron-browser/slateChatProviderClient.ts  ProxyChannel.toService vers le canal
  test/common/                     tests du service de conversation
```

`slateChatService.ts` est en `common/` et non en `browser/` : `test/unit/node/index.js` exclut
`**/{browser,electron-browser,electron-main,electron-utility}/**/*.test.js` de son glob, donc un
test placé sous `test/browser/` ne serait jamais exécuté par `npm run test-node` — ce que S2-03
exige. Le service n'a de toute façon aucune dépendance au DOM.

Le flux d'un message : la vue appelle `SlateChatService` (couche `common`) ; celui-ci lit la clé
via `ISecretStorageService`, assemble la requête à partir du modèle et du contexte joint, puis
appelle `ISlateChatProvider` ; en desktop cette interface est câblée par
`slateChatProviderClient.ts` sur le canal IPC du processus partagé, où
`SlateChatProviderService` parle au SDK. Les deltas remontent en sens inverse et la vue les
accumule dans le dernier message assistant.

**Le seul fichier qui connaît le format Anthropic est `slateChatProviderService.ts`.** Il traduit
les événements SSE en `ISlateChatStreamEvent` définis dans `common/`. Aucune autre partie de
Slate ne voit un type du SDK. C'est ce qui rendra un second fournisseur possible sans toucher ni
la vue ni le service de conversation, conformément à l'ADR 001.

### Limite connue

`ISlateChatProvider` n'est câblé que dans `workbench.desktop.main.ts`. Une build web (non
produite par Slate aujourd'hui) enregistrerait la vue sans fournisseur. Le service de
conversation doit donc traiter l'absence de fournisseur comme une erreur lisible, pas comme une
exception d'injection. Une implémentation nulle sera ajoutée le jour où une build web existera.

## 3. Modèle de données (S2-03)

Dans `contrib/slate/common/slateChatModel.ts` :

- `ISlateChatMessage { id, role: 'user' | 'assistant', parts, state }`
- `parts` : `{ type: 'text', value }` | `{ type: 'reasoning', value }` | `{ type: 'attachment', uri, label, value }`
- `state` : `'pending' | 'streaming' | 'complete' | 'cancelled' | 'failed'`

Dans `platform/slateChat/common/slateChatProvider.ts`, les événements du fournisseur :
`text-delta`, `reasoning-delta`, `usage`, `done`, `error`. Rien d'autre ne franchit la frontière.

`SlateChatService` (`contrib/slate/common/slateChatService.ts`) tient l'historique en mémoire et
est le seul écrivain de ses messages. Il expose l'ajout d'un tour utilisateur et d'un tour
assistant, l'application des deltas, et les trois transitions terminales — rien de réseau : c'est
le client de fournisseur de S2-06 qui le pilotera à mesure que les événements arrivent.

Le générateur d'identifiants est un paramètre de constructeur avec la vraie implémentation par
défaut, ce qui permet aux tests d'affirmer sur des messages entiers sans cast `any` ni global
truqué, conformément aux instructions du dépôt. C'est aussi pourquoi l'enregistrement du singleton
passe par la surcharge `SyncDescriptor` : la surcharge à constructeur exige que tout paramètre soit
un service.

Tests sous `contrib/slate/test/common/`, exécutés par `npm run test-node`.

## 4. Protocole IPC

`ProxyChannel.fromService` côté processus partagé, `ProxyChannel.toService` côté rendu — le
motif utilisé par `localTerminalBackend.ts` et `mcpGatewayService.ts`.

Le flux de deltas passe par un événement dynamique : `ProxyChannel` reconnaît comme événement
toute propriété en `on[A-Z]`, et comme événement paramétré toute propriété en `onDynamic[A-Z]`
(`src/vs/base/parts/ipc/common/ipc.ts`). L'interface expose donc :

- `startRequest(request: ISlateChatRequest): Promise<string>` — renvoie un identifiant de requête
- `onDynamicStreamEvent(requestId: string): Event<ISlateChatStreamEvent>`
- `cancelRequest(requestId: string): Promise<void>`
- `countTokens(request: ISlateChatRequest): Promise<number>`

L'annulation est un appel explicite plutôt qu'un événement : les instructions du dépôt
demandent de ne pas piloter le contrôle de flux par des événements. Le `CancellationToken` de la
vue déclenche `cancelRequest`, qui côté `node` interrompt le flux SDK.

## 5. Clé API (S2-05, avant tout code réseau)

`ISecretStorageService`, clé `slate.chat.apiKey.anthropic`. Commandes `Slate: Set API Key`
(saisie masquée via `IQuickInputService`) et `Slate: Clear API Key`. Jamais dans les settings
JSON, qui sont synchronisés et lisibles en clair. Aucune journalisation de la valeur : les logs
ne portent que l'identifiant de requête.

Vérification exigée par le backlog : après saisie, `grep` récursif sur le dossier de données
`.slate` pour confirmer que la clé n'y apparaît pas en clair. Aucune ligne de S2-06 n'est écrite
avant que ce contrôle passe.

### Trajet de la clé

À expliciter, parce que c'est le point où une implémentation approximative crée une fuite
durable. La clé est déchiffrée dans le rendu par `ISecretStorageService`, puis transmise au
processus partagé **dans le champ `apiKey` de chaque `ISlateChatRequest`**, à chaque requête.

Trois conséquences contraignantes pour l'implémentation :

- `SlateChatProviderService` ne met la clé en cache ni sur disque, ni dans un champ d'instance :
  elle vit le temps de la requête. Le client `Anthropic` est donc construit par requête, pas une
  fois pour toutes.
- Aucune journalisation de `ISlateChatRequest` dans son ensemble, des deux côtés du canal. Les
  traces ne portent que l'identifiant de requête, le modèle et les compteurs de jetons. Un
  `logService.trace(JSON.stringify(request))` écrirait la clé dans les logs — c'est précisément ce
  que S2-05 interdit.
- La clé ne figure dans aucun message d'erreur remonté à la vue, y compris en 401.

## 6. Appel du modèle, streaming, annulation, erreurs (S2-06)

Modèle `claude-opus-5`. Points d'API qui contraignent le code :

- `client.messages.stream()`, deltas `text_delta` et `thinking_delta`, message complet par
  `finalMessage()`. Le streaming est obligatoire à `max_tokens` élevé (64 000 prévu) sous peine
  d'expiration HTTP.
- `thinking: { type: 'adaptive', display: 'summarized' }`, passé explicitement. Sur Opus 5 la
  réflexion est active par défaut et `max_tokens` plafonne réflexion et texte ensemble. Les types
  installés documentent `display` comme valant `'summarized'` par défaut ; on l'écrit tout de même,
  parce que la valeur effective diffère selon le modèle et qu'un `'omitted'` silencieux se traduit
  par une longue pause sans texte à l'écran.
- `temperature`, `top_p`, `top_k` et `budget_tokens` renvoient 400. Aucun réglage d'aléa : tout
  passe par le prompt.
- `stop_reason: 'refusal'` arrive en HTTP 200. Il faut le tester **avant** de lire `content`,
  sinon l'accès au premier bloc plante.

Vérifié dans `node_modules/@anthropic-ai/sdk` (version installée : 0.82.0) :

| Élément | État dans le SDK installé | Décision |
|---|---|---|
| `ThinkingConfigAdaptive` avec `display: 'summarized' \| 'omitted'` | présent hors bêta (`resources/messages/messages.d.ts`) | utilisable tel quel |
| `stream.abort()` et `AbortController` | présents | support de l'annulation |
| `output_config` | présent uniquement sur les chemins bêta (`resources/beta/`) | **abandonné de la tranche** — pas de `effort`, l'orientation de la réponse passe par le prompt système |
| repli serveur (`fallbacks`) | absent des types | **abandonné de la tranche** ; à reconsidérer lors d'une montée de version |
| `claude-opus-5` comme identifiant connu | absent de l'union de modèles | la chaîne est acceptée en `string`, mais à contrôler au premier appel réel : un 404 `model` signalerait un SDK trop ancien pour ce modèle |

Ces deux abandons évitent une montée de version de `@anthropic-ai/sdk` dans `package.json`, qui
est la surface à conflits la plus coûteuse du tableau §9. Aucun cast pour contourner un type
manquant : ce qui n'est pas typé n'entre pas dans la tranche.

Erreurs traitées du plus précis au plus général, chacune avec un message localisé :
`AuthenticationError` (401 — propose la commande de saisie de clé), `RateLimitError` (429 — lit
`retry-after`), `APIError` de type `overloaded_error` (529 — réessai avec recul),
`APIConnectionError` (réseau). Jamais d'exception silencieuse : le message assistant passe à
l'état `failed` et l'erreur s'affiche dans la conversation.

## 7. Rendu (S2-04)

Le bouton d'envoi, aujourd'hui désactivé avec le titre « Conversation service coming next », se
branche sur le service. Liste de messages, rendu Markdown et coloration syntaxique repris des
utilitaires existants du workbench — aucun rendu maison. Les deltas s'accumulent dans le dernier
message assistant ; la réflexion résumée s'affiche dans une zone repliable distincte du texte
final. Accessible au clavier et au lecteur d'écran : le flux entrant est annoncé sans être répété
à chaque delta.

## 8. Contexte, cache et comptage (S2-07)

Le fichier actif et la sélection sont joints comme `parts` de type `attachment`, visibles et
retirables avant envoi — l'exigence de transparence du plan produit. Deux commandes les ajoutent.

Le cache de prompt est un **préfixe**, d'où l'ordre de rendu `tools` → `system` → `messages` : le
prompt système figé porte `cache_control: { type: 'ephemeral' }`, les pièces jointes viennent
ensuite, la question de l'utilisateur après le dernier point de rupture. Aucun horodatage ni
identifiant de session dans le préfixe, sinon rien ne se met en cache. Minimum 512 jetons sur
Opus 5. Contrôle : `usage.cache_read_input_tokens` doit devenir non nul sur des requêtes
répétées ; s'il reste à zéro, un invalidateur traîne dans le préfixe.

Comptage : `client.messages.countTokens()` comme source de vérité, exposé par `countTokens` sur
le canal, débouncé et annulable puisque c'est un appel réseau. Un décompte local approximatif
assure le retour immédiat pendant la frappe. Avertissement au-delà d'un seuil configurable.
Pas de `tiktoken` : c'est le tokeniseur d'OpenAI, il sous-compte Claude d'environ 15 à 20 % sur
du texte courant et davantage sur du code.

## 9. Fichiers d'upstream touchés

À reporter dans le tableau des surfaces à conflits de [`docs/upstream-sync.md`](../../upstream-sync.md).

| Fichier | Modification | Risque |
|---|---|---|
| `eslint.config.js` | cible `src/vs/platform/slateChat/~` autorisant `@anthropic-ai/sdk` | moyen |
| `src/vs/code/electron-utility/sharedProcess/sharedProcessMain.ts` | enregistrement du canal | moyen |
| `src/vs/workbench/workbench.desktop.main.ts` | import du client de fournisseur | faible |
| `src/vs/workbench/workbench.common.main.ts` | déjà modifié en S2-02 | faible |
| `package.json` | seulement si le SDK doit être relevé (§6) | élevé |

## 10. Vérification

- `npm run test-node` : tests du service de conversation et de la traduction d'événements.
- `npm run valid-layers-check` : la tranche ajoute une cible de couche, ce contrôle est requis.
- `npm run compile`, puis lancement de l'application : un échange réel, une annulation en cours
  de flux, et une clé invalide donnant un message lisible.
- `grep` sur `.slate` après saisie de la clé (§5).

## 11. Hors périmètre

Les références `@file` / `@folder` / `@codebase`, l'édition inline, les diffs, l'indexation,
l'agent multi-fichiers, l'exécution des tests et tout second fournisseur de modèles. L'ordre
`tools` → `system` → `messages` et la frontière `ISlateChatProvider` sont posés dès maintenant
pour que ces items n'exigent pas de remaniement.
