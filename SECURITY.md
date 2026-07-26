# Sécurité

Slate est un fork de [Code - OSS](https://github.com/microsoft/vscode). Ce document
concerne les vulnérabilités de **Slate**. Le fichier d'origine renvoyait les
signalements vers Microsoft (`https://aka.ms/SECURITY.md`) : ce canal ne traite pas
les vulnérabilités introduites par ce fork.

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique pour une faille de sécurité.**

Utilisez l'onglet **Security → Report a vulnerability** du dépôt
([avis de sécurité privés GitHub](https://github.com/ZEBDA/slate/security/advisories/new)).
Le rapport reste confidentiel jusqu'à la publication d'un correctif.

Merci d'inclure, autant que possible :

- la version de Slate (menu Aide → À propos, ou `slate --version`) et le système
  d'exploitation ;
- le composant touché (processus principal, moteur de rendu, extension, panneau IA) ;
- des étapes de reproduction, et l'impact que vous estimez (exécution de code,
  fuite de données, contournement d'une confirmation) ;
- toute preuve de concept, si vous en avez une.

Comptez quelques jours pour un premier retour. Ce fork est maintenu à temps partiel :
les délais ne sont pas ceux d'un éditeur commercial.

## Vulnérabilités venant d'ailleurs

Slate reprend une base de code importante et des dépendances tierces.

- Si la faille existe aussi dans Code - OSS non modifié, signalez-la **également** à
  Microsoft via [https://aka.ms/SECURITY.md](https://aka.ms/SECURITY.md) : c'est là
  qu'un correctif amont sera produit, dont nous héritons.
- Si elle concerne une dépendance npm, signalez-la à son mainteneur. Prévenez-nous
  quand même si Slate l'expose d'une manière particulière.

## Périmètre

Sont dans le périmètre : le code de ce dépôt, la configuration d'empaquetage et
l'installateur Windows, l'intégration IA et le traitement des clés d'API.

Ne le sont pas : les extensions tierces du Marketplace, les services distants des
fournisseurs de modèles, et les problèmes qui exigent un accès physique ou
administrateur déjà acquis sur la machine.
