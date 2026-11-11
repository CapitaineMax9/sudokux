import {
  createMatch,
  findEffect,
  hasEffect,
  reduceMatch,
  type BotConfig,
  type MatchAction,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
  type SideState,
} from '../match';
import { NEGATIVE_EFFECTS, POWERS, POWER_ORDER, RULES } from '../powers';
import { CELLS, countBits, candidatesOf, generatePuzzle, isSolved, obviousCells } from '../sudoku';

const puzzle = generatePuzzle({ seed: 808, difficulty: 'easy' });

const BOT: BotConfig = {
  id: 'test-bot',
  cellMs: [1000, 1000],
  mistakeChance: 0,
  powers: [],
  powerDelayMs: [500, 500],
  shieldReflex: 0,
  pace: null,
  startDelayMs: 0,
};

function make(overrides: Partial<MatchConfig> = {}, bot: Partial<BotConfig> | null = {}): MatchState {
  return createMatch({
    mode: bot ? 'duel' : 'solo',
    puzzle,
    seed: 3,
    powers: [...POWER_ORDER],
    maxMistakes: bot ? null : 3,
    timeLimitMs: null,
    countermeasures: null,
    bot: bot ? { ...BOT, ...bot } : null,
    remote: false,
    ...overrides,
  });
}

function run(state: MatchState, ...actions: MatchAction[]) {
  const events: MatchEvent[] = [];
  let current = state;
  for (const action of actions) {
    const step = reduceMatch(current, action);
    current = step.state;
    events.push(...step.events);
  }
  return { state: current, events };
}

function advance(state: MatchState, ms: number) {
  const events: MatchEvent[] = [];
  let current = state;
  for (let t = 0; t < ms; t += 100) {
    const step = reduceMatch(current, { type: 'tick', dt: 100 });
    current = step.state;
    events.push(...step.events);
    if (current.status !== 'running') break;
  }
  return { state: current, events };
}

const charged = (state: MatchState, player: number, opponent?: number): MatchState => ({
  ...state,
  player: { ...state.player, charge: player },
  opponent:
    state.opponent && opponent !== undefined ? { ...state.opponent, charge: opponent } : state.opponent,
});

const foe = (state: MatchState) => state.opponent as SideState;

describe('cases évidentes', () => {
  it('ne désigne que des cases vides réellement déductibles', () => {
    const cells = obviousCells(puzzle.puzzle);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) expect(puzzle.puzzle[cell]).toBe(0);
    // Au moins une des cases n'a plus qu'un candidat, ou toutes sont des candidats cachés.
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('suffit à résoudre une grille facile, étape par étape', () => {
    const grid = puzzle.puzzle.slice();
    for (let round = 0; round < CELLS; round++) {
      const cells = obviousCells(grid);
      if (cells.length === 0) break;
      for (const cell of cells) grid[cell] = puzzle.solution[cell];
    }
    expect(isSolved(grid)).toBe(true);
  });

  it('repère les cases à candidat unique', () => {
    const grid = puzzle.solution.slice();
    grid[40] = 0;
    expect(countBits(candidatesOf(grid, 40))).toBe(1);
    expect(obviousCells(grid)).toEqual([40]);
  });
});

describe('Sonar', () => {
  it('met en évidence les cases déductibles pendant sa durée', () => {
    const { state, events } = run(charged(make({}, null), 100), { type: 'power', power: 'sonar' });
    const effect = findEffect(state.player, 'sonar');
    expect(effect?.cells).toEqual(obviousCells(puzzle.puzzle));
    expect(state.player.charge).toBe(100 - POWERS.sonar.cost);
    expect(events).toContainEqual({ type: 'powerUsed', side: 'player', power: 'sonar' });

    const later = advance(state, POWERS.sonar.durationMs + 200);
    expect(hasEffect(later.state.player, 'sonar')).toBe(false);
  });

  it('se met à jour quand on le relance', () => {
    const first = run(charged(make({}, null), 100), { type: 'power', power: 'sonar' }).state;
    const cell = (findEffect(first.player, 'sonar') as { cells: number[] }).cells[0];
    const placed = run(
      first,
      { type: 'select', cell },
      { type: 'digit', digit: puzzle.solution[cell] },
    ).state;
    const again = run(charged(placed, 100), { type: 'power', power: 'sonar' }).state;
    const cells = findEffect(again.player, 'sonar')?.cells ?? [];
    expect(cells).not.toContain(cell);
    expect(again.player.effects.filter((e) => e.id === 'sonar')).toHaveLength(1);
  });

  it("n'est pas compté parmi les effets négatifs", () => {
    expect(NEGATIVE_EFFECTS).not.toContain('sonar');
    expect(NEGATIVE_EFFECTS).toContain('flip');
  });
});

describe('Siphon', () => {
  it('transfère de la charge de la cible vers le lanceur', () => {
    const launched = run(charged(make(), 50, 80), { type: 'power', power: 'siphon' }).state;
    expect(launched.player.charge).toBe(50 - POWERS.siphon.cost);
    const { state, events } = advance(launched, RULES.attackTravelMs + 100);
    const hit = events.find((e) => e.type === 'attackHit');
    expect(hit).toMatchObject({ amount: RULES.siphonAmount });
    expect(state.player.charge).toBe(50 - POWERS.siphon.cost + RULES.siphonAmount);
    // Le bot a aussi gagné de la charge en posant des chiffres entre-temps.
    expect(foe(state).charge).toBeLessThan(80);
  });

  it('ne vole pas plus que ce que la cible possède', () => {
    const idle = make({}, { cellMs: [60_000, 60_000], startDelayMs: 60_000 });
    const launched = run(charged(idle, 100, 12), { type: 'power', power: 'siphon' }).state;
    const { state, events } = advance(launched, RULES.attackTravelMs + 100);
    expect(events.find((e) => e.type === 'attackHit')).toMatchObject({ amount: 12 });
    expect(foe(state).charge).toBe(0);
    expect(state.player.charge).toBe(100 - POWERS.siphon.cost + 12);
  });
});

describe('Vertige', () => {
  it('retourne la grille de la cible puis se dissipe', () => {
    const idle = make({}, { cellMs: [60_000, 60_000], startDelayMs: 60_000 });
    const launched = run(charged(idle, 100), { type: 'power', power: 'flip' }).state;
    const hit = advance(launched, RULES.attackTravelMs + 100).state;
    expect(hasEffect(foe(hit), 'flip')).toBe(true);
    const after = advance(hit, POWERS.flip.durationMs + 100).state;
    expect(hasEffect(foe(after), 'flip')).toBe(false);
  });

  it('subi par le joueur, il est annulé par la Purge', () => {
    const config: Partial<MatchConfig> = {
      countermeasures: { firstAtMs: 0, everyMs: [60_000, 60_000], pool: ['flip'] },
    };
    const flipped = advance(charged(make(config, null), 100), RULES.systemAttackTravelMs + 200).state;
    expect(hasEffect(flipped.player, 'flip')).toBe(true);
    const { state, events } = run(flipped, { type: 'power', power: 'purge' });
    expect(hasEffect(state.player, 'flip')).toBe(false);
    expect(events).toContainEqual({ type: 'effectsCleared', side: 'player', effects: ['flip'] });
  });
});

describe('Miroir', () => {
  it("renvoie l'attaque du bot à son auteur", () => {
    const bot = make({}, { powers: ['freeze'], cellMs: [60_000, 60_000] });
    const mirrored = run(charged(bot, 100, POWERS.freeze.cost), { type: 'power', power: 'mirror' }).state;
    expect(hasEffect(mirrored.player, 'mirror')).toBe(true);

    // Le bot attaque (délai de 500 ms), l'attaque arrive, rebondit, puis le touche.
    const { state, events } = advance(mirrored, 500 + RULES.attackTravelMs * 2 + 400);
    expect(events.filter((e) => e.type === 'attackReflected')).toHaveLength(1);
    const launches = events.filter((e) => e.type === 'attackLaunched');
    expect(launches).toHaveLength(2);
    expect(launches[1]).toMatchObject({ attack: { from: 'player', target: 'opponent', power: 'freeze' } });
    expect(hasEffect(state.player, 'freeze')).toBe(false);
    expect(hasEffect(state.player, 'mirror')).toBe(false);
    expect(hasEffect(foe(state), 'freeze')).toBe(true);
  });

  it('absorbe une contre-mesure sans rien renvoyer', () => {
    const config: Partial<MatchConfig> = {
      countermeasures: { firstAtMs: 500, everyMs: [60_000, 60_000], pool: ['freeze'] },
    };
    const mirrored = run(charged(make(config, null), 100), { type: 'power', power: 'mirror' }).state;
    const { state, events } = advance(mirrored, 500 + RULES.systemAttackTravelMs + 200);
    expect(events.some((e) => e.type === 'attackReflected')).toBe(true);
    expect(events.filter((e) => e.type === 'attackLaunched')).toHaveLength(1);
    expect(hasEffect(state.player, 'freeze')).toBe(false);
    expect(state.pending).toHaveLength(0);
  });

  it('passe avant le Pare-feu, qui reste alors disponible', () => {
    const config: Partial<MatchConfig> = {
      countermeasures: { firstAtMs: 500, everyMs: [60_000, 60_000], pool: ['freeze'] },
    };
    const guarded = run(
      charged(make(config, null), 100),
      { type: 'power', power: 'mirror' },
      { type: 'power', power: 'shield' },
    ).state;
    const { state } = advance(guarded, 500 + RULES.systemAttackTravelMs + 200);
    expect(hasEffect(state.player, 'mirror')).toBe(false);
    expect(hasEffect(state.player, 'shield')).toBe(true);
  });

  it('ne se cumule pas', () => {
    const { state, events } = run(
      charged(make({}, null), 100),
      { type: 'power', power: 'mirror' },
      { type: 'power', power: 'mirror' },
    );
    expect(state.player.charge).toBe(100 - POWERS.mirror.cost);
    expect(events).toContainEqual({ type: 'powerDenied', power: 'mirror', reason: 'active' });
  });

  it('un bot qui possède un Miroir renvoie notre attaque', () => {
    const bot = make({}, { powers: ['mirror'], shieldReflex: 1, cellMs: [60_000, 60_000] });
    const launched = run(charged(bot, 100, 100), { type: 'power', power: 'freeze' }).state;
    const { state, events } = advance(launched, RULES.attackTravelMs * 2 + 400);
    expect(events).toContainEqual({ type: 'powerUsed', side: 'opponent', power: 'mirror' });
    expect(events.some((e) => e.type === 'attackReflected')).toBe(true);
    expect(hasEffect(foe(state), 'freeze')).toBe(false);
    expect(hasEffect(state.player, 'freeze')).toBe(true);
  });

  it('deux Miroirs se renvoient la balle une fois chacun', () => {
    // Le bot n'a de quoi lever qu'un seul Miroir.
    const bot = make({}, { powers: ['mirror'], shieldReflex: 1, cellMs: [60_000, 60_000] });
    const launched = run(
      charged(bot, 100, POWERS.mirror.cost),
      { type: 'power', power: 'mirror' },
      { type: 'power', power: 'freeze' },
    ).state;
    const { state, events } = advance(launched, RULES.attackTravelMs * 3 + 500);
    expect(events.filter((e) => e.type === 'attackReflected')).toHaveLength(2);
    // Aller (joueur → bot), retour (bot → joueur), nouvel aller : c'est le bot qui finit gelé.
    expect(hasEffect(foe(state), 'freeze')).toBe(true);
    expect(hasEffect(state.player, 'freeze')).toBe(false);
  });
});
