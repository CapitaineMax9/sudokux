/**
 * Prépare une partie à partir de ce que le joueur a choisi : une mission de
 * l'histoire, une partie libre ou un duel contre un adversaire.
 */
import { BOTS, type BotProfile } from '@/content/bots';
import { getLevel, type StoryLevel } from '@/content/story';
import { PAR_TIME_MS, type MatchConfig } from '@/engine/match';
import { LOADOUT_SIZE, POWERS, POWER_ORDER, RULES, type PowerId } from '@/engine/powers';
import { hashString, randomSeed } from '@/engine/rng';
import { generatePuzzle, type Difficulty, type Variant } from '@/engine/sudoku';

export type MatchMeta =
  | { kind: 'story'; levelId: string }
  | { kind: 'free'; difficulty: Difficulty; variant: Variant }
  | { kind: 'duel'; botId: string };

export interface MatchSetup {
  meta: MatchMeta;
  config: MatchConfig;
  /** Temps de référence pour la troisième étoile (parties solo). */
  parTimeMs: number;
  level: StoryLevel | null;
  bot: BotProfile | null;
}

interface PlayerPowers {
  powers: PowerId[];
  loadout: PowerId[];
}

/** En solo : tous les pouvoirs débloqués qui ne visent pas un adversaire. */
export function soloPowers(unlocked: PowerId[]): PowerId[] {
  return POWER_ORDER.filter((p) => unlocked.includes(p) && POWERS[p].kind !== 'attack');
}

/** En duel : l'équipement choisi, ou à défaut les premiers pouvoirs débloqués. */
export function duelPowers({ powers, loadout }: PlayerPowers): PowerId[] {
  const chosen = loadout.filter((p) => powers.includes(p)).slice(0, LOADOUT_SIZE);
  if (chosen.length > 0) return POWER_ORDER.filter((p) => chosen.includes(p));
  return POWER_ORDER.filter((p) => powers.includes(p)).slice(0, LOADOUT_SIZE);
}

export function freeKey(difficulty: Difficulty, variant: Variant): string {
  return `${difficulty}:${variant}`;
}

export function buildStoryMatch(levelId: string, player: PlayerPowers): MatchSetup | null {
  const level = getLevel(levelId);
  if (!level) return null;
  const bot = level.botId ? (BOTS[level.botId] ?? null) : null;
  const puzzle = generatePuzzle({ seed: level.seed, ...level.puzzle });
  const duel = bot !== null;

  return {
    meta: { kind: 'story', levelId },
    level,
    bot,
    parTimeMs: level.parTimeMs,
    config: {
      mode: duel ? 'duel' : 'solo',
      puzzle,
      // Le hasard de la partie (IA, attaques) change à chaque tentative.
      seed: randomSeed(),
      powers: duel ? duelPowers(player) : soloPowers(player.powers),
      maxMistakes: level.maxMistakes,
      timeLimitMs: level.timeLimitMs,
      countermeasures: level.countermeasures,
      bot: bot ? bot.config : null,
      remote: false,
    },
  };
}

export function buildFreeMatch(
  difficulty: Difficulty,
  variant: Variant,
  player: PlayerPowers,
  seed: number = randomSeed(),
): MatchSetup {
  return {
    meta: { kind: 'free', difficulty, variant },
    level: null,
    bot: null,
    parTimeMs: PAR_TIME_MS[difficulty],
    config: {
      mode: 'solo',
      puzzle: generatePuzzle({ seed, difficulty, variant }),
      seed: (seed ^ hashString('free')) >>> 0,
      powers: soloPowers(player.powers),
      maxMistakes: RULES.defaultMaxMistakes,
      timeLimitMs: null,
      countermeasures: null,
      bot: null,
      remote: false,
    },
  };
}

export function buildDuelMatch(
  botId: string,
  player: PlayerPowers,
  seed: number = randomSeed(),
): MatchSetup | null {
  const bot = BOTS[botId];
  if (!bot) return null;
  return {
    meta: { kind: 'duel', botId },
    level: null,
    bot,
    parTimeMs: PAR_TIME_MS[bot.puzzle.difficulty],
    config: {
      mode: 'duel',
      puzzle: generatePuzzle({ seed, ...bot.puzzle }),
      seed: (seed ^ hashString(botId)) >>> 0,
      powers: duelPowers(player),
      maxMistakes: null,
      timeLimitMs: null,
      countermeasures: null,
      bot: bot.config,
      remote: false,
    },
  };
}
