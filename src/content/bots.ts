import type { BotConfig } from '@/engine/match';
import type { Difficulty, Variant } from '@/engine/sudoku';
import type { L10n } from '@/i18n/strings';

import type { CharacterId } from './characters';

/** Moments où un adversaire lâche une réplique pendant un duel. */
export type TauntMoment = 'start' | 'attack' | 'hit' | 'blocked' | 'lead' | 'win' | 'lose';

export interface BotProfile {
  id: string;
  character: CharacterId;
  /** 0 = entraînement … 3 = boss. */
  tier: 0 | 1 | 2 | 3;
  /** Mission d'histoire à terminer pour l'affronter librement (`null` = toujours dispo). */
  unlockedBy: string | null;
  puzzle: { difficulty: Difficulty; clues: number; variant: Variant };
  config: BotConfig;
  taunts: Record<TauntMoment, L10n[]>;
}

/**
 * Réglages des adversaires. Une grille de duel a environ 37 cases à remplir.
 * `cellMs` est le rythme de départ du bot. Ensuite, `pace` cale sa vitesse
 * sur celle du joueur (`ratio` 1.1 = 10 % plus lent que lui), dans les
 * limites `minMs` / `maxMs`. Les duels restent ainsi serrés quel que soit
 * le niveau du joueur : c'est l'usage des pouvoirs qui fait la différence.
 */
export const BOTS: Record<string, BotProfile> = {
  drone: {
    id: 'drone',
    character: 'drone',
    tier: 0,
    unlockedBy: null,
    puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
    config: {
      id: 'drone',
      cellMs: [9500, 12500],
      mistakeChance: 0.06,
      powers: [],
      powerDelayMs: [20000, 30000],
      shieldReflex: 0,
      pace: { ratio: 1.25, minMs: 8000, maxMs: 19000 },
      startDelayMs: 3500,
    },
    taunts: {
      start: [{ fr: "Séquence d'entraînement lancée.", en: 'Training sequence started.' }],
      attack: [{ fr: 'Test de résistance.', en: 'Stress test.' }],
      hit: [{ fr: 'Impact enregistré.', en: 'Impact logged.' }],
      blocked: [{ fr: 'Parade enregistrée.', en: 'Block logged.' }],
      lead: [{ fr: 'Vous êtes en retard sur le programme.', en: 'You are behind schedule.' }],
      win: [{ fr: 'Entraînement terminé. Recommencez.', en: 'Training over. Try again.' }],
      lose: [{ fr: 'Performance validée.', en: 'Performance approved.' }],
    },
  },

  pixel: {
    id: 'pixel',
    character: 'pixel',
    tier: 1,
    unlockedBy: 'c1m5',
    puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
    config: {
      id: 'pixel',
      cellMs: [8000, 11000],
      mistakeChance: 0.09,
      powers: ['freeze'],
      powerDelayMs: [16000, 24000],
      shieldReflex: 0,
      pace: { ratio: 1.12, minMs: 6000, maxMs: 17000 },
      startDelayMs: 3000,
    },
    taunts: {
      start: [
        { fr: 'Prêt à perdre ?', en: 'Ready to lose?' },
        { fr: 'Trois, deux, un, go !', en: 'Three, two, one, go!' },
      ],
      attack: [
        { fr: 'Cadeau !', en: 'Special delivery!' },
        { fr: 'Brrr, ça caille chez toi ?', en: 'Brrr, chilly over there?' },
      ],
      hit: [
        { fr: 'Hé ! Pas cool !', en: 'Hey! Not cool!' },
        { fr: "J'ai rien senti. Presque rien.", en: 'Felt nothing. Almost nothing.' },
      ],
      blocked: [{ fr: "Raté, je t'avais vu venir !", en: 'Missed, saw that coming!' }],
      lead: [{ fr: 'Tu dors ou quoi ?', en: 'Are you asleep or what?' }],
      win: [{ fr: "Et c'est qui le meilleur ?", en: "And who's the best?" }],
      lose: [{ fr: "C'était la latence !", en: 'That was lag!' }],
    },
  },

  vesper: {
    id: 'vesper',
    character: 'vesper',
    tier: 2,
    unlockedBy: 'c1m7',
    puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
    config: {
      id: 'vesper',
      cellMs: [7000, 9600],
      mistakeChance: 0.04,
      powers: ['freeze', 'glitch', 'shield'],
      powerDelayMs: [12000, 19000],
      shieldReflex: 0.45,
      pace: { ratio: 1.04, minMs: 5000, maxMs: 16000 },
      startDelayMs: 2500,
    },
    taunts: {
      start: [{ fr: 'Procédure standard.', en: 'Standard procedure.' }],
      attack: [
        { fr: 'Rien de personnel.', en: 'Nothing personal.' },
        { fr: 'Contre-mesure appliquée.', en: 'Countermeasure applied.' },
      ],
      hit: [{ fr: 'Négligeable.', en: 'Negligible.' }],
      blocked: [{ fr: 'Prévisible.', en: 'Predictable.' }],
      lead: [{ fr: 'Vous ralentissez.', en: 'You are slowing down.' }],
      win: [{ fr: 'Scellé. Affaire classée.', en: 'Sealed. Case closed.' }],
      lose: [{ fr: 'Impossible…', en: 'Impossible…' }],
    },
  },

  neuf: {
    id: 'neuf',
    character: 'neuf',
    tier: 3,
    unlockedBy: 'c1m8',
    puzzle: { difficulty: 'easy', clues: 44, variant: 'x' },
    config: {
      id: 'neuf',
      cellMs: [6200, 8600],
      mistakeChance: 0.03,
      powers: ['freeze', 'glitch', 'blackout', 'shield', 'purge'],
      powerDelayMs: [9000, 15000],
      shieldReflex: 0.55,
      pace: { ratio: 1.0, minMs: 4200, maxMs: 15500 },
      startDelayMs: 2500,
    },
    taunts: {
      start: [{ fr: 'Admirez un professionnel !', en: 'Behold a professional!' }],
      attack: [
        { fr: 'Ça, ce sera facturé !', en: "That one's going on your bill!" },
        { fr: 'Avec les compliments de la direction !', en: 'Compliments of the management!' },
      ],
      hit: [{ fr: 'Comment osez-vous ?!', en: 'How dare you?!' }],
      blocked: [
        {
          fr: 'Mon bouclier vaut plus cher que ton quartier !',
          en: 'My shield is worth more than your whole block!',
        },
      ],
      lead: [{ fr: 'Déjà fatigué, le rat ?', en: 'Tired already, little rat?' }],
      win: [{ fr: 'Suivant !', en: 'Next!' }],
      lose: [{ fr: 'Non, non, NON !', en: 'No, no, NO!' }],
    },
  },

  twins: {
    id: 'twins',
    character: 'twins',
    tier: 2,
    unlockedBy: 'c2m3',
    puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
    config: {
      id: 'twins',
      cellMs: [7000, 9600],
      mistakeChance: 0.06,
      powers: ['siphon', 'freeze', 'shield'],
      powerDelayMs: [10000, 16000],
      shieldReflex: 0.4,
      pace: { ratio: 1.05, minMs: 5000, maxMs: 16000 },
      startDelayMs: 2500,
    },
    taunts: {
      start: [{ fr: 'Rien à déclarer ?', en: 'Anything to declare?' }],
      attack: [
        { fr: 'Prélèvement à la source.', en: 'Deducted at the source.' },
        { fr: 'Par ici la monnaie !', en: 'Hand it over!' },
      ],
      hit: [{ fr: 'Outrage à douanier !', en: 'Assaulting a customs officer!' }],
      blocked: [{ fr: 'Refusé. Formulaire incomplet.', en: 'Denied. Incomplete form.' }],
      lead: [{ fr: 'Vous êtes en retard de paiement.', en: 'Your payment is overdue.' }],
      win: [{ fr: 'Le compte est bon.', en: 'The tally is correct.' }],
      lose: [{ fr: 'On a été volés !', en: 'We were robbed!' }],
    },
  },

  vesper2: {
    id: 'vesper2',
    character: 'vesper',
    tier: 2,
    unlockedBy: 'c2m6',
    puzzle: { difficulty: 'easy', clues: 44, variant: 'classic' },
    config: {
      id: 'vesper2',
      cellMs: [6600, 9000],
      mistakeChance: 0.04,
      powers: ['freeze', 'glitch', 'mirror', 'purge'],
      powerDelayMs: [11000, 17000],
      shieldReflex: 0.5,
      pace: { ratio: 1.05, minMs: 4800, maxMs: 16000 },
      startDelayMs: 2500,
    },
    taunts: {
      start: [{ fr: 'Montrez-moi.', en: 'Show me.' }],
      attack: [{ fr: 'Tenez bon.', en: 'Hold on.' }],
      hit: [{ fr: 'Mieux.', en: 'Better.' }],
      blocked: [{ fr: 'Regardez avant de frapper.', en: 'Look before you strike.' }],
      lead: [{ fr: 'Huit sera plus rapide que moi.', en: 'Eight will be faster than me.' }],
      win: [{ fr: 'Pas encore prêts.', en: 'Not ready yet.' }],
      lose: [{ fr: 'Elle avait raison.', en: 'She was right.' }],
    },
  },

  huit: {
    id: 'huit',
    character: 'huit',
    tier: 3,
    unlockedBy: 'c2m8',
    puzzle: { difficulty: 'easy', clues: 44, variant: 'x' },
    config: {
      id: 'huit',
      cellMs: [6200, 8600],
      mistakeChance: 0.03,
      powers: ['siphon', 'flip', 'blackout', 'mirror', 'purge'],
      powerDelayMs: [9000, 14000],
      shieldReflex: 0.5,
      pace: { ratio: 1.03, minMs: 4200, maxMs: 15500 },
      startDelayMs: 2500,
    },
    taunts: {
      start: [{ fr: 'Voyons ce que vous valez.', en: 'Let us see what you are worth.' }],
      attack: [
        { fr: 'Merci pour votre contribution.', en: 'Thank you for your contribution.' },
        { fr: 'Comptez bien, tout bascule.', en: 'Count carefully, it is all tipping over.' },
      ],
      hit: [{ fr: 'Ça, je le mets sur votre note.', en: 'That goes on your tab.' }],
      blocked: [{ fr: 'Retour à l’envoyeur, avec intérêts.', en: 'Return to sender, with interest.' }],
      lead: [{ fr: 'Votre cours est en baisse.', en: 'Your stock is falling.' }],
      win: [{ fr: 'Affaire conclue.', en: 'Deal closed.' }],
      lose: [{ fr: 'Bilan négatif…', en: 'A net loss…' }],
    },
  },
};

/** Ordre d'affichage dans le menu Duel. */
export const BOT_ORDER = ['drone', 'pixel', 'vesper', 'neuf', 'twins', 'huit'] as const;
