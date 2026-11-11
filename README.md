# Sudoku X

> Neuf chiffres font la loi. Tu es le dixième.

Un sudoku cyberpunk pour Android et iOS : des pouvoirs, des effets néon, des
duels en temps réel et une vraie histoire.

Ce dépôt contient un **prototype jouable** : le jeu solo, douze pouvoirs, les
deux premiers chapitres de l'histoire (16 missions), les duels contre des
adversaires contrôlés par l'ordinateur et les **duels entre joueurs**, sans
serveur : en direct entre téléphones proches, ou par Internet via Firebase.

## Lancer le jeu

Il faut [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install
```

```bash
npx expo start
```

Un QR code s'affiche dans le terminal.

- **Sur ton téléphone** : installe l'application **Expo Go** (Play Store ou
  App Store), puis scanne le QR code (avec Expo Go sur Android, avec
  l'appareil photo sur iPhone). Le téléphone et l'ordinateur doivent être sur
  le même Wi-Fi.
- **Dans un navigateur** : appuie sur `w` dans le terminal, ou lance
  `npm run web`.

## Duels entre joueurs (sans serveur)

Dans le jeu : **Duel → Duel entre joueurs**. Il n'y a aucun serveur à faire
tourner : le téléphone qui **héberge** le duel sert d'arbitre.

### À côté de toi (sans Internet)

Les deux téléphones sont sur le même Wi-Fi, **ou** l'un active son partage
de connexion et l'autre s'y connecte (marche aussi sans forfait data).

1. Un joueur touche **Héberger** : un code de sept caractères s'affiche.
2. L'autre le saisit et touche **Rejoindre**.

Ce mode n'existe que dans l'**application installée** (voir
[Installer le jeu](#installer-le-jeu-gratuitement)) : il a besoin d'un accès
au réseau qu'Expo Go et les navigateurs n'offrent pas.

### Par Internet

Il passe par **Firebase Realtime Database**, un service gratuit de Google
qui sert de boîte aux lettres entre les deux téléphones : rien à héberger,
rien à maintenir. Il faut le configurer une fois :

1. Va sur [console.firebase.google.com](https://console.firebase.google.com)
   avec un compte Google, et crée un projet (Google Analytics : inutile).
2. Dans le menu **Créer → Realtime Database**, clique sur **Créer une base
   de données**, choisis l'emplacement le plus proche, puis **mode verrouillé**.
3. Onglet **Règles** : remplace tout par le contenu du fichier
   `database.rules.json` de ce dépôt, puis **Publier**.
4. Onglet **Données** : copie l'adresse affichée en haut (elle se termine par
   `firebasedatabase.app` ou `firebaseio.com`).
5. Dans le dossier du jeu, copie `.env.example` en `.env` et colle cette
   adresse dans `EXPO_PUBLIC_FIREBASE_DATABASE_URL`, et le nom du projet dans
   `EXPO_PUBLIC_FIREBASE_PROJECT_ID`.
6. Relance `npx expo start`.

Ensuite : **Partie rapide** (premier joueur disponible) ou **Créer un salon**
(code de quatre caractères à donner à un ami). L'offre gratuite de Firebase
suffit largement pour un jeu entre amis (100 joueurs connectés en même temps).

Ces valeurs ne sont pas secrètes : tu peux enregistrer le fichier `.env` dans
le dépôt, ce qui est même nécessaire pour que les compilations dans le cloud
(ci-dessous) en profitent.

## Installer le jeu gratuitement

Le **Play Store** coûte 25 $ (une seule fois) et l'**App Store** 99 $ par an :
sans payer, on ne peut pas y être. Voici ce qui est gratuit.

### Android : l'APK sur GitHub (le plus simple)

À chaque envoi de code, GitHub compile l'APK tout seul et le publie dans
l'onglet **Releases** du dépôt, sous le nom **Dernière version Android**.
Pour l'installer : ouvre cette page sur un téléphone Android, touche le
fichier `.apk`, puis autorise l'installation d'applications inconnues quand
Android le demande. Une nouvelle version s'installe par-dessus l'ancienne,
sans perdre la progression.

- Compter environ 20 minutes par compilation. Elle se suit dans l'onglet
  **Actions** (flux **APK Android**), d'où on peut aussi la relancer à la
  main (**Run workflow**, si le flux est sur la branche principale).
- Les duels **Par Internet** utilisent la configuration du fichier `.env`
  enregistré dans le dépôt.
- Cet APK est signé avec la clé de test d'Expo, commune à tous les projets :
  parfait pour jouer entre amis, mais à remplacer par ta propre clé avant
  une publication sur le Play Store.

### Android : un APK compilé par Expo

L'APK est l'application installable, que tu peux envoyer à qui tu veux. Elle
est compilée gratuitement dans le cloud par Expo (compte gratuit, quelques
compilations par mois).

1. Crée un compte sur [expo.dev](https://expo.dev).
2. Dans le dossier du jeu :

   ```bash
   npx eas-cli login
   ```

   ```bash
   npx eas-cli build -p android --profile apk
   ```

   La première fois, réponds **oui** pour créer le projet Expo et générer la
   clé de signature. La compilation prend 10 à 20 minutes (file d'attente
   gratuite comprise).
3. Tu obtiens un lien de téléchargement. Ouvre-le sur un téléphone Android,
   télécharge l'APK et installe-le (Android demande d'autoriser
   « l'installation d'applications inconnues » pour le navigateur).

Partage ce lien à tes amis : ils installent le même fichier. Pour une
nouvelle version, augmente `version` et `android.versionCode` dans
`app.json`, puis relance la compilation.

### iPhone : la version web

Apple ne permet pas d'installer gratuitement une application sur l'iPhone
de quelqu'un d'autre. En revanche, le jeu fonctionne dans Safari, et on peut
l'ajouter à l'écran d'accueil comme une app (bouton Partager → **Sur l'écran
d'accueil**). Hébergement gratuit avec le même compte Expo :

```bash
npx expo export -p web
```

```bash
npx eas-cli deploy --prod
```

Tu obtiens une adresse en `https://…expo.app` à partager. Dans le
navigateur, les duels **Par Internet** fonctionnent ; le mode **À côté de
toi** non.

### Plus tard, sur les magasins

Tout est prêt si tu décides de payer : le profil `production` d'`eas.json`
produit le fichier attendu par le Play Store (`eas build -p android
--profile production`), et l'iPhone se compile aussi dans le cloud, sans
Mac (`eas build -p ios`). Il faudra une page web pour la politique de
confidentialité : un modèle est dans `docs/confidentialite.md`. Attention,
Google demande aux nouveaux comptes personnels de faire tester l'application
par une douzaine de personnes pendant deux semaines avant de la publier
(règle en vigueur à la date de rédaction : à revérifier).

## Le jeu

### Les règles

Chaque ligne, chaque colonne et chaque bloc de 3 × 3 doit contenir les
chiffres de 1 à 9. Touche une case, puis un chiffre.

- Un **bon chiffre** rapporte des points et remplit la **jauge de charge**.
- Enchaîner les bons chiffres en moins de 8 secondes fait monter le **combo**
  (jusqu'à ×5).
- Terminer une ligne, une colonne ou un bloc donne un bonus.
- Un **mauvais chiffre** est refusé : il coûte une erreur, de la charge et le
  combo en cours.
- Le **crayon** sert à noter des chiffres possibles dans une case.

Certaines grilles sont des **Scellés-X** : les deux grandes diagonales doivent
elles aussi contenir chaque chiffre une seule fois.

### Les pouvoirs

La charge se dépense en pouvoirs. Ils se débloquent un par un dans l'histoire.

| Pouvoir    | Type    | Coût | Effet                                                         |
| ---------- | ------- | ---- | ------------------------------------------------------------- |
| Scan       | Soutien | 50   | Révèle le chiffre de la case sélectionnée                     |
| Analyse    | Soutien | 30   | Écrit toutes les notes possibles dans la grille               |
| Pare-feu   | Défense | 30   | Bloque la prochaine attaque reçue (15 s)                      |
| Purge      | Défense | 20   | Annule les effets subis                                       |
| Gel        | Attaque | 40   | L'adversaire ne peut plus rien poser pendant 4 s              |
| Brouillage | Attaque | 45   | Brouille la grille et mélange le clavier adverse pendant 8 s  |
| Blackout   | Attaque | 50   | Plonge trois blocs adverses dans le noir pendant 9 s          |
| Virus      | Attaque | 65   | Efface deux chiffres déjà trouvés par l'adversaire            |
| Sonar      | Soutien | 25   | Fait briller les cases déductibles tout de suite (10 s)       |
| Siphon     | Attaque | 35   | Vole jusqu'à 30 de charge à l'adversaire                      |
| Miroir     | Défense | 45   | Renvoie la prochaine attaque à son auteur (12 s)              |
| Vertige    | Attaque | 45   | Retourne la grille adverse tête en bas pendant 8 s            |

On emporte quatre pouvoirs. L'écran **Pouvoirs** garde deux équipements :
un pour le solo (sans attaques) et un pour les duels.

### Les duels

Les deux joueurs reçoivent la même grille. Le premier qui la termine gagne.
Une attaque met une seconde et demie à atteindre sa cible : une alerte
s'affiche, et il reste juste le temps de lever un Pare-feu.

Six adversaires sont disponibles, du drone d'entraînement aux boss des deux
chapitres. Leur rythme s'adapte en partie à celui du joueur, pour que les
duels restent serrés : c'est l'usage des pouvoirs qui fait la différence.

## L'histoire

Ennéa est une mégapole de neuf districts. Tout y passe par la **Trame**, un
réseau fermé par des **Scellés** : des verrous logiques de 9 × 9 cases. Le
consortium **Nonagone** les détient tous depuis la Nuit Blanche, la nuit où
**Harmonie**, l'intelligence qui veillait sur la ville, a été découpée en neuf
fragments. Ses neuf directeurs se font appeler **les Chiffres**.

Tu es **X**, solveur des bas-fonds du Neuvième district. Une nuit, un terminal
récupéré à la décharge se met à parler : c'est **Écho**, le plus petit
fragment d'Harmonie, celui qui s'est échappé. Pour lui rendre la mémoire, il
faudra briser les Scellés des neuf districts, du Neuvième jusqu'au Premier.

Le chapitre 1, *Le Neuvième*, compte huit missions : cinq Scellés à briser,
deux duels et le boss du district. On y croise Mamie Octet, Pixel, Vesper la
chasseuse de Scellés et le Directeur Neuf.

Le chapitre 2, *Le Huitième*, se passe sur les docks de données, où la
Directrice Huit prélève sa part sur tout ce qui circule. Huit missions, avec
Kilo (le petit-fils de Mamie Octet), les jumeaux de la douane Pair et Impair,
et le retour de Vesper. Les chapitres 3 à 9 sont annoncés dans le jeu mais
pas encore jouables.

Le jeu est entièrement traduit en français et en anglais (réglable dans
**Réglages** ; par défaut, la langue du téléphone).

## Le code

```
src/
  app/        Les écrans (un fichier = un écran, grâce à expo-router)
  engine/     Les règles du jeu, sans aucune dépendance à l'interface
    sudoku.ts     Générateur de grilles, solveur, niveaux de difficulté
    match.ts      Déroulement d'une partie (solo ou duel)
    matchCore.ts  Score, combo, charge, pouvoirs, attaques
    ai.ts         Adversaire contrôlé par l'ordinateur
    powers.ts     Catalogue des pouvoirs et réglages d'équilibrage
  content/    L'histoire, les personnages et les adversaires
  game/       Le lien entre le moteur et l'interface
  store/      La partie en cours et la progression sauvegardée
  net/        Les duels entre joueurs : arbitrage, réseau local, Firebase
  i18n/       Tous les textes, en français et en anglais
  ui/         Les composants visuels (grille, effets, portraits…)
```

Le moteur est écrit comme une fonction pure : `reduceMatch(état, action)`
renvoie le nouvel état et la liste de ce qui vient de se passer. Il ne dépend
ni de l'horloge ni du hasard du système, donc une partie peut être rejouée à
l'identique et se teste facilement.

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run lint
```

Pour modifier l'équilibrage, les valeurs sont regroupées dans
`src/engine/powers.ts` (coûts, durées, points) et `src/content/bots.ts`
(adversaires). L'histoire est dans `src/content/story.ts` (chapitre 1) et
`src/content/chapter2.ts`.

Entre joueurs, chacun fait autorité sur sa propre grille et annonce ce qu'il
fait. Le téléphone de l'hôte arbitre (`src/net/lobby.ts`) : il choisit la
grille, vérifie chaque chiffre posé, relaie les attaques et désigne le
vainqueur. Le transport est interchangeable : TCP en direct sur le réseau
local (`src/net/tcp.ts`), ou Firebase par Internet (`src/net/internet.ts`).
La charge dépensée pour les pouvoirs n'est pas vérifiée : un joueur qui
modifierait son application pourrait en abuser. Et comme l'hôte arbitre, il
pourrait tricher en modifiant la sienne.

## Ce qui a été vérifié

- 160 tests automatiques : moteur, pouvoirs, mode en ligne, arbitrage,
  duels sur le réseau local avec de vraies connexions TCP, contenu de
  l'histoire.
- Les duels **Par Internet** ont été joués de bout en bout entre deux
  navigateurs, avec l'émulateur Firebase et les règles de sécurité du dépôt :
  salon à code, code faux, attaques et Miroir, victoire, revanche, abandon,
  partie rapide, hôte qui ferme l'application.
- Le code se compile pour Android et pour iOS.

Pas encore vérifié, faute d'appareils réels et de comptes ici : le mode
**À côté de toi** sur deux vrais téléphones, la compilation de l'APK dans le
cloud, et un vrai projet Firebase.

## La suite

- **Chapitre 3**, *Le Septième* : aller chercher Mamie Octet dans les
  jardins verticaux.
- **Entre joueurs** : reprise après une coupure, vérification de la charge
  des pouvoirs.
- **Sons et musique.**

L'icône et l'image de démarrage sont produites par
`node scripts/generate-assets.js`.
