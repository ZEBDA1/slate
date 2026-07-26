# Compiler Slate sur Windows

Slate est un fork de [Code - OSS](https://github.com/microsoft/vscode) (licence MIT).
Ce document décrit l'environnement de compilation vérifié sur Windows x64.

## 1. Prérequis

| Composant | Version vérifiée | Notes |
|---|---|---|
| Node.js | 24.18.0 | doit correspondre à `.nvmrc` |
| npm | 11.16.0 | fourni avec Node 24 |
| Python | 3.14.6 | requis par node-gyp |
| Git | 2.55 | |
| Visual Studio Build Tools | 2022 (17.14.37) | charge de travail C++ |
| MSVC toolset | 14.44.35207 | |
| Windows SDK | 10.0.26100 | |
| Bibliothèques Spectre | pour MSVC 14.44 | **indispensable** — voir ci-dessous |

Espace disque : prévoir **~15 Go** (dépôt 2,2 Go + `node_modules` 1,7 Go + `out` 320 Mo +
binaire Electron 232 Mo + cache npm).

### Installation des outils C++

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools `
  --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Les bibliothèques Spectre ne sont **pas** incluses dans la charge de travail C++ et doivent
être ajoutées séparément. Sans elles, la compilation des modules natifs échoue avec
`MSB8040: des bibliothèques avec atténuations de Spectre sont nécessaires pour ce projet`.

Depuis un terminal **élevé** (administrateur) :

```powershell
& "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe" modify `
  --productId Microsoft.VisualStudio.Product.BuildTools `
  --channelId VisualStudio.17.Release `
  --add Microsoft.VisualStudio.Component.VC.Runtimes.x86.x64.Spectre `
  --includeRecommended --quiet --norestart
```

Deux pièges rencontrés lors de la mise en place :

- `setup.exe` refuse `--quiet` / `--passive` depuis un shell non élevé et sort avec le
  code `5007`. L'élévation doit être obtenue **avant** de lancer la commande.
- `--installPath "C:\Program Files (x86)\..."` est tronqué à `C:\Program` par l'analyseur
  d'arguments et provoque un échec silencieux (code `1`). Identifier l'instance par
  `--productId` + `--channelId` évite le problème.

Vérification :

```bash
ls "C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207/lib/spectre/x64/libcmt.lib"
```

## 2. Dépendances

```bash
npm ci    # ou: npm install
```

Réglages utiles si la connexion est instable (`ECONNRESET` en cours de téléchargement) :

```bash
npm install --fetch-retries=6 --fetch-retry-maxtimeout=180000 --fetch-timeout=900000
```

Ne pas modifier le `.npmrc` du dépôt : il porte la configuration node-gyp/Electron
(`disturl`, `target`, `runtime`, `build_from_source`) nécessaire à la compilation des
modules natifs contre les en-têtes d'Electron.

### Vérifier les modules natifs

Un `npm install` interrompu (réseau, Spectre manquant) laisse des modules natifs sans
binaire compilé, **sans erreur au log** : npm considère leur script `install` comme déjà
exécuté et ne le rejoue pas. L'application compile alors correctement mais crashe au
démarrage.

Contrôle systématique :

```bash
for d in $(find node_modules -name binding.gyp -not -path '*/node_modules/*/node_modules/*' | xargs -n1 dirname); do
  ls "$d"/build/Release/*.node >/dev/null 2>&1 || echo "MANQUE: $d"
done
```

Attendu : **35 fichiers `.node`**. Deux modules apparaissent légitimement comme
« manquants » et doivent être ignorés :

- `@vscode/fs-copyfile` — `binding.gyp` déclare `"type": "none"` hors macOS ;
- `cpu-features` — désactivé (`"cpu-features": false`) dans `package.json`.

Réparation d'un module :

```bash
npm rebuild @vscode/policy-watcher @vscode/sqlite3 kerberos @vscode/windows-ca-certs
```

## 3. Compilation

```bash
npm run compile
```

Durée observée : ~50 s (incrémental ensuite). Produit `out/` (~320 Mo) dont `out/main.js`.

## 4. Lancement

```bash
./scripts/code.bat
```

Le binaire Electron est téléchargé au premier lancement dans
`.build/electron/<nameShort>.exe`. Les scripts résolvent ce nom depuis le champ
`nameShort` de `product.json` : après un changement de nom de produit, relancer
`node build/lib/electron.ts` pour renommer le binaire, sinon le lancement échoue.

## 5. Tests

```bash
npm run test-node          # tests unitaires Node
./scripts/test.bat         # tests unitaires Electron
npm run test-build-scripts # tests des scripts de build (build/**/*.test.ts)
```

Résultat de référence pour `test-node` : **12 678 réussis, 180 en attente, 1 échec**.

Références pour les scripts de build : **229 tests, 17 fichiers, 0 échec**.

Attention, `npm run test-build-scripts` **donne un faux vert sous Git Bash** : le script est
`node --test '{lib,next,agent-sdk,codex}/**/*.test.ts'`, et le glob entre apostrophes n'est
pas étendu par ce shell. Node ne trouve aucun fichier, affiche `tests 0` et sort avec le
code 0. Toujours lire le nombre de tests, pas seulement le code de sortie. Contournement :

```bash
cd build && node --test $(find lib next agent-sdk codex -name '*.test.ts')
```

Le typage des scripts de build se contrôle par `cd build && npm run typecheck` (et non par
un `tsconfig.build.json`, qui n'existe pas).

L'unique échec attendu est `Request Service > Kerberos lookup`. Le test compare le message
d'erreur système à une liste de chaînes **en anglais** ; sur un Windows en français il
reçoit « Aucune information d'identification n'est disponible dans le package de
sécurité » et échoue. C'est un artefact de locale, pas une régression.

## 6. Empaquetage et installateur

```bash
npm run gulp vscode-win32-x64-min-ci          # application minifiée
npm run gulp vscode-win32-x64-inno-updater    # outils requis par l'installateur
npm run gulp vscode-win32-x64-user-setup      # installateur utilisateur
```

Sorties :

| Chemin | Contenu |
|---|---|
| `../VSCode-win32-x64/Slate.exe` | application non empaquetée (~232 Mo) |
| `.build/win32-x64/user-setup/SlateUserSetup.exe` | installateur utilisateur (~217 Mo) |
| `.build/win32-x64/system-setup/SlateSetup.exe` | installateur système |

Le dossier parent `VSCode-win32-x64` est codé en dur en amont (`buildPath` dans
`build/gulpfile.vscode.win32.ts`) et référencé par d'autres scripts de build. Il n'est pas
visible de l'utilisateur final : il est laissé tel quel pour limiter les conflits de
synchronisation.

Cinq pièges dans cet ordre d'exécution :

- `vscode-win32-x64-min-ci` échoue avec `spawn signtool.exe ENOENT`. `signtool.exe`
  appartient au Windows SDK et n'est **pas** dans le `PATH` par défaut ; les pipelines
  amont l'y ajoutent explicitement. Il n'est utilisé que pour retirer une signature
  Authenticode avant une resignature ESRP, que nous ne faisons pas : `hasAuthenticodeSignature`
  traite désormais `ENOENT` comme « binaire non signé » plutôt que de propager l'erreur.
  Le piège est sournois car l'exception survient **avant** `patchWin32Dependencies` et
  laisse un paquet incomplet dont l'installateur se construit quand même — en 5 min au
  lieu de 13, seul indice visible.
- une fois `signtool` contourné, `vscode-win32-x64-min-ci` échoue plus loin avec
  `rcedit.exe failed with exit code 1. Unable to load file: ...x64-linux/audio-capture.node`.
  `patchWin32Dependencies` applique `rcedit` à tous les `**/*.node` du paquet, mais certaines
  dépendances embarquent leurs binaires natifs pour **toutes** les plateformes :
  `@anthropic-ai/claude-agent-sdk` fournit six `vendor/audio-capture/<arch>-<os>/audio-capture.node`,
  dont quatre ELF ou Mach-O que `rcedit` ne sait pas lire. Le correctif teste l'en-tête du
  fichier (`MZ` puis `PE\0\0`, voir `isWindowsPEFile`) plutôt que son chemin : filtrer sur des
  noms de dossiers demanderait une exclusion nouvelle à chaque dépendance ajoutée.
- `vscode-win32-x64-user-setup` échoue avec `No files found matching "...\tools\*"` si
  `vscode-win32-x64-inno-updater` n'a pas été lancé avant : c'est cette tâche qui remplit
  `tools/` (`inno_updater.exe`, `vcruntime140.dll`). L'entrée correspondante de `code.iss`
  n'a pas le drapeau `skipifsourcedoesntexist`, d'où l'échec dur.
- ISCC provient de la dépendance npm `innosetup` (`node_modules/innosetup/bin/ISCC.exe`),
  résolue par `require.resolve('innosetup')`. **Aucune installation système d'Inno Setup
  n'est nécessaire.**
- Durée : ~13 min pour l'installateur (compression LZMA solide). Prévoir large.

Le nom du fichier de sortie est dérivé de `nameShort` par `code.iss`
(`SetupBasename`) : un changement de nom de produit le suit automatiquement.

## 7. Images de marque

Les icônes et bitmaps de Code - OSS ne peuvent pas être réutilisés : le logo de VS Code est
une marque Microsoft, exclue de la licence MIT du code (voir `docs/licensing.md`). Les
images de Slate sont donc générées, pas dessinées à la main :

```bash
python build/slate/generate-branding.py            # écrit dans resources/win32/
python build/slate/generate-branding.py --out /tmp/x   # essai sans toucher au dépôt
```

Dépendance : Pillow (vérifié avec 12.3.0). Produit **17 fichiers** — `code.ico`,
`code_70x70.png`, `code_150x150.png`, et les 7+7 bitmaps `inno-big-*` / `inno-small-*`.

Les dimensions des bitmaps sont imposées par Inno Setup et reprises des fichiers d'origine :
les modifier casse l'assistant d'installation.

Deux points de méthode, tous deux vérifiés sur les pixels produits :

- `code.ico` est rendu **à chaque taille nativement** (16, 32, 128, 256) puis assemblé via
  `append_images`, et non réduit depuis une seule image 256 px : à 16 px les contre-formes
  du « S » se bouchent sinon. Le trait est affiné aux petites tailles (`stroke_ratio`).
- le point d'accent est omis en dessous de 20 px, où il ne fait plus qu'un pixel sale.

Après régénération, relancer l'empaquetage (§6) : les images sont copiées dans l'artefact,
pas lues à l'exécution.
