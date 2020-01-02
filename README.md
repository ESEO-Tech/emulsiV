
Installation des dépendances
============================

Installez `npm` et exécutez la commande suivante à partir du dossier racine :

```
npm install
```

Exécution en local
==================

La commande suivante démarre un serveur web local et ouvre le fichier
`index.html` situé à la racine :

```
npm start
```

Tests unitaires
===============

La commande suivante démarre un serveur web local et ouvre le fichier
`test/index.html` :

```
npm test
```

Propositions de fonctionnalités
===============================

* Enregistrer l'état de la mémoire au format `.hex`.
* Enregistrer l'état de la mémoire en tant que données codées dans l'URL.
* Charger le contenu de la mémoire à partir de données codées dans l'URL.

Bugs connus
===========

Dans la colonne de droite du tableau représentant la mémoire, en mode
"ASCII", la saisie d'espaces peut donner des résultats imprévisibles.
