/**
 * Déroulement d'une partie (solo ou duel) sous forme de réducteur pur :
 * `reduceMatch(état, action)` renvoie le nouvel état et la liste de ce qui
 * vient de se passer. Aucune horloge ni hasard caché : tout passe par l'état,
 * donc une partie est rejouable à l'identique et facile à tester.
 */
import { produce } from 'immer';

import { aiOnAttackHit, aiOnAttackLaunched, aiStep, createAi } from './ai';
import {
  findEffect,
  finishMatch,
  isCellHidden,
  placeCorrect,
  randBetween,
  randIndex,
  resolveAttack,
  usePower,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
  type PendingAttack,
  type Side,
  type SideState,
} from './matchCore';
import { RULES, isAttack, type PowerId } from './powers';
import { CELLS, countEmpty, type Difficulty } from './sudoku';

export type MatchAction =
  | { type: 'tick'; dt: number }
  | { type: 'select'; cell: number | null }
  | { type: 'digit'; digit: number }
  | { type: 'erase' }
  | { type: 'toggleNotes' }
  | { type: 'power'; power: PowerId }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'abandon' }
  /** Outil de test : remplit la grille d'un camp en laissant `leave` cases. */
  | { type: 'debugFill'; leave: number; side?: Side };

export interface MatchStep {
  state: MatchState;
  events: MatchEvent[];
}

function createSide(config: MatchConfig): SideState {
  return {
    values: config.puzzle.puzzle.slice(),
    notes: new Array<number>(CELLS).fill(0),
    charge: 0,
    combo: 0,
    bestCombo: 0,
    lastCorrectAt: 0,
    score: 0,
    mistakes: 0,
    remaining: countEmpty(config.puzzle.puzzle),
    effects: [],
    stunnedUntil: 0,
    powersUsed: 0,
  };
}

export function createMatch(config: MatchConfig): MatchState {
  const state: MatchState = {
    config,
    status: 'running',
    endReason: null,
    now: 0,
    player: createSide(config),
    opponent: config.bot ? createSide(config) : null,
    ai: null,
    pending: [],
    selected: null,
    notesMode: false,
    nextCountermeasureAt: config.countermeasures ? config.countermeasures.firstAtMs : null,
    rng: config.seed >>> 0,
    nextId: 1,
  };
  state.ai = createAi(state);
  return state;
}

function tick(state: MatchState, dt: number, events: MatchEvent[]): void {
  state.now += dt;
  const now = state.now;
  const sides: Side[] = state.opponent ? ['player', 'opponent'] : ['player'];

  // 1. Effets arrivés à leur terme.
  for (const who of sides) {
    const side = who === 'player' ? state.player : (state.opponent as SideState);
    for (let i = side.effects.length - 1; i >= 0; i--) {
      if (side.effects[i].until <= now) {
        const [gone] = side.effects.splice(i, 1);
        events.push({ type: 'effectEnded', side: who, effect: gone.id });
      }
    }
    if (side.combo > 0 && now - side.lastCorrectAt > RULES.comboWindowMs) side.combo = 0;
  }

  // 2. Attaques qui atteignent leur cible.
  if (state.pending.some((attack) => attack.hitAt <= now)) {
    const due: PendingAttack[] = state.pending
      .filter((attack) => attack.hitAt <= now)
      .map((attack) => ({ ...attack }));
    state.pending = state.pending.filter((attack) => attack.hitAt > now);
    for (const attack of due) {
      const before = events.length;
      resolveAttack(state, attack, events);
      const hit = events.slice(before).some((event) => event.type === 'attackHit');
      if (hit) aiOnAttackHit(state, attack);
    }
  }

  // 3. Contre-mesures du système (niveaux solo).
  const countermeasures = state.config.countermeasures;
  if (
    countermeasures &&
    state.nextCountermeasureAt !== null &&
    now >= state.nextCountermeasureAt
  ) {
    const power = countermeasures.pool[randIndex(state, countermeasures.pool.length)];
    const attack: PendingAttack = {
      id: state.nextId++,
      power,
      from: 'system',
      target: 'player',
      launchedAt: now,
      hitAt: now + RULES.systemAttackTravelMs,
    };
    state.pending.push(attack);
    events.push({ type: 'attackLaunched', attack: { ...attack } });
    state.nextCountermeasureAt =
      now + randBetween(state, countermeasures.everyMs[0], countermeasures.everyMs[1]);
  }

  // 4. Adversaire.
  aiStep(state, events);
  if (state.status !== 'running') return;

  // 5. Compte à rebours.
  const limit = state.config.timeLimitMs;
  if (limit !== null && now >= limit) finishMatch(state, 'lost', 'timeout', events);
}

function inputDigit(state: MatchState, digit: number, events: MatchEvent[]): void {
  const cell = state.selected;
  if (cell === null || digit < 1 || digit > 9) return;
  const player = state.player;
  if (player.values[cell] !== 0) return;

  if (findEffect(player, 'freeze')) {
    events.push({ type: 'inputBlocked', reason: 'frozen' });
    return;
  }
  if (player.stunnedUntil > state.now) {
    events.push({ type: 'inputBlocked', reason: 'stunned' });
    return;
  }
  if (isCellHidden(player, cell)) {
    events.push({ type: 'inputBlocked', reason: 'hidden' });
    return;
  }

  if (state.notesMode) {
    player.notes[cell] ^= 1 << (digit - 1);
    events.push({ type: 'noteToggled', cell });
    return;
  }

  if (digit === state.config.puzzle.solution[cell]) {
    placeCorrect(state, 'player', cell, events);
    return;
  }

  player.mistakes += 1;
  player.combo = 0;
  player.charge = Math.max(0, player.charge - RULES.mistakeChargePenalty);
  player.score = Math.max(0, player.score - RULES.mistakeScorePenalty);
  events.push({ type: 'mistake', side: 'player', cell, digit });

  const maxMistakes = state.config.maxMistakes;
  if (maxMistakes !== null && player.mistakes >= maxMistakes) {
    finishMatch(state, 'lost', 'mistakes', events);
  } else if (state.config.mode === 'duel') {
    player.stunnedUntil = state.now + RULES.mistakeStunMs;
  }
}

function apply(state: MatchState, action: MatchAction, events: MatchEvent[]): void {
  const running = state.status === 'running';

  switch (action.type) {
    case 'tick':
      if (running && action.dt > 0) tick(state, action.dt, events);
      return;

    case 'select':
      if (!running) return;
      if (action.cell === null) {
        state.selected = null;
      } else if (action.cell >= 0 && action.cell < CELLS && !isCellHidden(state.player, action.cell)) {
        state.selected = action.cell;
      }
      return;

    case 'digit':
      if (running) inputDigit(state, action.digit, events);
      return;

    case 'erase': {
      if (!running || state.selected === null) return;
      const player = state.player;
      if (findEffect(player, 'freeze')) {
        events.push({ type: 'inputBlocked', reason: 'frozen' });
        return;
      }
      if (player.values[state.selected] === 0 && player.notes[state.selected] !== 0) {
        player.notes[state.selected] = 0;
        events.push({ type: 'noteToggled', cell: state.selected });
      }
      return;
    }

    case 'toggleNotes':
      if (running) state.notesMode = !state.notesMode;
      return;

    case 'power': {
      if (!running) return;
      const used = usePower(state, 'player', action.power, events);
      if (used && isAttack(action.power)) {
        const launched = state.pending[state.pending.length - 1];
        if (launched) aiOnAttackLaunched(state, { ...launched });
      }
      return;
    }

    case 'pause':
      if (running) state.status = 'paused';
      return;

    case 'resume':
      if (state.status === 'paused') state.status = 'running';
      return;

    case 'abandon':
      if (running || state.status === 'paused') finishMatch(state, 'lost', 'abandon', events);
      return;

    case 'debugFill': {
      if (!running) return;
      const who: Side = action.side ?? 'player';
      const side = who === 'player' ? state.player : state.opponent;
      if (!side) return;
      const solution = state.config.puzzle.solution;
      for (let i = 0; i < CELLS && side.remaining > action.leave; i++) {
        if (side.values[i] !== 0) continue;
        side.values[i] = solution[i];
        side.notes[i] = 0;
        side.remaining -= 1;
      }
      if (side.remaining === 0) {
        if (who === 'player') finishMatch(state, 'won', 'solved', events);
        else finishMatch(state, 'lost', 'outpaced', events);
      }
      return;
    }
  }
}

export function reduceMatch(state: MatchState, action: MatchAction): MatchStep {
  const events: MatchEvent[] = [];
  const next = produce(state, (draft) => {
    apply(draft as MatchState, action, events);
  });
  return { state: next, events };
}

/* ------------------------------------------------------------------ */
/* Bilan de fin de partie                                              */
/* ------------------------------------------------------------------ */

/** Temps de référence d'une partie libre, par difficulté. */
export const PAR_TIME_MS: Record<Difficulty, number> = {
  easy: 6 * 60_000,
  medium: 10 * 60_000,
  hard: 16 * 60_000,
  expert: 25 * 60_000,
};

export interface MatchSummary {
  won: boolean;
  reason: MatchState['endReason'];
  timeMs: number;
  mistakes: number;
  bestCombo: number;
  score: number;
  /** Bonus de rapidité (solo) ou d'avance sur l'adversaire (duel). */
  speedBonus: number;
  /** Bonus pour une partie sans aucune erreur. */
  flawlessBonus: number;
  total: number;
  stars: 0 | 1 | 2 | 3;
  /** Cases qu'il restait à l'adversaire (duel), sinon `null`. */
  opponentRemaining: number | null;
  xp: number;
}

export function summarizeMatch(state: MatchState, parTimeMs: number): MatchSummary {
  const won = state.status === 'won';
  const { player, opponent } = state;
  const duel = state.config.mode === 'duel';
  const opponentRemaining = opponent ? opponent.remaining : null;

  let speedBonus = 0;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (won) {
    if (duel) {
      const lead = opponentRemaining ?? 0;
      speedBonus = lead * 150;
      stars = lead >= 8 ? 3 : lead >= 4 ? 2 : 1;
    } else {
      speedBonus = Math.max(0, Math.round((parTimeMs * 1.5 - state.now) / 1000)) * 10;
      const careful = player.mistakes <= 1 ? 1 : 0;
      const fast = state.now <= parTimeMs ? 1 : 0;
      stars = (1 + careful + fast) as 1 | 2 | 3;
    }
  }
  const flawlessBonus = won && player.mistakes === 0 ? 500 : 0;
  const total = player.score + speedBonus + flawlessBonus;

  // L'expérience récompense aussi les défaites, pour ne jamais repartir bredouille.
  const xp = won ? Math.round(total / 100) + stars * 25 + (duel ? 60 : 0) : 15;

  return {
    won,
    reason: state.endReason,
    timeMs: state.now,
    mistakes: player.mistakes,
    bestCombo: player.bestCombo,
    score: player.score,
    speedBonus,
    flawlessBonus,
    total,
    stars,
    opponentRemaining,
    xp,
  };
}

export * from './matchCore';
