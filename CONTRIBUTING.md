# Contribuer à Slate

Merci de l'intérêt porté à Slate. Ce document décrit comment signaler un problème et
proposer un correctif.

Slate est un fork de [Code - OSS](https://github.com/microsoft/vscode) (licence MIT). Les
problèmes qui existent aussi dans Code - OSS relèvent du dépôt amont ; voir
[docs/upstream-sync.md](docs/upstream-sync.md) pour la façon dont les deux dépôts sont
tenus à jour.

## Signaler un problème

Avant d'ouvrir un ticket, chercher dans les [tickets existants](https://github.com/ZEBDA/slate/issues).

### Déterminer le bon dépôt

- le problème se reproduit-il dans Code - OSS ou dans Visual Studio Code ? Si oui, il
  vient de l'amont : le signaler [chez Microsoft](https://github.com/microsoft/vscode/issues)
  profite à tout le monde, y compris à nous ;
- le problème disparaît-il en désactivant toutes les extensions ? Si oui, il appartient
  à l'extension concernée ;
- sinon, c'est un ticket pour Slate.

### Contenu d'un bon rapport

Un ticket par problème. Inclure :

- la version de Slate (menu Aide, ou `slate --version`) ;
- le système d'exploitation ;
- les extensions installées ;
- les étapes de reproduction, numérotées ;
- le comportement attendu et le comportement observé ;
- les erreurs de la console de développement (Aide > Basculer les outils de développement) ;
- un extrait de code ou un dépôt minimal reproduisant le problème — en texte, pas en image :
  il doit pouvoir être copié.

## Proposer un correctif

1. compiler le projet en suivant [docs/build.md](docs/build.md) ;
2. travailler sur une branche dédiée, jamais sur `slate/main` ;
3. lancer les tests concernés avant de proposer la modification (voir §5 de `docs/build.md`) ;
4. ouvrir une *pull request* décrivant le problème résolu et ce qui a été testé.

Les modifications touchant des fichiers repris d'upstream méritent une attention
particulière : chaque divergence est à re-appliquer à chaque synchronisation. Préférer une
correction minimale et commentée à une réécriture, et documenter la divergence si elle est
structurelle.

## Marques

Slate ne peut pas employer les marques « Visual Studio Code », « VS Code » ni le logo de
VS Code : la licence MIT couvre le code, pas les marques. Les contributions ne doivent pas
réintroduire ces chaînes dans les éléments visibles de l'application, ni reprendre les
images d'origine. Voir [docs/licensing.md](docs/licensing.md).

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous la licence
[MIT](LICENSE.txt) du projet.
