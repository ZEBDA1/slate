# Backlog — Panneau de chat IA (Sprint 2)

Prépare l'item « panneau de chat IA » du MVP. Les tâches sont ordonnées : chacune
s'appuie sur les précédentes et reste vérifiable de bout en bout.

État : rédigé en fin de Sprint 1. Aucune ligne de code IA n'est encore écrite.

## Contexte technique constaté

Le fork est sur `slate/main`, basé sur upstream `ac73800ea37` (v1.131.0).

Deux points relevés pendant le Sprint 1 qui pèsent sur ce sprint :

- Upstream embarque déjà une extension `extensions/copilot` et un « agent host »
  (canaux `agentHostClientByokLm`, `agentHostClientProxy` visibles au démarrage).
  Il faut décider si Slate greffe son chat à côté ou réutilise cette plomberie.
- Le point d'extension à privilégier est `src/vs/workbench/contrib/`, chaque
  contribution y étant isolée dans son dossier (`slate/` pour nous).

## S2-01 — Décider de la stratégie vis-à-vis de l'agent host upstream

Avant tout code. Trois options : réutiliser l'agent host existant, le contourner
avec un service Slate autonome, ou le désactiver.

Livrable : une note de décision courte dans `docs/adr/001-agent-host.md`.

Critère d'acceptation : la note tranche explicitement et liste ce qui est
réutilisé, ce qui est écrit à neuf.

## S2-02 — Squelette du panneau de chat

Créer `src/vs/workbench/contrib/slate/browser/` avec une vue enregistrée dans le
panneau latéral, une icône, un titre, et un contenu vide.

Critère d'acceptation : la vue s'ouvre via la palette de commandes
(`Slate: Open Chat`) et survit à un rechargement de fenêtre. `npm run compile`
sans erreur.

## S2-03 — Service de conversation (sans réseau)

Modèle de données des messages, historique en mémoire, service enregistré dans
l'injecteur de dépendances. Aucun appel réseau à ce stade.

Critère d'acceptation : tests unitaires du service sous
`src/vs/workbench/contrib/slate/test/`, exécutés par `npm run test-node`.

## S2-04 — Rendu des messages et saisie

Liste de messages (utilisateur/assistant), zone de saisie multiligne, envoi au
clavier. Rendu Markdown en réutilisant les utilitaires existants du workbench.

Critère d'acceptation : un échange simulé s'affiche correctement, y compris les
blocs de code avec coloration syntaxique. Accessible au clavier et au lecteur
d'écran.

## S2-05 — Stockage sécurisé de la clé API

Utiliser le service de secrets du workbench, jamais les settings JSON (qui sont
synchronisés et lisibles en clair). Commande de saisie et d'effacement.

Critère d'acceptation : la clé survit à un redémarrage, n'apparaît dans aucun
fichier de configuration ni dans les logs. Vérifier explicitement par un grep
sur le dossier de données `.slate` après saisie.

Note de sécurité : ce point conditionne S2-06. Ne pas coder l'appel réseau avant
que le stockage soit en place, pour éviter toute clé en dur transitoire.

## S2-06 — Appel du fournisseur de modèles avec réponse en streaming

Un seul fournisseur pour commencer. Streaming incrémental dans la vue,
annulation via `CancellationToken`, gestion des erreurs réseau et des 401/429
avec un message lisible.

Critère d'acceptation : une réponse s'affiche au fur et à mesure ; l'annulation
interrompt réellement la requête ; une clé invalide produit un message clair et
non une exception silencieuse.

## S2-07 — Ajout du fichier actif et de la sélection au contexte

Deux commandes, plus un indicateur visuel de ce qui est joint. Compter les
tokens approximativement et avertir au-delà d'un seuil.

Critère d'acceptation : le contenu joint est visible et retirable avant envoi.
L'utilisateur voit toujours ce qui part au fournisseur — exigence de transparence
du plan produit.

## Hors périmètre de ce backlog

Les références `@file`/`@folder`/`@codebase`, l'édition inline, les diffs et
l'indexation sont des items MVP distincts, traités après S2-07. L'agent
multi-fichiers et l'exécution des tests viennent plus tard encore.
