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
 * Réglages des adversaires. Une grille de duel a environ 41 cases à remplir :
 * `cellMs` × 41 donne le temps que met le bot si personne ne le gêne.
 * `rubber` le fait ralentir quand il mène et accélérer quand il est distancé,
 * pour que les duels restent serrés.
 */
export const BOTS: Record<string, BotProfile> = {
  drone: {
    id: 'drone',
    character: 'drone',
    tier: 0,
    unlockedBy: null,
    puzzle: { difficulty: 'easy', clues: 40, variant: 'classic' },
    config: {
      id: 'drone',
      cellMs: [9500, 12500],
      mistakeChance: 0.06,
      powers: [],
      powerDelayMs: [20000, 30000],
      shieldReflex: 0,
      rubber: 0.35,
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
    puzzle: { difficulty: 'easy', clues: 40, variant: 'classic' },
    config: {
      id: 'pixel',
      cellMs: [7200, 10200],
      mistakeChance: 0.09,
      powers: ['freeze'],
      powerDelayMs: [16000, 24000],
      shieldReflex: 0,
      rubber: 0.35,
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
    puzzle: { difficulty: 'easy', clues: 40, variant: 'classic' },
    config: {
      id: 'vesper',
      cellMs: [6000, 8600],
      mistakeChance: 0.04,
      powers: ['freeze', 'glitch', 'shield'],
      powerDelayMs: [12000, 19000],
      shieldReflex: 0.45,
      rubber: 0.3,
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
    puzzle: { difficulty: 'easy', clues: 40, variant: 'x' },
    config: {
      id: 'neuf',
      cellMs: [5200, 7600],
      mistakeChance: 0.03,
      powers: ['freeze', 'glitch', 'blackout', 'shield', 'purge'],
      powerDelayMs: [9000, 15000],
      shieldReflex: 0.55,
      rubber: 0.28,
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
};

/** Ordre d'affichage dans le menu Duel. */
export const BOT_ORDER = ['drone', 'pixel', 'vesper', 'neuf'] as const;
