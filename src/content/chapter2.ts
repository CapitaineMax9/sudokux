/**
 * Chapitre 2 — Le Huitième : les docks de données.
 *
 * Tout ce qui circule dans Ennéa transite par les docks, et la Directrice
 * Huit prélève sa part sur chaque paquet. X et Écho y cherchent le deuxième
 * fragment d'Harmonie : celui qui distribuait à chacun ce qu'il lui fallait.
 */
import type { L10n } from '@/i18n/strings';

import type { CharacterId } from './characters';
import type { Chapter, StoryLine } from './storyTypes';

const MIN = 60_000;

const say = (who: CharacterId, fr: string, en: string): StoryLine => ({ who, text: { fr, en } });
const text = (fr: string, en: string): L10n => ({ fr, en });

export const CHAPTER_2: Chapter = {
  id: 'c2',
  number: 2,
  title: text('Le Huitième', 'The Eighth'),
  subtitle: text('Marée haute', 'High tide'),
  levels: [
    {
      id: 'c2m1',
      number: 1,
      kind: 'solo',
      title: text('La douane', 'Customs'),
      brief: text(
        "Le portique des docks gèle et brouille ceux qui forcent le passage. Garde ton Pare-feu prêt.",
        'The dock gate freezes and scrambles anyone forcing their way in. Keep your Firewall ready.',
      ),
      seed: 9101,
      puzzle: { difficulty: 'medium', clues: 36, variant: 'classic' },
      maxMistakes: 3,
      timeLimitMs: null,
      countermeasures: { firstAtMs: 22_000, everyMs: [26_000, 36_000], pool: ['freeze', 'glitch'] },
      botId: null,
      parTimeMs: 9 * MIN,
      reward: 'sonar',
      intro: [
        say('system', 'DISTRICT 8 — LES DOCKS DE DONNÉES.', 'DISTRICT 8 — THE DATA DOCKS.'),
        say(
          'system',
          "Ici, rien n'entre et rien ne sort sans payer.",
          'Here, nothing comes in and nothing goes out without paying.',
        ),
        say(
          'echo',
          "X, depuis que j'ai retrouvé un fragment, j'entends le deuxième. On dirait la mer.",
          "X, ever since I got one fragment back, I can hear the second. It sounds like the sea.",
        ),
        say(
          'x',
          "C'est le bruit des conteneurs de données. Tout ce que la ville échange passe par ces quais.",
          "That's the sound of data containers. Everything the city trades goes through these quays.",
        ),
        say(
          'mamie',
          "X ? C'est Mamie. Mon petit-fils Kilo travaille aux docks. Dis-lui que sa grand-mère attend son coup de fil depuis trois ans.",
          "X? It's Granny. My grandson Kilo works at the docks. Tell him his grandmother has been waiting three years for his call.",
        ),
        say('x', 'Kilo Octet. Évidemment.', 'Kilo Byte. Of course.'),
        say(
          'echo',
          "Le portique de la douane est un Scellé. Il n'a pas l'air commode.",
          "The customs gate is a Seal. It doesn't look friendly.",
        ),
      ],
      outro: [
        say(
          'kilo',
          "Hé ! C'est vous qui avez ouvert le portique sans payer ? Personne fait ça. Jamais.",
          "Hey! You're the ones who opened the gate without paying? Nobody does that. Ever.",
        ),
        say('x', 'Kilo ? Ta grand-mère attend ton appel.', 'Kilo? Your grandmother is waiting for your call.'),
        say(
          'kilo',
          "… Depuis combien de temps elle dit ?",
          '…How long did she say?',
        ),
        say('echo', 'Trois ans.', 'Three years.'),
        say(
          'kilo',
          "Aïe. Bon. Je suis grutier, je vois tout d'en haut. Prenez mon Sonar : il fait briller les cases qu'on peut trouver tout de suite.",
          "Ouch. Right. I'm a crane operator, I see everything from up there. Take my Sonar: it lights up the cells you can work out right away.",
        ),
        say(
          'kilo',
          "Et je l'appelle ce soir. Promis. Demain au plus tard.",
          "And I'll call her tonight. Promise. Tomorrow at the latest.",
        ),
      ],
    },

    {
      id: 'c2m2',
      number: 2,
      kind: 'solo',
      title: text('Marée haute', 'High tide'),
      brief: text(
        "La marée de données monte : ouvre le Scellé de l'écluse avant qu'elle ne submerge le quai. Le Sonar te montre où chercher.",
        'The data tide is rising: open the lock gate Seal before it floods the quay. Sonar shows you where to look.',
      ),
      seed: 9102,
      puzzle: { difficulty: 'medium', clues: 35, variant: 'classic' },
      maxMistakes: 3,
      timeLimitMs: 9 * MIN,
      countermeasures: null,
      botId: null,
      parTimeMs: 6 * MIN,
      reward: null,
      intro: [
        say(
          'kilo',
          "Le fragment que vous cherchez, il est dans le Grand Livre de la Directrice Huit. Tout au bout des quais.",
          "The fragment you're after is in Director Eight's Great Ledger. All the way at the end of the quays.",
        ),
        say('echo', "Pourquoi « la marée » ?", 'Why "the tide"?'),
        say(
          'kilo',
          "Deux fois par jour, la ville envoie toutes ses données d'un coup. Ça monte, ça déborde, et Huit taxe chaque goutte.",
          'Twice a day the city sends all its data at once. It rises, it overflows, and Eight taxes every drop.',
        ),
        say(
          'kilo',
          "Elle arrive dans neuf minutes. Si l'écluse reste scellée, on finit tous à la baille.",
          "It's coming in nine minutes. If the lock stays sealed, we all end up in the drink.",
        ),
        say('x', 'Neuf minutes. Reste près de moi, Écho.', 'Nine minutes. Stay close, Echo.'),
        say('echo', 'Je suis dans ta poche, X.', "I'm in your pocket, X."),
      ],
      outro: [
        say(
          'echo',
          "Toute cette eau… Je me souviens. Avant, la marée n'appartenait à personne.",
          'All that water… I remember. Before, the tide belonged to no one.',
        ),
        say(
          'echo',
          "C'était moi qui la répartissais. À chacun ce qu'il lui fallait. Sans compter.",
          'I was the one who shared it out. To each what they needed. Without counting.',
        ),
        say('kilo', 'Sans compter ? Ici ? Dites pas ça trop fort.', "Without counting? Here? Don't say that too loud."),
      ],
    },

    {
      id: 'c2m3',
      number: 3,
      kind: 'duel',
      title: text('Pair et Impair', 'Even and Odd'),
      brief: text(
        "Les jumeaux de la douane taxent ta charge avec leur Siphon. Dépense-la avant qu'ils ne la prennent.",
        'The customs twins tax your charge with their Siphon. Spend it before they take it.',
      ),
      seed: 9103,
      puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
      maxMistakes: null,
      timeLimitMs: null,
      countermeasures: null,
      botId: 'twins',
      parTimeMs: 6 * MIN,
      reward: 'siphon',
      intro: [
        say('twins', 'Halte.', 'Halt.'),
        say('twins', 'Stop.', 'Stop.'),
        say('twins', 'Je suis Pair. Je suis poli.', 'I am Even. I am polite.'),
        say('twins', "Je suis Impair. Pas moi.", 'I am Odd. I am not.'),
        say(
          'x',
          'Les jumeaux de la douane. On paie comment, pour passer ?',
          'The customs twins. How do we pay to get through?',
        ),
        say(
          'twins',
          'En charge. Trente pour cent. Prélevés à la source.',
          'In charge. Thirty percent. Deducted at the source.',
        ),
        say('twins', "Et s'il en reste, on reprend le reste.", "And if there's any left, we take the rest."),
        say('echo', "Ce n'est pas très harmonieux.", "That's not very harmonious."),
      ],
      outro: [
        say('twins', 'Nous avons perdu. Le compte est juste.', 'We lost. The tally is correct.'),
        say('twins', "Le compte est faux ! On a été volés !", 'The tally is wrong! We were robbed!'),
        say(
          'twins',
          'Impair. Nous volons les gens toute la journée. Soyons beaux joueurs.',
          'Odd. We rob people all day long. Let us be good sports.',
        ),
        say(
          'x',
          'Je prends votre Siphon. Appelez ça une taxe.',
          "I'm taking your Siphon. Call it a tax.",
        ),
        say('twins', "… Le sens des affaires.", '…A real head for business.'),
      ],
    },

    {
      id: 'c2m4',
      number: 4,
      kind: 'solo',
      title: text('Conteneur 8-8-8', 'Container 8-8-8'),
      brief: text(
        "Un Scellé-X piégé : il plonge des blocs dans le noir et efface des chiffres déjà trouvés. Le Pare-feu absorbe ses contre-mesures.",
        'A booby-trapped X-Seal: it blacks out blocks and erases digits you already found. Firewall absorbs its countermeasures.',
      ),
      seed: 9104,
      puzzle: { difficulty: 'medium', clues: 35, variant: 'x' },
      maxMistakes: 3,
      timeLimitMs: null,
      countermeasures: { firstAtMs: 24_000, everyMs: [28_000, 40_000], pool: ['blackout', 'virus'] },
      botId: null,
      parTimeMs: 10 * MIN,
      reward: null,
      intro: [
        say(
          'kilo',
          "Le Grand Livre est verrouillé par trois clés. Huit en garde une dans le conteneur 8-8-8. Son préféré.",
          'The Great Ledger is locked with three keys. Eight keeps one in container 8-8-8. Her favourite.',
        ),
        say('echo', 'Pourquoi celui-là ?', 'Why that one?'),
        say(
          'kilo',
          "Parce que huit, couché, ça fait l'infini. Elle trouve ça drôle. Personne d'autre.",
          'Because eight, lying down, makes infinity. She thinks it is funny. Nobody else does.',
        ),
        say(
          'x',
          "C'est un Scellé-X. Les diagonales comptent. Et il est piégé.",
          "It's an X-Seal. Diagonals count. And it's booby-trapped.",
        ),
        say(
          'kilo',
          "Il efface ce que tu as déjà trouvé. Huit déteste qu'on garde ce qu'on a gagné.",
          'It erases what you already found. Eight hates people keeping what they earned.',
        ),
      ],
      outro: [
        say('echo', 'Une clé sur trois. Et… X, il y a un nom gravé dessous.', 'One key out of three. And… X, there is a name engraved under it.'),
        say(
          'echo',
          '« O. Octet, ingénieure en chef de la Trame. »',
          '"O. Byte, chief engineer of the Lattice."',
        ),
        say('x', 'Mamie ?', 'Granny?'),
        say(
          'kilo',
          "Ah. Elle vous a pas dit. C'est Mamie qui a posé le tout premier Scellé. Pour protéger Harmonie. Pas pour l'enfermer.",
          "Ah. She didn't tell you. Granny laid the very first Seal. To protect Harmony. Not to lock her in.",
        ),
        say(
          'kilo',
          "Elle en parle jamais. Elle fait des nouilles.",
          'She never talks about it. She makes noodles.',
        ),
      ],
    },

    {
      id: 'c2m5',
      number: 5,
      kind: 'solo',
      title: text('Gros temps', 'Heavy weather'),
      brief: text(
        "La barge tangue : la grille se retourne tête en bas. Attention, un 6 à l'envers ressemble à un 9.",
        'The barge is rolling: the grid flips upside down. Careful, an upside-down 6 looks like a 9.',
      ),
      seed: 9105,
      puzzle: { difficulty: 'medium', clues: 35, variant: 'classic' },
      maxMistakes: 3,
      timeLimitMs: null,
      countermeasures: { firstAtMs: 18_000, everyMs: [24_000, 34_000], pool: ['flip', 'flip', 'freeze'] },
      botId: null,
      parTimeMs: 9 * MIN,
      reward: null,
      intro: [
        say(
          'kilo',
          "La deuxième clé est sur une barge, au large. Je vous emmène. J'ai le permis. Presque.",
          'The second key is on a barge, offshore. I will take you. I have a licence. Almost.',
        ),
        say('echo', "X, pourquoi l'horizon penche ?", 'X, why is the horizon tilting?'),
        say('x', 'Parce que Kilo conduit.', 'Because Kilo is driving.'),
        say(
          'kilo',
          "C'est la houle ! Quand ça roule trop, tout se retrouve à l'envers. Même les Scellés.",
          "It's the swell! When it rolls too hard, everything ends up upside down. Even Seals.",
        ),
        say(
          'x',
          "Un 6 à l'envers, c'est un 9. Je déteste les bateaux.",
          'An upside-down 6 is a 9. I hate boats.',
        ),
      ],
      outro: [
        say('kilo', 'Deux clés ! On est des pirates.', 'Two keys! We are pirates.'),
        say(
          'echo',
          "Kilo, il y a quelqu'un sur le quai. Elle nous attend.",
          'Kilo, there is someone on the quay. She is waiting for us.',
        ),
        say('vesper', 'Vous êtes en retard. Et trempés.', 'You are late. And soaked.'),
        say('x', 'Vesper. Tu viens nous sceller ?', 'Vesper. Here to seal us?'),
        say(
          'vesper',
          "Je ne travaille plus pour Neuf. Je viens voir si vous méritez ce que vous transportez.",
          'I no longer work for Nine. I came to see whether you deserve what you are carrying.',
        ),
      ],
    },

    {
      id: 'c2m6',
      number: 6,
      kind: 'duel',
      title: text('Retour de flamme', 'Backfire'),
      brief: text(
        'Vesper a un Miroir : tes attaques peuvent te revenir. Attends qu’il tombe, ou frappe quand elle n’a plus de charge.',
        'Vesper has a Mirror: your attacks can come back at you. Wait for it to drop, or strike when she is out of charge.',
      ),
      seed: 9106,
      puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
      maxMistakes: null,
      timeLimitMs: null,
      countermeasures: null,
      botId: 'vesper2',
      parTimeMs: 6 * MIN,
      reward: 'mirror',
      intro: [
        say(
          'vesper',
          "Il y a dix ans, à l'Académie, quelqu'un m'a appris à résoudre. Elle disait que je résolvais seule.",
          'Ten years ago, at the Academy, someone taught me to solve. She used to say I solved alone.',
        ),
        say('echo', 'Qui ?', 'Who?'),
        say('vesper', 'Toi.', 'You.'),
        say('echo', '… Je ne me souviens pas de toi.', '…I do not remember you.'),
        say(
          'vesper',
          "Je sais. C'est pour ça que je dois vérifier. Si X perd contre moi, X perdra contre Huit, et tu disparaîtras une seconde fois.",
          'I know. That is why I have to check. If X loses to me, X will lose to Eight, and you will vanish a second time.',
        ),
        say('x', "Tu aurais pu simplement demander.", 'You could have just asked.'),
        say('vesper', 'Je demande. En garde.', 'I am asking. On guard.'),
      ],
      outro: [
        say('vesper', 'Bien. Vous résolvez à deux. Elle avait raison.', 'Good. You solve as two. She was right.'),
        say(
          'vesper',
          "Prenez mon Miroir. Huit vole tout ce qu'elle touche : renvoyez-lui ses propres attaques.",
          'Take my Mirror. Eight steals everything she touches: send her own attacks back at her.',
        ),
        say('echo', 'Vesper… Est-ce que je t’aimais bien ?', 'Vesper… Did I like you?'),
        say('vesper', "Tu me donnais des devoirs en plus.", 'You gave me extra homework.'),
        say('echo', "Alors oui.", 'Then yes.'),
        say(
          'vesper',
          "La troisième clé est dans le Grand Livre lui-même. Je ne peux pas vous suivre. J'enquête de mon côté.",
          'The third key is inside the Great Ledger itself. I cannot follow you. I am investigating on my own.',
        ),
      ],
    },

    {
      id: 'c2m7',
      number: 7,
      kind: 'solo',
      title: text('Le Grand Livre', 'The Great Ledger'),
      brief: text(
        "Le registre de Huit ne pardonne rien : deux erreurs et il se referme, et l'alarme sonne dans quatorze minutes.",
        'Eight’s ledger forgives nothing: two mistakes and it snaps shut, and the alarm goes off in fourteen minutes.',
      ),
      seed: 9107,
      puzzle: { difficulty: 'hard', clues: 31, variant: 'classic' },
      maxMistakes: 2,
      timeLimitMs: 14 * MIN,
      countermeasures: null,
      botId: null,
      parTimeMs: 10 * MIN,
      reward: null,
      intro: [
        say(
          'kilo',
          "Voilà. Le Grand Livre. Tout ce que la ville doit à Huit est écrit là-dedans.",
          'There. The Great Ledger. Everything the city owes Eight is written in there.',
        ),
        say('echo', 'Et mon fragment sert à quoi, là-dedans ?', 'And what is my fragment doing in there?'),
        say(
          'kilo',
          "À compter. Elle a pris celui qui partageait, et elle lui fait tenir les comptes.",
          'Counting. She took the one who shared things out, and she has it keeping the books.',
        ),
        say('echo', "C'est… cruel.", 'That is… cruel.'),
        say(
          'x',
          "Deux erreurs et il se referme. Pas de place pour le hasard. On y va doucement.",
          'Two mistakes and it shuts. No room for luck. We go slowly.',
        ),
      ],
      outro: [
        say('system', '> GRAND LIVRE OUVERT', '> GREAT LEDGER OPEN'),
        say(
          'echo',
          "X, regarde. Ton nom est dedans. Le quartier du Neuvième. Mamie. Pixel. Tout le monde doit quelque chose.",
          'X, look. Your name is in here. The Ninth. Granny. Pixel. Everybody owes something.',
        ),
        say('x', 'Plus pour longtemps.', 'Not for long.'),
        say(
          'huit',
          "Quelle jolie phrase. Je la note. Elle vous sera facturée.",
          'What a lovely line. I am writing it down. You will be billed for it.',
        ),
      ],
    },

    {
      id: 'c2m8',
      number: 8,
      kind: 'boss',
      title: text('La Directrice Huit', 'Director Eight'),
      brief: text(
        "Duel final sur un Scellé-X. Huit siphonne ta charge et retourne ta grille. Renvoie-lui ses attaques avec le Miroir.",
        'Final duel on an X-Seal. Eight siphons your charge and flips your grid. Send her attacks back with the Mirror.',
      ),
      seed: 9108,
      puzzle: { difficulty: 'easy', clues: 44, variant: 'x' },
      maxMistakes: null,
      timeLimitMs: null,
      countermeasures: null,
      botId: 'huit',
      parTimeMs: 6 * MIN,
      reward: 'flip',
      intro: [
        say(
          'huit',
          "Asseyez-vous. Non, pas là, c'est payant. Là non plus.",
          'Do sit down. No, not there, that one costs money. Not there either.',
        ),
        say('x', 'Directrice Huit.', 'Director Eight.'),
        say(
          'huit',
          "Neuf était un imbécile : il voulait vous arrêter. Moi, je veux vous acheter. Combien, pour la petite voix ?",
          'Nine was a fool: he wanted to stop you. I want to buy you. How much for the little voice?',
        ),
        say('echo', 'Je ne suis pas à vendre.', 'I am not for sale.'),
        say(
          'huit',
          "Tout est à vendre, ma chérie. Il suffit de trouver le prix. Le vôtre, je vais le calculer pendant le duel.",
          'Everything is for sale, darling. One only has to find the price. I shall work out yours during the duel.',
        ),
        say(
          'huit',
          "Je vous préviens : tout ce que vous gagnerez, je le prendrai. Et quand tout basculera, comptez bien.",
          'Fair warning: whatever you earn, I will take. And when everything tips over, do count carefully.',
        ),
      ],
      outro: [
        say('huit', "… Bilan négatif. C'est la première fois.", '…A net loss. That is a first.'),
        say('system', '> FRAGMENT 2 / 9 RÉCUPÉRÉ', '> FRAGMENT 2 / 9 RECOVERED'),
        say(
          'echo',
          "Je me souviens des quais, la nuit. Des gens qui ne se connaissaient pas et qui se passaient ce dont ils avaient besoin. Je ne faisais que tenir la lumière.",
          'I remember the quays at night. People who did not know each other, passing along what they needed. All I did was hold the light.',
        ),
        say(
          'huit',
          "Gardez-la, votre lumière. Mais méfiez-vous de Sept. Moi, je prends ce qu'on a. Lui, il prend ce qu'on est.",
          'Keep your light. But beware of Seven. I take what people have. He takes what people are.',
        ),
        say('system', '> MESSAGE URGENT — PIXEL', '> URGENT MESSAGE — PIXEL'),
        say(
          'pixel',
          "X ! Réponds ! Des chasseurs sont venus au Bol de Bits. Ils ont emmené Mamie !",
          'X! Pick up! Hunters came to the Bit Bowl. They took Granny!',
        ),
        say(
          'pixel',
          "Ils ont dit un truc bizarre. « Le Septième a besoin d'une jardinière. »",
          'They said something weird. "The Seventh needs a gardener."',
        ),
        say('kilo', "Mamie… Je l'ai même pas rappelée.", "Granny… I never even called her back."),
        say('x', "Tu lui diras en face. On va la chercher.", "You'll tell her in person. We're going to get her."),
        say('system', 'FIN DU CHAPITRE 2 — LE HUITIÈME', 'END OF CHAPTER 2 — THE EIGHTH'),
      ],
    },
  ],
};
