# Sudoku X

> Neuf chiffres font la loi. Tu es le dixième.

Un sudoku cyberpunk pour Android et iOS : des pouvoirs, des effets néon, des
duels en temps réel et une vraie histoire.

Ce dépôt contient un **prototype jouable** : le jeu solo, douze pouvoirs, les
deux premiers chapitres de l'histoire (16 missions), les duels contre des
adversaires contrôlés par l'ordinateur et les **duels en ligne** contre de
vrais joueurs.

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

## Jouer en ligne

Les duels en ligne passent par un petit serveur fourni dans ce dépôt
(dossier `server/`).

### Sur le même Wi-Fi

Dans un **second terminal**, à côté de celui où tourne `npx expo start` :

```bash
npm run server
```

Laisse-le ouvert. Si Windows demande d'autoriser Node.js à communiquer sur
le réseau, accepte. Dans le jeu : **Duel → Duel en ligne**. Le jeu trouve le
serveur tout seul, car il tourne sur le même ordinateur que `expo start`.

- **Partie rapide** : affronte le premier joueur qui cherche aussi.
- **Créer un salon** : donne le code de quatre caractères à ton ami, qui le
  saisit dans **Rejoindre un salon**.

Pour essayer seul, ouvre le jeu sur ton téléphone et dans un navigateur
(touche `w`) : cela fait deux joueurs.

### Partout, par Internet

Il faut héberger le serveur. Le fichier `render.yaml` est prêt pour
[Render](https://render.com), qui a une offre gratuite :

1. Crée un compte Render et relie ton compte GitHub.
2. **New → Blueprint**, choisis ce dépôt, valide.
3. Render donne une adresse du type `https://sudokux-server.onrender.com`.
4. À la racine du projet, crée un fichier `.env` contenant cette adresse en
   `wss://` :

   ```
   EXPO_PUBLIC_SERVER_URL=wss://sudokux-server.onrender.com
   ```

5. Relance `npx expo start`.

Cette mise en ligne n'a pas été testée depuis ici. Sur l'offre gratuite, le
serveur s'endort après un quart d'heure sans visite : la première connexion
peut alors prendre une minute.

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
  net/        La connexion au serveur de duels et le format des messages
  i18n/       Tous les textes, en français et en anglais
  ui/         Les composants visuels (grille, effets, portraits…)
server/       Le serveur de duels en ligne (Node.js)
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

En ligne, chaque joueur fait autorité sur sa propre grille et annonce ce
qu'il fait. Le serveur met les joueurs en relation, leur envoie la même
graine de grille, vérifie chaque chiffre posé, relaie les attaques et
désigne le vainqueur. Il ne vérifie pas encore la charge dépensée pour les
pouvoirs : un joueur qui modifierait son jeu pourrait en abuser.

## Ce qui a été vérifié

- 151 tests automatiques : moteur, pouvoirs, mode en ligne, serveur de duels,
  contenu de l'histoire.
- Les parcours complets ont été joués de bout en bout dans un navigateur, y
  compris un duel en ligne entre deux joueurs simulés (salon à code,
  attaques, victoire, revanche en partie rapide, forfait sur déconnexion).
- Le code se compile pour Android et pour iOS.

Je n'ai pas pu essayer le jeu sur un vrai téléphone, ni le duel en ligne
entre deux appareils réels, ni l'hébergement du serveur sur Render.

## La suite

- **Chapitre 3**, *Le Septième* : aller chercher Mamie Octet dans les
  jardins verticaux.
- **En ligne** : reprise après une coupure de connexion, classement,
  vérification des pouvoirs par le serveur.
- **Sons et musique.**
- **Publication** sur le Play Store et l'App Store avec
  [EAS Build](https://docs.expo.dev/build/introduction/). Les identifiants de
  l'application sont dans `app.json` (`com.capitainemax9.sudokux`) : à changer
  si besoin avant la première publication. Une version publiée devra
  utiliser un serveur en `wss://`.

L'icône et l'image de démarrage sont produites par
`node scripts/generate-assets.js`.
