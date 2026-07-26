# Direction visuelle de Slate

Slate ne doit pas être perçu comme une simple redistribution de VS Code avec un autre logo.
L'interface conserve les fondations techniques de Code - OSS, mais sa hiérarchie visuelle suit
une direction propre.

## Valeurs

- **Focalisé** : l'éditeur et la conversation sont les surfaces dominantes.
- **Calme** : moins de séparateurs, moins de contrastes inutiles, davantage de regroupements.
- **Dense** : les contrôles restent compacts sans devenir difficiles à viser.
- **Cohérent** : panneaux, menus, onglets et champs utilisent les mêmes niveaux de surface.

## Principes

- La navigation est constituée de boutons contenus, pas d'icônes flottantes avec un trait latéral.
- Les panneaux sont des surfaces légèrement détachées de la coque principale.
- L'onglet actif appartient visuellement au document, avec une forme contenue et arrondie.
- Le chat vit dans la barre auxiliaire droite et son compositeur reste l'ancre principale.
- Les thèmes à contraste élevé conservent leur rendu natif et ne reçoivent pas les surcharges Slate.

## Première tranche

La première tranche est portée par
`src/vs/workbench/contrib/slate/browser/media/slateWorkbench.css` et couvre la barre de titre,
la navigation, les panneaux, les onglets, les listes, les menus, la palette de commandes et la
barre d'état.

