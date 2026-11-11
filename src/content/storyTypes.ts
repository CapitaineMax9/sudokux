import type { CountermeasureConfig } from '@/engine/match';
import type { PowerId } from '@/engine/powers';
import type { Difficulty, Variant } from '@/engine/sudoku';
import type { L10n } from '@/i18n/strings';

import type { CharacterId } from './characters';

export interface StoryLine {
  who: CharacterId;
  text: L10n;
}

export type LevelKind = 'solo' | 'duel' | 'boss';

export interface StoryLevel {
  id: string;
  number: number;
  kind: LevelKind;
  title: L10n;
  brief: L10n;
  /** Graine fixe : la mission propose toujours la même grille. */
  seed: number;
  puzzle: { difficulty: Difficulty; clues?: number; variant: Variant };
  maxMistakes: number | null;
  timeLimitMs: number | null;
  countermeasures: CountermeasureConfig | null;
  /** Adversaire (missions de duel), voir `bots.ts`. */
  botId: string | null;
  /** Temps à battre pour la troisième étoile (missions solo). */
  parTimeMs: number;
  /** Pouvoir débloqué à la première victoire. */
  reward: PowerId | null;
  intro: StoryLine[];
  outro: StoryLine[];
}

export interface Chapter {
  id: string;
  number: number;
  title: L10n;
  subtitle: L10n;
  levels: StoryLevel[];
}
