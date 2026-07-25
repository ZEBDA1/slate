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
```

Résultat de référence pour `test-node` : **12 678 réussis, 180 en attente, 1 échec**.

L'unique échec attendu est `Request Service > Kerberos lookup`. Le test compare le message
d'erreur système à une liste de chaînes **en anglais** ; sur un Windows en français il
reçoit « Aucune information d'identification n'est disponible dans le package de
sécurité » et échoue. C'est un artefact de locale, pas une régression.
