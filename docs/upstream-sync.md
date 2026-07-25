# Synchronisation avec Code - OSS

## Organisation des remotes

| Remote | URL | Usage |
|---|---|---|
| `upstream` | `https://github.com/microsoft/vscode.git` | lecture seule |
| `origin` | dépôt Slate (à créer) | développement |

Le push vers `upstream` est volontairement désactivé :

```bash
git remote set-url --push upstream DISABLED_no_push_to_upstream
```

## Branches

| Branche | Rôle |
|---|---|
| `main` | miroir d'`upstream/main`, jamais modifiée localement |
| `slate/main` | branche produit, porte tous nos changements |
| `slate/<feature>` | branches de travail, fusionnées dans `slate/main` |

Base actuelle : `upstream/main` @ `ac73800ea37` (version `1.131.0`).

## Procédure de synchronisation

```bash
# 1. rafraîchir le miroir
git fetch upstream
git checkout main
git merge --ff-only upstream/main

# 2. reporter sur la branche produit
git checkout slate/main
git merge main
```

Le `merge` est préféré au `rebase` : l'historique d'upstream est volumineux et un rebase
réécrirait nos commits à chaque synchronisation.

## Surfaces à conflits

Nos modifications sont concentrées volontairement pour limiter les conflits :

| Chemin | Contenu | Risque de conflit |
|---|---|---|
| `product.json` | identité produit (24 champs) | élevé — upstream y touche souvent |
| `build/win32/` | icônes et bitmaps d'installateur | faible |
| `src/vs/workbench/contrib/slate/` | code IA propre à Slate | nul — chemin inexistant en amont |
| `docs/` | documentation Slate | nul |
| `.github/workflows/slate-*.yml` | CI Slate | nul |

Règle de conception : tout nouveau code Slate vit sous un chemin `slate/` dédié plutôt
qu'inséré dans les fichiers existants. Les points d'accroche dans le code d'upstream sont
réduits au minimum (enregistrement de contributions, entrées de `package.json`).

## Après chaque synchronisation

1. `npm ci` — les dépendances d'upstream changent fréquemment ;
2. vérifier les modules natifs (voir `docs/build.md`) ;
3. `npm run compile` ;
4. `npm run test-node` — comparer au résultat de référence ;
5. lancer l'application et vérifier que le panneau Slate se charge ;
6. relire le diff de `product.json` : un champ ajouté en amont peut réintroduire un nom
   ou une URL Microsoft.

## Points de vigilance juridiques

- ne jamais réintroduire les marques « Visual Studio Code » ou « VS Code » dans les
  chaînes visibles ;
- `LICENSE.txt` (MIT) et les attributions de `cgmanifest.json` doivent être conservés ;
- les extensions intégrées (`builtInExtensions` de `product.json`) proviennent du
  Marketplace Microsoft : vérifier les conditions d'utilisation avant redistribution.
