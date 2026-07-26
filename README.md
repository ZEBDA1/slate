# Slate

Slate est un éditeur de code pour le bureau, avec une intégration IA native. C'est un fork de
[Code - OSS](https://github.com/microsoft/vscode) (licence MIT), le dépôt de code source ouvert
sur lequel repose Visual Studio Code.

Slate n'est pas affilié à Microsoft, ni approuvé par Microsoft. « Visual Studio Code » et
« VS Code » sont des marques de Microsoft Corporation, utilisées ici uniquement pour désigner
le projet d'origine.

État : **en développement**. Sprint 1 terminé — l'application compile, se lance et produit un
installateur Windows sous sa propre identité. Le panneau de chat IA est le sujet du Sprint 2
(voir [`docs/backlog-chat.md`](docs/backlog-chat.md)).

## Compiler et lancer

Plateforme vérifiée : Windows x64. Prévoir ~15 Go d'espace disque et des outils C++.

```bash
npm ci
npm run compile
./scripts/code.bat
```

Les prérequis exacts, les pièges rencontrés et la procédure d'empaquetage sont dans
[`docs/build.md`](docs/build.md). **À lire avant le premier `npm ci`** : les bibliothèques
Spectre de MSVC ne sont pas installées par défaut et leur absence fait échouer la compilation
des modules natifs.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/build.md`](docs/build.md) | prérequis, compilation, tests, empaquetage, images de marque |
| [`docs/upstream-sync.md`](docs/upstream-sync.md) | procédure de synchronisation avec Code - OSS |
| [`docs/licensing.md`](docs/licensing.md) | licences des dépendances et séparation des marques |
| [`docs/backlog-chat.md`](docs/backlog-chat.md) | backlog du panneau de chat IA |

## Extensions intégrées

Le dossier [`extensions`](extensions) contient les extensions livrées avec l'éditeur :
grammaires, extraits de code et prise en charge des langages. Celles dont le nom se termine par
`language-features` fournissent les fonctions riches (suggestions, aller à la définition).

## Contribuer

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md). Les vulnérabilités de sécurité se signalent en privé,
selon [`SECURITY.md`](SECURITY.md) — pas par une issue publique.

## Licence

Le code repris de Code - OSS est sous licence [MIT](LICENSE.txt),
`Copyright (c) 2015 - present Microsoft Corporation` : cet avis est conservé, comme la licence
l'exige. Les ajouts propres à Slate suivent la même licence.

Les marques et logos ne sont pas couverts par la MIT : les images de Slate sont générées par
[`build/slate/generate-branding.py`](build/slate/generate-branding.py) et ne reprennent aucun
élément graphique de Microsoft. Détail dans [`docs/licensing.md`](docs/licensing.md).
