/**
 * Catalogue des pouvoirs et constantes d'équilibrage.
 * Les noms et descriptions affichés au joueur sont dans `src/i18n`.
 */

export type PowerId =
  | 'scan'
  | 'analyse'
  | 'shield'
  | 'purge'
  | 'freeze'
  | 'glitch'
  | 'blackout'
  | 'virus';

/** `support` aide à résoudre, `defense` protège, `attack` vise l'adversaire. */
export type PowerKind = 'support' | 'defense' | 'attack';
export type AttackId = 'freeze' | 'glitch' | 'blackout' | 'virus';
/** Effets qui durent dans le temps sur le plateau d'un joueur. */
export type EffectId = 'freeze' | 'glitch' | 'blackout' | 'shield';

export interface PowerDef {
  id: PowerId;
  kind: PowerKind;
  /** Coût en charge (la jauge va de 0 à 100). */
  cost: number;
  /** Durée de l'effet en millisecondes (0 = instantané). */
  durationMs: number;
}

export const POWERS: Record<PowerId, PowerDef> = {
  /** Révèle le chiffre d'une case. */
  scan: { id: 'scan', kind: 'support', cost: 50, durationMs: 0 },
  /** Remplit automatiquement les notes de toute la grille. */
  analyse: { id: 'analyse', kind: 'support', cost: 30, durationMs: 0 },
  /** Bloque la prochaine attaque reçue. */
  shield: { id: 'shield', kind: 'defense', cost: 30, durationMs: 15000 },
  /** Annule tous les effets négatifs en cours. */
  purge: { id: 'purge', kind: 'defense', cost: 20, durationMs: 0 },
  /** Bloque la saisie de l'adversaire. */
  freeze: { id: 'freeze', kind: 'attack', cost: 40, durationMs: 4000 },
  /** Brouille l'affichage et mélange le clavier de l'adversaire. */
  glitch: { id: 'glitch', kind: 'attack', cost: 45, durationMs: 8000 },
  /** Masque trois blocs de la grille adverse. */
  blackout: { id: 'blackout', kind: 'attack', cost: 50, durationMs: 9000 },
  /** Efface des chiffres déjà trouvés par l'adversaire. */
  virus: { id: 'virus', kind: 'attack', cost: 65, durationMs: 0 },
};

/** Ordre d'affichage, qui est aussi l'ordre de déblocage dans l'histoire. */
export const POWER_ORDER: PowerId[] = [
  'scan',
  'analyse',
  'shield',
  'purge',
  'freeze',
  'glitch',
  'blackout',
  'virus',
];

export const NEGATIVE_EFFECTS: EffectId[] = ['freeze', 'glitch', 'blackout'];

export const isAttack = (id: PowerId): id is AttackId => POWERS[id].kind === 'attack';

/** Nombre de pouvoirs qu'on peut emporter en duel. */
export const LOADOUT_SIZE = 4;

export const RULES = {
  maxCharge: 100,
  /** Délai entre le lancement d'une attaque et son impact : le temps de réagir. */
  attackTravelMs: 1500,
  /** Les contre-mesures du système préviennent un peu plus longtemps. */
  systemAttackTravelMs: 2200,
  blackoutBoxes: 3,
  virusCells: 2,

  /** Deux bons chiffres posés à moins de ce délai prolongent le combo. */
  comboWindowMs: 8000,
  maxComboMultiplier: 5,
  basePoints: 100,
  unitBonus: 250,
  mistakeScorePenalty: 100,

  chargePerCell: 5,
  chargeComboBonusMax: 3,
  chargePerUnit: 5,
  mistakeChargePenalty: 10,

  /** En duel, une erreur bloque la saisie un court instant. */
  mistakeStunMs: 1200,
  defaultMaxMistakes: 3,
} as const;
