# ADR 001 — Architecture du chat Slate

Date : 2026-07-26

Statut : accepté

## Contexte

Code - OSS contient déjà deux ensembles liés à l'IA :

- l'interface de chat du workbench et l'extension intégrée `extensions/copilot` ;
- l'agent host, son protocole de sessions et ses fournisseurs Copilot/Claude.

Ces composants couvrent des scénarios plus larges que le MVP de Slate et sont liés, selon les
chemins, à l'authentification GitHub, aux services Copilot et à leurs contrats produit. Le Sprint 2
demande d'abord un chat simple avec historique local, clé fournisseur conservée dans le service de
secrets, réponse HTTP en streaming et contexte explicitement joint par l'utilisateur.

## Décision

Le premier chat Slate est un composant autonome du workbench. Il ne passe pas par l'agent host et
n'utilise ni l'extension Copilot comme fournisseur, ni son authentification, ni son interface.

Slate réutilise les primitives génériques déjà disponibles dans Code - OSS :

- l'enregistrement des vues, commandes et services du workbench ;
- l'injection de dépendances, les événements et les `CancellationToken` ;
- le rendu Markdown, la coloration syntaxique et les composants accessibles ;
- le service de secrets du workbench ;
- les services d'éditeur nécessaires pour lire le fichier actif et la sélection.

Slate écrit à neuf, sous `src/vs/workbench/contrib/slate/` :

- la vue et le modèle de conversation ;
- le service d'historique en mémoire ;
- le stockage et les commandes de gestion de la clé API ;
- le client du fournisseur et sa traduction en flux de messages Slate ;
- la collecte explicite du contexte envoyé au fournisseur.

L'agent host et l'extension Copilot restent inchangés pour faciliter les synchronisations avec
l'amont. Ils ne constituent pas une dépendance du chat Slate. Leur exposition éventuelle dans une
distribution publique sera traitée séparément, avec la revue de licence et de configuration produit
appropriée.

## Raisons

- Le périmètre du MVP ne requiert ni outils, ni sous-agents, ni sessions distantes.
- Une clé API personnelle ne doit pas transiter par une authentification GitHub/Copilot sans besoin.
- Le service autonome suit directement le découpage testable de S2-03 à S2-07.
- Le code Slate reste isolé dans une contribution, ce qui réduit les conflits lors des mises à jour
  depuis Code - OSS.

## Conséquences

- Le premier fournisseur et son streaming seront implémentés dans le processus du workbench.
- Les capacités avancées de l'agent host ne sont pas disponibles dans le MVP.
- Le protocole interne du service de conversation doit rester indépendant du format du fournisseur
  afin de permettre une migration ou l'ajout d'un second fournisseur.
- Une nouvelle ADR sera nécessaire avant de faire passer le chat Slate par l'agent host.

