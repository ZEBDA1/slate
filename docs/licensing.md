# Licences et marques

Ce document couvre le point §3 du plan produit : revue de la licence MIT, licences des
dépendances, et séparation stricte des marques Microsoft.

État : relevé effectué en fin de Sprint 1 sur la base `upstream/main @ ac73800ea37`
(v1.131.0). À refaire à chaque synchronisation avec upstream (voir `upstream-sync.md`).

## 1. Licence du code repris

Code - OSS est publié sous licence MIT. `LICENSE.txt` porte
`Copyright (c) 2015 - present Microsoft Corporation` : ce fichier **doit être conservé
tel quel** dans le fork et dans toute distribution binaire. La MIT autorise la
modification et la redistribution, y compris commerciale, à condition de maintenir
l'avis de copyright et le texte de licence.

Le fork ajoute ses propres fichiers ; ils héritent de la même licence sauf mention
contraire, ce qui garde l'ensemble cohérent.

## 2. Marques — la limite que la MIT ne couvre pas

Une licence de code ne concède aucun droit sur les marques. Sont donc exclus :

| Élément | Statut |
|---|---|
| « Visual Studio Code », « VS Code » | marques Microsoft — interdites dans nos chaînes visibles |
| logo VS Code (le ruban bleu) | marque figurative — non réutilisable |
| « Code - OSS » | nom du projet amont — évité pour ne pas prêter à confusion |
| code source sous MIT | réutilisable librement |

Corrections appliquées pendant le Sprint 1 :

- `product.json` — 24 champs migrés vers Slate (noms, dossiers de données, mutex,
  identifiants d'installation, protocole d'URL) ;
- `build/win32/code.iss` — `AppPublisher`, les trois URL de support et le nom du
  fichier de sortie ne renvoient plus à Microsoft ni à `code.visualstudio.com` ;
- `build/win32/i18n/messages.*.isl` (13 fichiers) — le message
  `UpdatingVisualStudioCode` contenait « Visual Studio Code » **en clair dans chaque
  langue**. La chaîne est devenue paramétrable (`%1`) et reçoit `NameLong` depuis
  `code.iss` ; la clé garde son nom d'origine, référencée par `inno_updater.exe` ;
- `build/lib/electron.ts` — `companyName`, `copyright` et le nom du HelpBook macOS
  étaient codés en dur sur Microsoft ; ils sont maintenant dérivés de `product.nameLong`.
  Ces valeurs sont **écrites dans l'exécutable** par `@vscode/gulp-electron` : sans cette
  correction, les propriétés de `Slate.exe` affichaient « Microsoft Corporation » ;
- `build/gulpfile.vscode.ts` — même correction pour `patchWin32Dependencies`, qui estampille
  les `.node`, `rg.exe` et DLL du paquet ;
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md` — réécrits. Ce sont les trois fichiers les
  plus visibles du dépôt et ils décrivaient encore le produit de Microsoft. `SECURITY.md`
  était le plus gênant : il renvoyait les signalements de vulnérabilité vers
  `https://aka.ms/SECURITY.md`, canal qui ne traite pas les failles propres à ce fork. Les
  trois documents renvoient désormais vers le dépôt du fork, en conservant la mention
  d'origine et le renvoi vers l'amont quand la faille y existe aussi ;
- `resources/win32/VisualElementsManifest.xml` — `ShortDisplayName` et couleur de fond ;
- `resources/server/manifest.json` — nom du manifeste web ;
- `src/vs/platform/product/common/product.ts` — valeurs de repli en exécution depuis
  les sources (visibles dans le titre de la fenêtre en mode dev) ;
- toutes les images de `resources/win32/` sont regénérées (voir §4).

Restent volontairement inchangés : les identifiants techniques d'extensions
(`ms-vscode.*`, `GitHub.copilot`), les URL d'API de fournisseurs, les fixtures de test
et les commentaires de code. Ce ne sont pas des chaînes visibles par l'utilisateur et
les modifier casserait des fonctionnalités ou des tests.

Un cas mérite d'être signalé : `onboardingKeymaps` de `product.json` affichait une pastille
« VS Code » pour désigner **notre propre** disposition clavier par défaut
(`"id": "vscode"`, « Default keyboard mapping »), visible à l'accueil. Le libellé est
passé à Slate ; l'`id` est conservé, car il est comparé aux éditeurs détectés sur le
disque par `onboardingVariationA.ts`. Les autres libellés de cette liste (Sublime Text,
IntelliJ, Vim, Eclipse, Notepad++) désignent de vrais produits tiers : ce sont des
références nominatives légitimes, à ne pas renommer.

### Vérification

```bash
git grep -nI -e "Visual Studio Code" -e "VS Code" -e "Code - OSS" -e "Microsoft Corporation" -- \
  README.md CONTRIBUTING.md SECURITY.md \
  product.json build/win32 build/lib/electron.ts build/gulpfile.vscode.ts \
  resources src/vs/platform/product
```

Occurrences acceptables : les en-têtes de copyright des fichiers repris d'upstream
(à conserver, cf. §1), les commentaires et les fixtures de test.

**Occurrences non traitées, à corriger avant tout empaquetage non-Windows :** les gabarits
d'empaquetage Linux et APPX portent encore l'identité Microsoft en clair, y compris dans
des champs affichés à l'utilisateur final :

| Fichier | Contenu à reprendre |
|---|---|
| `resources/linux/code.appdata.xml` | `summary`, `description`, `url`, capture d'écran |
| `resources/linux/debian/control.template` | `Maintainer`, `Homepage`, `Description`, `Provides`/`Conflicts`/`Replaces` |
| `resources/linux/debian/templates.template` | invite d'ajout du dépôt apt Microsoft |
| `resources/linux/rpm/code.spec.template` | `Vendor`, `Packager`, `URL`, `%description` |
| `resources/linux/snap/snapcraft.yaml` | `summary`, `description` |
| `resources/win32/appx/AppxManifest.xml` | `Publisher` (`CN=Microsoft Corporation…`), `PublisherDisplayName` |

Ces fichiers ne sont consommés que par les tâches gulp `vscode-linux-*` et la cible APPX,
hors périmètre du MVP Windows : ils n'entrent dans aucun artefact produit à ce jour. Le
`Publisher` de l'APPX doit de toute façon correspondre au certificat de signature, il ne
peut pas être choisi arbitrairement.

## 3. Licences des dépendances

69 dépendances de production, toutes résolues :

| Licence | Nb | Nature |
|---|---|---|
| MIT | 59 | permissive |
| Apache-2.0 | 4 | permissive, clause de brevet |
| BSD-3-Clause | 1 | permissive (`@vscode/sqlite3`) |
| BlueOak-1.0.0 | 1 | permissive (`tar`) |
| CC-BY-4.0 | 1 | `@vscode/codicons` — attribution requise |
| LGPL-2.1+ | 1 | `jschardet` — voir ci-dessous |
| licence propriétaire | 2 | `@github/copilot`, `@vscode/copilot-api` |

Aucune licence copyleft fort (GPL) n'est présente.

Trois points demandent une décision avant toute distribution publique :

1. **`jschardet` (LGPL-2.1+)** — la LGPL tolère l'usage en bibliothèque, mais impose de
   permettre le remplacement du composant et de fournir sa source. Consommé comme module
   npm non modifié, ce qui est le cas d'usage prévu, mais à mentionner dans les
   attributions.
2. **`@vscode/codicons` (CC-BY-4.0)** — attribution obligatoire dans la documentation
   ou l'écran « À propos ».
3. **`@github/copilot` et `@vscode/copilot-api` (licences propriétaires)** — leurs
   conditions ne suivent pas la MIT. Slate fournissant sa propre intégration IA, la piste
   la plus sûre est de **retirer ces dépendances et l'extension `extensions/copilot`**
   plutôt que de les redistribuer. À trancher au Sprint 2 (voir S2-01 du backlog).

Le même raisonnement vaut pour `builtInExtensions` de `product.json` : ces extensions
proviennent du Marketplace Microsoft, dont les conditions d'utilisation interdisent
l'usage en dehors des produits Microsoft. Elles doivent être retirées ou remplacées avant
distribution.

Ce n'est pas théorique : les trois extensions déclarées sont **effectivement présentes dans
l'artefact Windows** produit aujourd'hui (vérifié dans `resources/app/extensions/`) —
`ms-vscode.js-debug` (4 Mo), `ms-vscode.js-debug-companion` (1 Mo) et
`ms-vscode.vscode-js-profile-table` (3 Mo). Elles sont téléchargées depuis le Marketplace
au moment de l'installation des dépendances, pas reprises du dépôt. Le retrait est donc un
prérequis de distribution, pas un nettoyage cosmétique ; il coûte le débogueur JavaScript,
d'où l'arbitrage à porter au Sprint 2 avec S2-01.

`ThirdPartyNotices.txt` et `cgmanifest.json` (14 enregistrements) sont hérités d'upstream
et doivent être conservés puis complétés, non remplacés.

## 4. Images de marque

Les icônes et bitmaps de Code - OSS ne peuvent pas être réutilisés. Ils sont produits par
un script, de sorte que le dépôt porte la définition du logo et non des binaires opaques :

```bash
python build/slate/generate-branding.py          # écrit dans resources/win32/
python build/slate/generate-branding.py --out /tmp/x   # essai sans toucher au dépôt
```

17 fichiers : `code.ico` (16/32/128/256 px rendus chacun à sa taille propre), deux
tuiles PNG, et les 14 bitmaps d'assistant d'installation aux dimensions exactes
imposées par Inno Setup.

## 5. Point non résolu — antériorité du nom « Slate »

**Aucune recherche d'antériorité n'a été faite.** « Slate » est un mot courant et le nom
est déjà utilisé par d'autres produits logiciels. Avant toute distribution publique ou
enregistrement de domaine, il faut vérifier les bases de marques (INPI pour la France,
EUIPO pour l'UE, USPTO pour les États-Unis) sur les classes 9 et 42.

Tant que cette vérification n'est pas faite, le nom doit être considéré comme provisoire.
Il est concentré dans `product.json` et dans le script d'images, ce qui rend un changement
peu coûteux.
