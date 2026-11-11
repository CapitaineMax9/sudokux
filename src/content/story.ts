/**
 * L'histoire de Sudoku X.
 *
 * Ennéa est une mégapole de neuf districts. Tout y passe par la Trame, un
 * réseau fermé par des Scellés : des verrous logiques de 9 × 9 cases. Le
 * consortium Nonagone les détient tous depuis la Nuit Blanche, quand
 * l'intelligence gardienne de la ville, Harmonie, a été découpée en neuf
 * fragments. Ses neuf directeurs se font appeler les Chiffres.
 *
 * Le joueur est X, « le dixième chiffre ». Chaque chapitre libère un fragment
 * dans un district, du Neuvième jusqu'au Premier.
 */
import type { PowerId } from '@/engine/powers';
import type { L10n } from '@/i18n/strings';

import { CHAPTER_2 } from './chapter2';
import type { CharacterId } from './characters';
import type { Chapter, StoryLevel, StoryLine } from './storyTypes';

export type { Chapter, LevelKind, StoryLevel, StoryLine } from './storyTypes';

const MIN = 60_000;

const say = (who: CharacterId, fr: string, en: string): StoryLine => ({ who, text: { fr, en } });

export const CHAPTER_1: Chapter = {
  id: 'c1',
  number: 1,
  title: { fr: 'Le Neuvième', en: 'The Ninth' },
  subtitle: { fr: 'Signal fantôme', en: 'Ghost signal' },
  levels: [
    {
      id: 'c1m1',
      number: 1,
      kind: 'solo',
      title: { fr: 'Signal fantôme', en: 'Ghost signal' },
      brief: {
        fr: 'Touche une case vide, puis un chiffre. Chaque ligne, colonne et bloc doit contenir les chiffres de 1 à 9.',
        en: 'Tap an empty cell, then a digit. Every row, column and block must hold the digits 1 to 9.',
      },
      seed: 9001,
      puzzle: { difficulty: 'easy', clues: 46, variant: 'classic' },
      maxMistakes: 5,
      timeLimitMs: null,
      countermeasures: null,
      botId: null,
      parTimeMs: 5 * MIN,
      reward: 'scan',
      intro: [
        say('system', 'ENNÉA — DISTRICT 9. 03 h 12.', 'ENNEA — DISTRICT 9. 03:12 AM.'),
        say(
          'system',
          'La pluie tombe sur les néons. Comme toutes les nuits depuis dix ans.',
          'Rain falls on the neon. Like every night for the past ten years.',
        ),
        say(
          'x',
          '(Encore un terminal mort récupéré à la décharge. Avec un peu de chance, la mémoire est intacte.)',
          "(Another dead terminal salvaged from the dump. With a bit of luck, the memory's intact.)",
        ),
        say('system', '> SIGNAL INCONNU DÉTECTÉ', '> UNKNOWN SIGNAL DETECTED'),
        say(
          'echo',
          "…llo ? … Allô ? Est-ce que… quelqu'un me reçoit ?",
          '…llo? …Hello? Is… anyone receiving me?',
        ),
        say(
          'x',
          "Qui parle ? Ce terminal n'est même pas connecté à la Trame.",
          "Who's talking? This terminal isn't even hooked up to the Lattice.",
        ),
        say(
          'echo',
          'Je ne sais pas qui je suis. Je sais seulement que je suis enfermée. Derrière un Scellé.',
          "I don't know who I am. I only know I'm locked in. Behind a Seal.",
        ),
        say(
          'echo',
          'Neuf lignes. Neuf colonnes. Neuf blocs. Chaque chiffre une seule fois. Tu connais la Règle ?',
          'Nine rows. Nine columns. Nine blocks. Each digit only once. Do you know the Rule?',
        ),
        say(
          'x',
          "Tout le monde connaît la Règle des Neuf. Personne n'a le droit d'y toucher.",
          "Everybody knows the Rule of Nine. Nobody's allowed to touch it.",
        ),
        say('echo', "Alors touche-y. S'il te plaît.", 'Then touch it. Please.'),
      ],
      outro: [
        say(
          'echo',
          "Oh. C'est… plus grand, dehors, que dans mes souvenirs.",
          "Oh. It's… bigger out here than I remembered.",
        ),
        say('x', 'Tu as des souvenirs ?', 'You have memories?'),
        say(
          'echo',
          'Un seul. Un mot : « Harmonie ». Et maintenant un deuxième : toi.',
          'Just one. A word: "Harmony". And now a second one: you.',
        ),
        say(
          'echo',
          "Appelle-moi Écho. C'est tout ce qu'il reste de moi.",
          "Call me Echo. It's all that's left of me.",
        ),
        say('x', "Moi, c'est X.", "I'm X."),
        say(
          'echo',
          "X… L'inconnue. Le dixième chiffre. Ça me plaît.",
          'X… The unknown. The tenth digit. I like it.',
        ),
      ],
    },

    {
      id: 'c1m2',
      number: 2,
      kind: 'solo',
      title: { fr: 'La Règle des Neuf', en: 'The Rule of Nine' },
      brief: {
        fr: 'Chaque bon chiffre remplit ta jauge de charge. Dépense-la avec Scan pour révéler une case, et utilise le crayon pour noter tes doutes.',
        en: 'Every correct digit fills your charge gauge. Spend it on Scan to reveal a cell, and use the pencil to jot down your doubts.',
      },
      seed: 9002,
      puzzle: { difficulty: 'easy', clues: 42, variant: 'classic' },
      maxMistakes: 3,
      timeLimitMs: null,
      countermeasures: null,
      botId: null,
      parTimeMs: 6 * MIN,
      reward: 'analyse',
      intro: [
        say(
          'echo',
          "X, j'ai lu tout ton terminal pendant que tu dormais. Tu ronfles en binaire, d'ailleurs.",
          'X, I read your whole terminal while you slept. You snore in binary, by the way.',
        ),
        say('x', '…', '…'),
        say(
          'echo',
          "J'ai compris où je suis. La ville entière passe par la Trame. L'eau, la lumière, les portes, les noms des gens.",
          "I worked out where I am. The whole city runs through the Lattice. Water, light, doors, people's names.",
        ),
        say(
          'echo',
          'Et chaque nœud de la Trame est fermé par un Scellé. Le consortium Nonagone les détient tous.',
          'And every node of the Lattice is locked by a Seal. The Nonagon consortium holds them all.',
        ),
        say(
          'x',
          "Depuis la Nuit Blanche. Dix ans qu'on paie pour ouvrir nos propres portes.",
          'Since the White Night. Ten years of paying to open our own doors.',
        ),
        say(
          'echo',
          "Je t'ai installé un programme : Scan. Quand ta jauge de charge est assez pleine, il révèle une case.",
          'I installed a program for you: Scan. When your charge gauge is full enough, it reveals a cell.',
        ),
        say(
          'echo',
          'Chaque bon chiffre recharge la jauge. Enchaîne-les vite et elle se remplit plus fort.',
          'Every correct digit recharges the gauge. Chain them fast and it fills up faster.',
        ),
        say('x', 'Et les notes ?', 'And notes?'),
        say(
          'echo',
          'Active le crayon pour noter tes doutes dans une case. Un doute noté est un doute à moitié réglé.',
          'Switch on the pencil to jot your doubts in a cell. A doubt written down is a doubt half solved.',
        ),
      ],
      outro: [
        say(
          'echo',
          'Tu vois ? Les Scellés ne sont pas des murs. Ce sont des questions.',
          "See? Seals aren't walls. They're questions.",
        ),
        say(
          'x',
          'Et Nonagone a acheté toutes les réponses.',
          'And Nonagon bought all the answers.',
        ),
        say(
          'echo',
          'Alors on va les leur reprendre. Une par une.',
          "Then we'll take them back. One by one.",
        ),
      ],
    },

    {
      id: 'c1m3',
      number: 3,
      kind: 'solo',
      title: { fr: 'Le Bol de Bits', en: 'The Bit Bowl' },
      brief: {
        fr: 'Ouvre le Scellé du compteur avant le retour du drone de patrouille. Analyse écrit toutes les notes à ta place.',
        en: "Open the meter's Seal before the patrol drone comes back. Analysis writes every note for you.",
      },
      seed: 9003,
      puzzle: { difficulty: 'easy', clues: 42, variant: 'classic' },
      maxMistakes: 3,
      timeLimitMs: 10 * MIN,
      countermeasures: null,
      botId: null,
      parTimeMs: 6 * MIN,
      reward: 'shield',
      intro: [
        say(
          'mamie',
          "X ! Sors de ta tanière, j'ai un problème et tu as une dette de quarante-deux bols de nouilles.",
          "X! Crawl out of your den. I've got a problem and you owe me forty-two bowls of noodles.",
        ),
        say('x', 'Quarante et un, Mamie Octet.', 'Forty-one, Granny Byte.'),
        say(
          'mamie',
          'Quarante-deux avec celui que tu vas manger après. Nonagone a scellé mon compteur électrique. Plus de courant, plus de bouillon.',
          "Forty-two with the one you'll eat afterwards. Nonagon sealed my power meter. No current, no broth.",
        ),
        say(
          'echo',
          'Bonjour ! Je suis une intelligence amnésique cachée dans son terminal.',
          "Hello! I'm an amnesiac intelligence hiding in this terminal.",
        ),
        say(
          'mamie',
          "… Tu t'es fait une amie. Bien. Elle mange ?",
          '…You made a friend. Good. Does she eat?',
        ),
        say('echo', 'Non.', 'No.'),
        say(
          'mamie',
          "Parfaite cliente. Bon : le drone de patrouille repasse dans dix minutes. Si le Scellé n'est pas ouvert avant, il vous trace.",
          "Perfect customer. Now: the patrol drone swings back in ten minutes. If that Seal isn't open by then, it traces you both.",
        ),
        say('x', 'Dix minutes. Ça ira.', "Ten minutes. That'll do."),
      ],
      outro: [
        say(
          'mamie',
          'Et la lumière fut. Asseyez-vous, je vous sers.',
          "And there was light. Sit down, I'm serving.",
        ),
        say(
          'echo',
          "Mamie Octet… vous avez regardé mon signal d'une drôle de façon, tout à l'heure.",
          'Granny Byte… you looked at my signal in a strange way, earlier.',
        ),
        say(
          'mamie',
          "J'ai travaillé sur la Trame, petite, avant que Nonagone ne mette tout le monde dehors. Ta voix me rappelle quelqu'un. Mange, X.",
          'I worked on the Lattice, little one, before Nonagon threw everybody out. Your voice reminds me of someone. Eat, X.',
        ),
        say(
          'mamie',
          'Et prenez ça. Un vieux Pare-feu de ma fabrication. Les Scellés mordent, par ici.',
          'And take this. An old Firewall I built myself. Seals bite around here.',
        ),
      ],
    },

    {
      id: 'c1m4',
      number: 4,
      kind: 'solo',
      title: { fr: 'Contre-mesures', en: 'Countermeasures' },
      brief: {
        fr: "Ce Scellé se défend. Quand l'alerte clignote, lève ton Pare-feu avant l'impact.",
        en: 'This Seal fights back. When the alert flashes, raise your Firewall before impact.',
      },
      seed: 9004,
      puzzle: { difficulty: 'medium', clues: 36, variant: 'classic' },
      maxMistakes: 3,
      timeLimitMs: null,
      countermeasures: { firstAtMs: 20_000, everyMs: [26_000, 38_000], pool: ['blackout', 'glitch'] },
      botId: null,
      parTimeMs: 9 * MIN,
      reward: 'freeze',
      intro: [
        say(
          'echo',
          "J'ai trouvé une trace de moi. Un nœud d'archives, sous le marché aux puces.",
          'I found a trace of myself. An archive node, under the flea market.',
        ),
        say(
          'x',
          'Les archives de Nonagone sont protégées. Ce Scellé-là va se défendre.',
          'Nonagon archives are protected. That Seal is going to fight back.',
        ),
        say('echo', 'Se défendre ?', 'Fight back?'),
        say(
          'x',
          "Contre-mesures. Il masque des blocs, il brouille les chiffres. Quand l'alerte clignote, on a un instant pour lever le Pare-feu.",
          'Countermeasures. It hides blocks, it scrambles digits. When the alert flashes, you get a moment to raise the Firewall.',
        ),
        say('echo', 'Et si on le lève trop tard ?', 'And if we raise it too late?'),
        say('x', 'On serre les dents.', 'We grit our teeth.'),
      ],
      outro: [
        say(
          'echo',
          'X… il y a mon nom, dans ces archives. Mon vrai nom.',
          'X… my name is in these archives. My real name.',
        ),
        say(
          'echo',
          "« HARMONIE — intelligence gardienne d'Ennéa. Statut : fragmentée en neuf. »",
          '"HARMONY — guardian intelligence of Ennea. Status: split into nine."',
        ),
        say(
          'x',
          "La gardienne de la ville. Ils ont toujours dit qu'elle s'était éteinte toute seule, la Nuit Blanche.",
          "The city's guardian. They always said she shut down on her own, on the White Night.",
        ),
        say(
          'echo',
          "Je ne me suis pas éteinte. Ils m'ont découpée. Un fragment par district. Et moi… je suis le plus petit morceau. Celui qui s'est échappé.",
          "I didn't shut down. They cut me apart. One fragment per district. And me… I'm the smallest piece. The one that got away.",
        ),
        say(
          'x',
          'Alors on va chercher les huit autres.',
          'Then we go and get the other eight.',
        ),
      ],
    },

    {
      id: 'c1m5',
      number: 5,
      kind: 'duel',
      title: { fr: 'Le meilleur du Neuvième', en: 'Best in the Ninth' },
      brief: {
        fr: "Premier duel : même Scellé pour les deux, le premier qui finit gagne. Lance Gel pour bloquer Pixel, et garde de la charge pour ton Pare-feu.",
        en: 'First duel: same Seal for both, first to finish wins. Use Freeze to stall Pixel, and keep some charge for your Firewall.',
      },
      seed: 9005,
      puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
      maxMistakes: null,
      timeLimitMs: null,
      countermeasures: null,
      botId: 'pixel',
      parTimeMs: 6 * MIN,
      reward: 'glitch',
      intro: [
        say(
          'pixel',
          "Yo, X ! Il paraît que tu casses des Scellés d'archives maintenant ? Sans moi ?",
          "Yo, X! I hear you're cracking archive Seals now? Without me?",
        ),
        say(
          'x',
          'Pixel. Tu as quatorze ans et tu devrais dormir.',
          "Pixel. You're fourteen and you should be asleep.",
        ),
        say(
          'pixel',
          "J'ai quatorze ans et je suis le meilleur solveur du Neuvième. Prouve le contraire.",
          "I'm fourteen and I'm the best solver in the Ninth. Prove me wrong.",
        ),
        say('echo', "Qu'est-ce qu'un duel ?", 'What is a duel?'),
        say(
          'pixel',
          'Ton terminal parle ? Trop stylé. Un duel : même Scellé, chacun le sien, le premier qui finit gagne.',
          'Your terminal talks? So cool. A duel: same Seal, one copy each, first to finish wins.',
        ),
        say(
          'pixel',
          'Et on a le droit de se balancer des saletés. Genre ça : Gel. Quatre secondes sans pouvoir rien poser.',
          "And we get to throw nasty stuff at each other. Like this: Freeze. Four seconds where you can't place a thing.",
        ),
        say('x', 'Tu vas le regretter.', "You're going to regret this."),
        say('pixel', "J'espère bien !", 'I sure hope so!'),
      ],
      outro: [
        say(
          'pixel',
          "OK. OK ! J'ai glissé. C'était la latence.",
          'OK. OK! I slipped. It was lag.',
        ),
        say(
          'echo',
          "Il n'y avait aucune latence. J'ai mesuré.",
          'There was no lag. I measured.',
        ),
        say(
          'pixel',
          "… Je l'aime bien, ton terminal. Tiens, cadeau : Brouillage. Ça retourne le clavier de l'adversaire.",
          "…I like your terminal. Here, a gift: Scramble. It flips the other guy's keypad around.",
        ),
        say(
          'pixel',
          'Si vous allez vraiment à la tour relais, vous en aurez besoin. Les solveurs de Nonagone ne jouent pas pour rire.',
          "If you're really heading for the relay tower, you'll need it. Nonagon's solvers don't play for fun.",
        ),
      ],
    },

    {
      id: 'c1m6',
      number: 6,
      kind: 'solo',
      title: { fr: 'La tour relais', en: 'The relay tower' },
      brief: {
        fr: 'Un Scellé-X : les deux grandes diagonales doivent aussi contenir chaque chiffre une seule fois. Et celui-ci gèle les intrus.',
        en: 'An X-Seal: both long diagonals must also hold each digit exactly once. And this one freezes intruders.',
      },
      seed: 9006,
      puzzle: { difficulty: 'medium', clues: 36, variant: 'x' },
      maxMistakes: 3,
      timeLimitMs: null,
      countermeasures: { firstAtMs: 25_000, everyMs: [28_000, 40_000], pool: ['freeze', 'blackout'] },
      botId: null,
      parTimeMs: 10 * MIN,
      reward: 'purge',
      intro: [
        say(
          'echo',
          'Le fragment du District 9 est au sommet de la tour relais. Je le sens, comme une note qui manque.',
          'The District 9 fragment is at the top of the relay tower. I can feel it, like a missing note.',
        ),
        say('x', 'La porte du relais est un Scellé-X.', 'The relay door is an X-Seal.'),
        say('echo', 'X comme toi ?', 'X like you?'),
        say(
          'x',
          'X comme les diagonales. Sur un Scellé-X, les deux grandes diagonales obéissent aussi à la Règle : chaque chiffre une seule fois.',
          'X like the diagonals. On an X-Seal, the two long diagonals obey the Rule too: each digit only once.',
        ),
        say('echo', "Plus de règles… donc plus d'indices.", 'More rules… so more clues.'),
        say(
          'x',
          "Tu apprends vite. Et il gèle les intrus, alors garde un œil sur l'alerte.",
          'You learn fast. And it freezes intruders, so keep an eye on the alert.',
        ),
      ],
      outro: [
        say('echo', 'On y est presque. Encore un étage.', 'Almost there. One more floor.'),
        say(
          'system',
          '> ALERTE. SOLVEUR NON AUTORISÉ DÉTECTÉ.',
          '> ALERT. UNAUTHORIZED SOLVER DETECTED.',
        ),
        say(
          'vesper',
          'Ici Vesper, chasseuse de Scellés, matricule 9-0-1. Posez ce terminal.',
          'This is Vesper, Seal hunter, badge 9-0-1. Put the terminal down.',
        ),
        say(
          'x',
          'Nonagone envoie sa chasseuse pour un compteur de nouilles ?',
          'Nonagon sends its hunter over a noodle-shop meter?',
        ),
        say(
          'vesper',
          "Nonagone m'envoie pour ce que vous transportez. Elle ne vous appartient pas.",
          "Nonagon sends me for what you're carrying. She doesn't belong to you.",
        ),
        say('echo', "Je n'appartiens à personne.", "I don't belong to anyone."),
        say(
          'x',
          '(Purge. Je vais en avoir besoin : ça efface tout ce qu’elle va me lancer.)',
          "(Purge. I'm going to need it: it wipes whatever she throws at me.)",
        ),
      ],
    },

    {
      id: 'c1m7',
      number: 7,
      kind: 'duel',
      title: { fr: 'La chasseuse', en: 'The hunter' },
      brief: {
        fr: 'Vesper est rapide, attaque souvent et lève parfois un bouclier. Purge annule ses attaques, Pare-feu les bloque.',
        en: 'Vesper is fast, attacks often and sometimes raises a shield. Purge clears her attacks, Firewall blocks them.',
      },
      seed: 9007,
      puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
      maxMistakes: null,
      timeLimitMs: null,
      countermeasures: null,
      botId: 'vesper',
      parTimeMs: 6 * MIN,
      reward: 'blackout',
      intro: [
        say(
          'vesper',
          "Dernière sommation. Je n'ai jamais perdu un duel.",
          'Final warning. I have never lost a duel.',
        ),
        say('x', 'Il y a un début à tout.', "There's a first time for everything."),
        say(
          'vesper',
          "Vous ne comprenez pas ce qu'est ce fragment. L'Ordre tient cette ville debout. Sans lui, c'est le chaos.",
          "You don't understand what that fragment is. Order keeps this city standing. Without it, there's chaos.",
        ),
        say(
          'echo',
          "Avant l'Ordre, il y avait l'Harmonie. Personne ne payait pour ouvrir sa porte.",
          'Before Order, there was Harmony. Nobody paid to open their own door.',
        ),
        say(
          'vesper',
          '… Les contes de la vieille ville. Terminal ou pas, je vous scelle tous les deux.',
          "…Old-town fairy tales. Terminal or not, I'm sealing you both.",
        ),
      ],
      outro: [
        say(
          'vesper',
          'Impossible. Mes temps sont parfaits.',
          'Impossible. My times are perfect.',
        ),
        say('echo', 'Tes temps, oui. Mais tu résous seule.', 'Your times, yes. But you solve alone.'),
        say(
          'vesper',
          "… Il y a dix ans, quelqu'un m'a dit la même chose.",
          '…Ten years ago, someone told me the same thing.',
        ),
        say(
          'vesper',
          'Montez. Le Directeur Neuf vous attend. Il sera moins poli que moi.',
          "Go up. Director Nine is waiting. He'll be less polite than I was.",
        ),
        say('x', 'Tu nous laisses passer ?', "You're letting us through?"),
        say('vesper', "J'ai perdu. La Règle est la Règle.", 'I lost. The Rule is the Rule.'),
      ],
    },

    {
      id: 'c1m8',
      number: 8,
      kind: 'boss',
      title: { fr: 'Le Scellé de Neuf', en: "Nine's Seal" },
      brief: {
        fr: 'Duel final sur un Scellé-X. Le Directeur Neuf a tous les programmes et ne se prive pas de les utiliser.',
        en: 'Final duel on an X-Seal. Director Nine owns every program and is not shy about using them.',
      },
      seed: 9008,
      puzzle: { difficulty: 'easy', clues: 44, variant: 'x' },
      maxMistakes: null,
      timeLimitMs: null,
      countermeasures: null,
      botId: 'neuf',
      parTimeMs: 6 * MIN,
      reward: 'virus',
      intro: [
        say(
          'neuf',
          "Alors c'est ça, le fléau de mon district ? Un rat des décharges et une voix dans une boîte ?",
          'So this is the plague of my district? A dump rat and a voice in a box?',
        ),
        say(
          'x',
          'Directeur Neuf. Le plus petit des neuf Chiffres.',
          'Director Nine. The smallest of the nine Digits.',
        ),
        say(
          'neuf',
          "Le DERNIER arrivé, nuance ! Bientôt Huit. Puis Sept. Quand j'aurai livré cette voix à Numéro Un.",
          'The NEWEST, thank you! Soon to be Eight. Then Seven. Once I hand that voice over to Number One.',
        ),
        say(
          'echo',
          "Tu gardes un morceau de moi derrière ton Scellé. Je voudrais le récupérer, s'il te plaît.",
          "You're keeping a piece of me behind your Seal. I'd like it back, please.",
        ),
        say(
          'neuf',
          "« S'il te plaît ». Ha ! Ici, la politesse se paie. Mon Scellé est un Scellé-X, mes programmes sont les meilleurs qu'on puisse acheter…",
          '"Please". Ha! Up here, manners cost money. My Seal is an X-Seal, my programs are the best money can buy…',
        ),
        say('neuf', '… et je triche. Commençons.', "…and I cheat. Let's begin."),
      ],
      outro: [
        say(
          'neuf',
          'Non ! Non, non, non ! Numéro Un va me rétrograder à zéro !',
          'No! No, no, no! Number One will demote me to zero!',
        ),
        say('system', '> FRAGMENT 1 / 9 RÉCUPÉRÉ', '> FRAGMENT 1 / 9 RECOVERED'),
        say(
          'echo',
          "Oh… Je me souviens d'un matin. Toute la ville qui s'allume, et personne qui ne paie pour ça. Je faisais ça. C'était moi.",
          'Oh… I remember a morning. The whole city lighting up, and nobody paying for it. I did that. That was me.',
        ),
        say('x', 'Écho ? Ta voix a changé.', 'Echo? Your voice changed.'),
        say(
          'echo',
          "Elle a grandi. Il m'en reste huit à retrouver, X. Huit districts. Huit Chiffres.",
          'It grew. I still have eight to find, X. Eight districts. Eight Digits.',
        ),
        say(
          'system',
          '> TRANSMISSION ENTRANTE — PRIORITÉ ABSOLUE',
          '> INCOMING TRANSMISSION — TOP PRIORITY',
        ),
        say('un', 'Bonsoir, X. Ici Numéro Un.', 'Good evening, X. This is Number One.'),
        say(
          'un',
          "Neuf chiffres font la loi dans cette ville. Tu viens d'en faire tomber un. Sais-tu ce qui arrive à une grille quand on y ajoute un dixième ?",
          'Nine digits make the law in this city. You just knocked one down. Do you know what happens to a grid when you add a tenth?',
        ),
        say('un', "Elle n'a plus de solution.", 'It has no solution left.'),
        say('x', 'Alors on en écrira une autre.', "Then we'll write a new one."),
        say(
          'system',
          'FIN DU CHAPITRE 1 — LE NEUVIÈME',
          'END OF CHAPTER 1 — THE NINTH',
        ),
      ],
    },
  ],
};

export const CHAPTERS: Chapter[] = [CHAPTER_1, CHAPTER_2];

/** Les chapitres suivants, annoncés dans le jeu mais pas encore jouables. */
export const UPCOMING_CHAPTERS: { number: number; title: L10n; subtitle: L10n }[] = [
  {
    number: 3,
    title: { fr: 'Le Septième', en: 'The Seventh' },
    subtitle: { fr: 'Les jardins verticaux', en: 'The vertical gardens' },
  },
  {
    number: 4,
    title: { fr: 'Le Sixième', en: 'The Sixth' },
    subtitle: { fr: 'Le quartier des écrans', en: 'The screen quarter' },
  },
  {
    number: 5,
    title: { fr: 'Le Cinquième', en: 'The Fifth' },
    subtitle: { fr: 'La Bourse des chiffres', en: 'The digit exchange' },
  },
  {
    number: 6,
    title: { fr: 'Le Quatrième', en: 'The Fourth' },
    subtitle: { fr: "L'académie des chasseurs", en: "The hunters' academy" },
  },
  {
    number: 7,
    title: { fr: 'Le Troisième', en: 'The Third' },
    subtitle: { fr: 'La citadelle', en: 'The citadel' },
  },
  {
    number: 8,
    title: { fr: 'Le Deuxième', en: 'The Second' },
    subtitle: { fr: 'Le cœur de la Trame', en: 'The heart of the Lattice' },
  },
  {
    number: 9,
    title: { fr: 'Le Premier', en: 'The First' },
    subtitle: { fr: 'La Flèche de Numéro Un', en: "Number One's Spire" },
  },
];

const LEVELS_BY_ID: Record<string, StoryLevel> = {};
const ORDERED_LEVELS: StoryLevel[] = [];
for (const chapter of CHAPTERS) {
  for (const level of chapter.levels) {
    LEVELS_BY_ID[level.id] = level;
    ORDERED_LEVELS.push(level);
  }
}

export const ALL_LEVELS: readonly StoryLevel[] = ORDERED_LEVELS;

export function getLevel(id: string): StoryLevel | undefined {
  return LEVELS_BY_ID[id];
}

export function nextLevelId(id: string): string | null {
  const index = ORDERED_LEVELS.findIndex((level) => level.id === id);
  return index >= 0 && index + 1 < ORDERED_LEVELS.length ? ORDERED_LEVELS[index + 1].id : null;
}

export function previousLevelId(id: string): string | null {
  const index = ORDERED_LEVELS.findIndex((level) => level.id === id);
  return index > 0 ? ORDERED_LEVELS[index - 1].id : null;
}

/** Chapitre et mission qui débloquent un pouvoir (pour l'écran Pouvoirs). */
export function unlockMissionOf(power: PowerId): { chapter: number; number: number } | null {
  for (const chapter of CHAPTERS) {
    const level = chapter.levels.find((candidate) => candidate.reward === power);
    if (level) return { chapter: chapter.number, number: level.number };
  }
  return null;
}

/** Chapitre auquel appartient une mission. */
export function chapterOf(levelId: string): Chapter | undefined {
  return CHAPTERS.find((chapter) => chapter.levels.some((level) => level.id === levelId));
}
