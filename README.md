# Sudoku X

> Neuf chiffres font la loi. Tu es le dixième.

Un sudoku cyberpunk pour Android et iOS : des pouvoirs, des effets néon, des
duels en temps réel et une vraie histoire.

Ce dépôt contient un **prototype jouable** : le jeu solo, les pouvoirs, le
chapitre 1 de l'histoire (8 missions) et les duels contre des adversaires
contrôlés par l'ordinateur. Les duels en ligne contre de vrais joueurs sont
l'étape suivante (voir [La suite](#la-suite)).

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

En solo, les pouvoirs de soutien et de défense sont toujours disponibles. En
duel, on emporte quatre pouvoirs au choix (écran **Pouvoirs**).

### Les duels

Les deux joueurs reçoivent la même grille. Le premier qui la termine gagne.
Une attaque met une seconde et demie à atteindre sa cible : une alerte
s'affiche, et il reste juste le temps de lever un Pare-feu.

Quatre adversaires sont disponibles, du drone d'entraînement au boss du
chapitre. Leur rythme s'adapte en partie à celui du joueur, pour que les
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
chasseuse de Scellés et le Directeur Neuf. Les chapitres 2 à 9 sont annoncés
dans le jeu mais pas encore jouables.

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
(adversaires). Pour modifier l'histoire, tout est dans `src/content/story.ts`.

## Ce qui a été vérifié

- 68 tests automatiques sur le moteur (grilles à solution unique, pouvoirs,
  duels, bilan de fin de partie).
- Les parcours complets (partie libre, mission d'histoire, duel, menus) ont
  été joués de bout en bout dans un navigateur.
- Le code se compile pour Android et pour iOS.

Le jeu n'a pas encore été essayé sur un vrai téléphone : c'est la première
chose à faire, pour juger les animations, les vibrations et la taille des
boutons sous le doigt.

## La suite

- **Duels en ligne.** Le moteur est prêt : l'adversaire n'est qu'une source
  d'actions (« a posé un chiffre », « lance une attaque »). Il reste à
  brancher un serveur temps réel (Supabase ou Firebase, par exemple) qui met
  deux joueurs en relation, leur envoie la même graine de grille et relaie
  ces actions à la place du bot.
- **Chapitre 2**, *Le Huitième* : nouveaux Scellés, nouveaux adversaires,
  nouveaux pouvoirs.
- **Sons et musique.**
- **Publication** sur le Play Store et l'App Store avec
  [EAS Build](https://docs.expo.dev/build/introduction/). Les identifiants de
  l'application sont dans `app.json` (`com.capitainemax9.sudokux`) : à changer
  si besoin avant la première publication.

L'icône et l'image de démarrage sont produites par
`node scripts/generate-assets.js`.
