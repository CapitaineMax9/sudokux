import type { BotProfile } from '@/content/bots';
import { CHARACTERS, type CharacterId } from '@/content/characters';
import type { Localize } from '@/i18n';

import type { MatchSetup } from './setup';

/** L'adversaire d'un duel, qu'il soit un bot ou un joueur en ligne. */
export interface Rival {
  name: string;
  color: string;
  portrait: CharacterId;
  /** Répliques lancées pendant le duel (bots uniquement). */
  taunts: BotProfile['taunts'] | null;
}

/** Couleur des joueurs en ligne, pour les distinguer de X. */
export const ONLINE_RIVAL_COLOR = '#ff6f59';

export function rivalOf(setup: MatchSetup, l: Localize): Rival | null {
  if (setup.bot) {
    const character = CHARACTERS[setup.bot.character];
    return {
      name: l(character.name),
      color: character.color,
      portrait: setup.bot.character,
      taunts: setup.bot.taunts,
    };
  }
  if (setup.rival !== null) {
    return { name: setup.rival, color: ONLINE_RIVAL_COLOR, portrait: 'x', taunts: null };
  }
  return null;
}
