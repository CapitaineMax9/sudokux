import {
  createMatch,
  findEffect,
  hasEffect,
  reduceMatch,
  summarizeMatch,
  type BotConfig,
  type MatchAction,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
} from '../match';
import { POWERS, RULES, type PowerId } from '../powers';
import { CELLS, boxOf, candidatesOf, generatePuzzle, topology } from '../sudoku';

const puzzle = generatePuzzle({ seed: 2024, difficulty: 'easy' });

const BOT: BotConfig = {
  id: 'test-bot',
  cellMs: [1000, 1000],
  mistakeChance: 0,
  powers: [],
  powerDelayMs: [1000, 1000],
  shieldReflex: 0,
  pace: null,
  startDelayMs: 0,
};

const ALL_POWERS: PowerId[] = ['scan', 'analyse', 'shield', 'purge', 'freeze', 'glitch', 'blackout', 'virus'];

function solo(overrides: Partial<MatchConfig> = {}): MatchState {
  return createMatch({
    mode: 'solo',
    puzzle,
    seed: 1,
    powers: ALL_POWERS,
    maxMistakes: 3,
    timeLimitMs: null,
    countermeasures: null,
    bot: null,
    ...overrides,
  });
}

function duel(bot: Partial<BotConfig> = {}, overrides: Partial<MatchConfig> = {}): MatchState {
  return createMatch({
    mode: 'duel',
    puzzle,
    seed: 1,
    powers: ALL_POWERS,
    maxMistakes: null,
    timeLimitMs: null,
    countermeasures: null,
    bot: { ...BOT, ...bot },
    ...overrides,
  });
}

/** Enchaîne des actions et renvoie l'état final avec tous les événements. */
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

/** Avance le temps par pas de 100 ms, comme le fait l'application. */
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

const emptyCells = (state: MatchState) =>
  state.player.values.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);

const wrongDigitFor = (cell: number) => (puzzle.solution[cell] % 9) + 1;

/** Donne de la charge au joueur sans passer par le jeu (les états sont gelés). */
function withCharge(state: MatchState, charge: number, who: 'player' | 'opponent' = 'player'): MatchState {
  if (who === 'player') return { ...state, player: { ...state.player, charge } };
  return { ...state, opponent: { ...(state.opponent as MatchState['player']), charge } };
}

describe('début de partie', () => {
  it('prépare un plateau solo', () => {
    const state = solo();
    expect(state.status).toBe('running');
    expect(state.opponent).toBeNull();
    expect(state.ai).toBeNull();
    expect(state.player.values).toEqual(puzzle.puzzle);
    expect(state.player.remaining).toBe(CELLS - puzzle.clues);
    expect(state.player.charge).toBe(0);
  });

  it('prépare un duel avec un adversaire et son plan', () => {
    const state = duel();
    expect(state.opponent).not.toBeNull();
    expect(state.opponent?.values).toEqual(puzzle.puzzle);
    expect(state.ai?.order).toHaveLength(CELLS - puzzle.clues);
    expect(new Set(state.ai?.order).size).toBe(CELLS - puzzle.clues);
  });

  it("ne modifie jamais l'état précédent", () => {
    const state = solo();
    const cell = emptyCells(state)[0];
    const { state: next } = run(
      state,
      { type: 'select', cell },
      { type: 'digit', digit: puzzle.solution[cell] },
    );
    expect(state.player.values[cell]).toBe(0);
    expect(next.player.values[cell]).toBe(puzzle.solution[cell]);
    expect(next).not.toBe(state);
  });
});

describe('saisie', () => {
  it('pose un bon chiffre et marque des points', () => {
    const state = solo();
    const cell = emptyCells(state)[0];
    const { state: next, events } = run(
      state,
      { type: 'select', cell },
      { type: 'digit', digit: puzzle.solution[cell] },
    );
    expect(next.player.values[cell]).toBe(puzzle.solution[cell]);
    expect(next.player.remaining).toBe(state.player.remaining - 1);
    expect(next.player.combo).toBe(1);
    expect(next.player.score).toBeGreaterThanOrEqual(RULES.basePoints);
    expect(next.player.charge).toBeGreaterThanOrEqual(RULES.chargePerCell);
    expect(events.find((e) => e.type === 'placed')).toMatchObject({
      side: 'player',
      cell,
      digit: puzzle.solution[cell],
      revealed: false,
    });
  });

  it('refuse un mauvais chiffre et compte une erreur', () => {
    const state = solo();
    const cell = emptyCells(state)[0];
    const { state: next, events } = run(
      state,
      { type: 'select', cell },
      { type: 'digit', digit: wrongDigitFor(cell) },
    );
    expect(next.player.values[cell]).toBe(0);
    expect(next.player.mistakes).toBe(1);
    expect(next.status).toBe('running');
    expect(events).toContainEqual({
      type: 'mistake',
      side: 'player',
      cell,
      digit: wrongDigitFor(cell),
    });
  });

  it('fait perdre après trop d’erreurs en solo', () => {
    const cell = emptyCells(solo())[0];
    const wrong: MatchAction = { type: 'digit', digit: wrongDigitFor(cell) };
    const { state, events } = run(solo(), { type: 'select', cell }, wrong, wrong, wrong);
    expect(state.status).toBe('lost');
    expect(state.endReason).toBe('mistakes');
    expect(events).toContainEqual({ type: 'finished', result: 'lost', reason: 'mistakes' });
    // Une fois la partie finie, plus rien ne bouge.
    const after = run(state, { type: 'digit', digit: puzzle.solution[cell] });
    expect(after.state).toBe(state);
  });

  it('ignore les cases déjà remplies et les saisies sans sélection', () => {
    const state = solo();
    const given = state.player.values.findIndex((v) => v !== 0);
    const a = run(state, { type: 'digit', digit: 5 });
    expect(a.state.player.mistakes).toBe(0);
    const b = run(state, { type: 'select', cell: given }, { type: 'digit', digit: wrongDigitFor(given) });
    expect(b.state.player.mistakes).toBe(0);
    expect(b.state.player.values[given]).toBe(puzzle.puzzle[given]);
  });

  it('enchaîne les combos puis les laisse expirer', () => {
    const cells = emptyCells(solo()).slice(0, 3);
    let current = solo();
    for (const cell of cells.slice(0, 2)) {
      current = run(current, { type: 'select', cell }, { type: 'digit', digit: puzzle.solution[cell] }).state;
    }
    expect(current.player.combo).toBe(2);
    current = advance(current, RULES.comboWindowMs + 200).state;
    expect(current.player.combo).toBe(0);
    current = run(
      current,
      { type: 'select', cell: cells[2] },
      { type: 'digit', digit: puzzle.solution[cells[2]] },
    ).state;
    expect(current.player.combo).toBe(1);
    expect(current.player.bestCombo).toBe(2);
  });

  it('casse le combo sur une erreur', () => {
    const [a, b] = emptyCells(solo());
    const { state } = run(
      solo(),
      { type: 'select', cell: a },
      { type: 'digit', digit: puzzle.solution[a] },
      { type: 'select', cell: b },
      { type: 'digit', digit: wrongDigitFor(b) },
    );
    expect(state.player.combo).toBe(0);
  });

  it('signale une unité terminée', () => {
    // On remplit tout sauf une case : la dernière termine forcément sa ligne.
    const filled = run(solo(), { type: 'debugFill', leave: 1 }).state;
    const [last] = emptyCells(filled);
    const { state, events } = run(
      filled,
      { type: 'select', cell: last },
      { type: 'digit', digit: puzzle.solution[last] },
    );
    const units = events.filter((e) => e.type === 'unitComplete');
    expect(units.map((u) => u.type === 'unitComplete' && u.kind).sort()).toEqual(['box', 'col', 'row']);
    expect(state.status).toBe('won');
    expect(state.endReason).toBe('solved');
  });
});

describe('notes', () => {
  it('ajoute, retire et efface des notes', () => {
    const cell = emptyCells(solo())[0];
    let { state } = run(
      solo(),
      { type: 'select', cell },
      { type: 'toggleNotes' },
      { type: 'digit', digit: 3 },
      { type: 'digit', digit: 7 },
    );
    expect(state.notesMode).toBe(true);
    expect(state.player.notes[cell]).toBe((1 << 2) | (1 << 6));
    expect(state.player.values[cell]).toBe(0);
    expect(state.player.mistakes).toBe(0);

    state = run(state, { type: 'digit', digit: 3 }).state;
    expect(state.player.notes[cell]).toBe(1 << 6);

    state = run(state, { type: 'erase' }).state;
    expect(state.player.notes[cell]).toBe(0);
  });

  it('retire le chiffre posé des notes des cases voisines', () => {
    const state = solo();
    const cell = emptyCells(state)[0];
    const digit = puzzle.solution[cell];
    const peer = topology().peers[cell].find((p) => state.player.values[p] === 0) as number;
    const { state: next } = run(
      state,
      { type: 'toggleNotes' },
      { type: 'select', cell: peer },
      { type: 'digit', digit },
      { type: 'toggleNotes' },
      { type: 'select', cell },
      { type: 'digit', digit },
    );
    expect(next.player.notes[peer] & (1 << (digit - 1))).toBe(0);
  });
});

describe('pouvoirs de soutien', () => {
  it('refuse un pouvoir trop cher', () => {
    const { state, events } = run(solo(), { type: 'power', power: 'scan' });
    expect(state.player.charge).toBe(0);
    expect(events).toContainEqual({ type: 'powerDenied', power: 'scan', reason: 'charge' });
  });

  it('refuse un pouvoir absent de la barre', () => {
    const state = withCharge(solo({ powers: ['scan'] }), 100);
    const { events } = run(state, { type: 'power', power: 'analyse' });
    expect(events).toContainEqual({ type: 'powerDenied', power: 'analyse', reason: 'locked' });
  });

  it("refuse une attaque quand il n'y a pas d'adversaire", () => {
    const { state, events } = run(withCharge(solo(), 100), { type: 'power', power: 'freeze' });
    expect(state.player.charge).toBe(100);
    expect(events).toContainEqual({ type: 'powerDenied', power: 'freeze', reason: 'noOpponent' });
  });

  it('Scan révèle la case sélectionnée', () => {
    const state = withCharge(solo(), 100);
    const cell = emptyCells(state)[4];
    const { state: next, events } = run(state, { type: 'select', cell }, { type: 'power', power: 'scan' });
    expect(next.player.values[cell]).toBe(puzzle.solution[cell]);
    expect(next.player.charge).toBe(100 - POWERS.scan.cost);
    expect(next.player.combo).toBe(0);
    expect(events).toContainEqual({ type: 'powerUsed', side: 'player', power: 'scan' });
    expect(events.find((e) => e.type === 'placed')).toMatchObject({ cell, revealed: true });
  });

  it('Scan choisit une case au hasard sans sélection', () => {
    const state = withCharge(solo(), 100);
    const { state: next } = run(state, { type: 'power', power: 'scan' });
    expect(next.player.remaining).toBe(state.player.remaining - 1);
    expect(next.selected).not.toBeNull();
    expect(next.player.values[next.selected as number]).toBe(puzzle.solution[next.selected as number]);
  });

  it('Analyse remplit les notes exactes de toute la grille', () => {
    const state = withCharge(solo(), 100);
    const { state: next } = run(state, { type: 'power', power: 'analyse' });
    for (let i = 0; i < CELLS; i++) {
      if (next.player.values[i] === 0) {
        expect(next.player.notes[i]).toBe(candidatesOf(next.player.values, i));
        // La bonne réponse fait toujours partie des notes.
        expect(next.player.notes[i] & (1 << (puzzle.solution[i] - 1))).not.toBe(0);
      } else {
        expect(next.player.notes[i]).toBe(0);
      }
    }
  });

  it('Pare-feu ne se cumule pas', () => {
    const { state, events } = run(
      withCharge(solo(), 100),
      { type: 'power', power: 'shield' },
      { type: 'power', power: 'shield' },
    );
    expect(hasEffect(state.player, 'shield')).toBe(true);
    expect(state.player.charge).toBe(100 - POWERS.shield.cost);
    expect(events).toContainEqual({ type: 'powerDenied', power: 'shield', reason: 'active' });
  });

  it('Pare-feu expire', () => {
    const shielded = run(withCharge(solo(), 100), { type: 'power', power: 'shield' }).state;
    const { state, events } = advance(shielded, POWERS.shield.durationMs + 200);
    expect(hasEffect(state.player, 'shield')).toBe(false);
    expect(events).toContainEqual({ type: 'effectEnded', side: 'player', effect: 'shield' });
  });

  it('Purge refuse de se gaspiller', () => {
    const { events } = run(withCharge(solo(), 100), { type: 'power', power: 'purge' });
    expect(events).toContainEqual({ type: 'powerDenied', power: 'purge', reason: 'noTarget' });
  });
});

describe('contre-mesures (solo)', () => {
  const config: Partial<MatchConfig> = {
    countermeasures: { firstAtMs: 1000, everyMs: [5000, 5000], pool: ['freeze'] },
  };

  it('prévient puis gèle le joueur', () => {
    const warned = advance(solo(config), 1100);
    expect(warned.state.pending).toHaveLength(1);
    expect(warned.state.pending[0]).toMatchObject({ power: 'freeze', from: 'system', target: 'player' });
    expect(warned.events.some((e) => e.type === 'attackLaunched')).toBe(true);
    expect(hasEffect(warned.state.player, 'freeze')).toBe(false);

    const hit = advance(warned.state, RULES.systemAttackTravelMs);
    expect(hit.state.pending).toHaveLength(0);
    expect(hasEffect(hit.state.player, 'freeze')).toBe(true);
    expect(hit.events.some((e) => e.type === 'attackHit')).toBe(true);

    const cell = emptyCells(hit.state)[0];
    const blocked = run(
      hit.state,
      { type: 'select', cell },
      { type: 'digit', digit: puzzle.solution[cell] },
    );
    expect(blocked.state.player.values[cell]).toBe(0);
    expect(blocked.events).toContainEqual({ type: 'inputBlocked', reason: 'frozen' });

    const thawed = advance(hit.state, POWERS.freeze.durationMs + 100);
    expect(hasEffect(thawed.state.player, 'freeze')).toBe(false);
  });

  it('est bloquée par le Pare-feu', () => {
    const warned = advance(withCharge(solo(config), 100), 1100).state;
    const shielded = run(warned, { type: 'power', power: 'shield' }).state;
    const { state, events } = advance(shielded, RULES.systemAttackTravelMs);
    expect(hasEffect(state.player, 'freeze')).toBe(false);
    expect(hasEffect(state.player, 'shield')).toBe(false);
    expect(events.some((e) => e.type === 'attackBlocked')).toBe(true);
  });

  it('est annulée par la Purge', () => {
    const frozen = advance(withCharge(solo(config), 100), 1100 + RULES.systemAttackTravelMs).state;
    expect(hasEffect(frozen.player, 'freeze')).toBe(true);
    const { state, events } = run(frozen, { type: 'power', power: 'purge' });
    expect(hasEffect(state.player, 'freeze')).toBe(false);
    expect(events).toContainEqual({ type: 'effectsCleared', side: 'player', effects: ['freeze'] });
  });

  it('revient régulièrement', () => {
    const { events } = advance(solo(config), 12000);
    expect(events.filter((e) => e.type === 'attackLaunched')).toHaveLength(3);
  });

  it('masque trois blocs avec le Blackout et empêche d’y jouer', () => {
    const blackout: Partial<MatchConfig> = {
      countermeasures: { firstAtMs: 0, everyMs: [60000, 60000], pool: ['blackout'] },
    };
    const { state } = advance(solo(blackout), RULES.systemAttackTravelMs + 200);
    const effect = findEffect(state.player, 'blackout');
    expect(effect?.boxes).toHaveLength(RULES.blackoutBoxes);
    const hidden = emptyCells(state).find((c) => effect?.boxes.includes(boxOf(c))) as number;
    const visible = emptyCells(state).find((c) => !effect?.boxes.includes(boxOf(c))) as number;
    expect(visible).toBeDefined();

    const tryHidden = run(state, { type: 'select', cell: hidden });
    expect(tryHidden.state.selected).toBeNull();

    const tryVisible = run(
      state,
      { type: 'select', cell: visible },
      { type: 'digit', digit: puzzle.solution[visible] },
    );
    expect(tryVisible.state.player.values[visible]).toBe(puzzle.solution[visible]);
  });

  it('laisse toujours un bloc jouable pendant un Blackout', () => {
    const blackout: Partial<MatchConfig> = {
      countermeasures: { firstAtMs: 0, everyMs: [60000, 60000], pool: ['blackout'] },
    };
    // Il ne reste que deux cases : elles sont dans un ou deux blocs.
    const almost = run(solo(blackout), { type: 'debugFill', leave: 2 }).state;
    const { state } = advance(almost, RULES.systemAttackTravelMs + 200);
    const effect = findEffect(state.player, 'blackout');
    expect(effect?.boxes).toHaveLength(RULES.blackoutBoxes);
    expect(emptyCells(state).some((c) => !effect?.boxes.includes(boxOf(c)))).toBe(true);
  });
});

describe('compte à rebours', () => {
  it('fait perdre quand le temps est écoulé', () => {
    const { state } = advance(solo({ timeLimitMs: 3000 }), 5000);
    expect(state.status).toBe('lost');
    expect(state.endReason).toBe('timeout');
    expect(state.now).toBe(3000);
  });
});

describe('pause et abandon', () => {
  it('arrête le temps pendant la pause', () => {
    const paused = run(solo(), { type: 'pause' }).state;
    expect(paused.status).toBe('paused');
    const still = advance(paused, 2000).state;
    expect(still.now).toBe(0);
    const resumed = run(still, { type: 'resume' }).state;
    expect(advance(resumed, 500).state.now).toBe(500);
  });

  it('compte un abandon comme une défaite', () => {
    const { state } = run(solo(), { type: 'pause' }, { type: 'abandon' });
    expect(state.status).toBe('lost');
    expect(state.endReason).toBe('abandon');
  });
});

describe('duel', () => {
  it('le bot remplit sa grille et gagne si on ne fait rien', () => {
    const { state, events } = advance(duel(), 120_000);
    expect(state.status).toBe('lost');
    expect(state.endReason).toBe('outpaced');
    expect(state.opponent?.remaining).toBe(0);
    expect(state.opponent?.values).toEqual(puzzle.solution);
    const placed = events.filter((e) => e.type === 'placed' && e.side === 'opponent');
    expect(placed).toHaveLength(CELLS - puzzle.clues);
    // Un chiffre par seconde, donc la partie dure le nombre de cases en secondes.
    expect(state.now).toBe((CELLS - puzzle.clues - 1) * 1000 + 100);
  });

  it('une erreur du joueur le sonne brièvement sans le faire perdre', () => {
    const cell = emptyCells(duel())[0];
    const wrong: MatchAction = { type: 'digit', digit: wrongDigitFor(cell) };
    const { state, events } = run(duel(), { type: 'select', cell }, wrong, wrong, wrong, wrong);
    expect(state.status).toBe('running');
    expect(state.player.mistakes).toBe(1);
    expect(events.filter((e) => e.type === 'inputBlocked')).toHaveLength(3);
    const later = advance(state, RULES.mistakeStunMs + 100).state;
    const ok = run(later, { type: 'digit', digit: puzzle.solution[cell] });
    expect(ok.state.player.values[cell]).toBe(puzzle.solution[cell]);
  });

  it('Gel arrête le bot pendant sa durée', () => {
    const slow = duel({ cellMs: [500, 500] });
    const launched = run(withCharge(slow, 100), { type: 'power', power: 'freeze' });
    expect(launched.state.pending).toHaveLength(1);
    expect(launched.state.player.charge).toBe(100 - POWERS.freeze.cost);

    const hit = advance(launched.state, RULES.attackTravelMs + 100).state;
    expect(hasEffect(hit.opponent as MatchState['player'], 'freeze')).toBe(true);
    const remainingAtHit = hit.opponent?.remaining;

    const during = advance(hit, POWERS.freeze.durationMs - 300).state;
    expect(during.opponent?.remaining).toBe(remainingAtHit);

    const after = advance(during, 2000).state;
    expect(after.opponent?.remaining).toBeLessThan(remainingAtHit as number);
  });

  it('une purge libère aussitôt le bot gelé', () => {
    // Le bot ne tente une purge que 3 fois sur 4 : on cherche une graine où il la tente.
    let checked = false;
    for (let seed = 1; seed <= 12 && !checked; seed++) {
      const bot = duel({ cellMs: [500, 500], powers: ['purge'] }, { seed });
      const launched = run(withCharge(withCharge(bot, 100), 100, 'opponent'), {
        type: 'power',
        power: 'freeze',
      }).state;
      const hit = advance(launched, RULES.attackTravelMs + 100).state;
      expect(hasEffect(hit.opponent as MatchState['player'], 'freeze')).toBe(true);
      // Sa réaction arrive entre 0,7 et 1,8 s après l'impact.
      const later = advance(hit, 2200);
      if (!later.events.some((e) => e.type === 'effectsCleared' && e.side === 'opponent')) continue;
      expect(hasEffect(later.state.opponent as MatchState['player'], 'freeze')).toBe(false);
      // Libéré avant la fin normale du gel, il a recommencé à poser des chiffres.
      expect(later.state.opponent?.remaining).toBeLessThan(hit.opponent?.remaining as number);
      checked = true;
    }
    expect(checked).toBe(true);
  });

  it('Virus efface des chiffres trouvés par le bot', () => {
    const progressed = advance(duel(), 5500).state;
    const before = progressed.opponent?.remaining as number;
    const launched = run(withCharge(progressed, 100), { type: 'power', power: 'virus' }).state;
    const { events } = advance(launched, RULES.attackTravelMs + 100);
    const hit = events.find((e) => e.type === 'attackHit');
    expect(hit).toBeDefined();
    if (hit?.type !== 'attackHit') throw new Error('attaque manquante');
    expect(hit.cells).toHaveLength(RULES.virusCells);
    for (const cell of hit.cells) expect(puzzle.puzzle[cell]).toBe(0);
    expect(before).toBeGreaterThan(0);
  });

  it('le bot attaque et le joueur peut parer', () => {
    // Juste assez de charge pour une seule attaque.
    const aggressive = duel({ powers: ['freeze'], powerDelayMs: [500, 500] });
    const { state, events } = advance(withCharge(aggressive, POWERS.freeze.cost, 'opponent'), 1500);
    const launches = events.filter((e) => e.type === 'attackLaunched');
    expect(launches).toHaveLength(1);
    expect(launches[0]).toMatchObject({ attack: { power: 'freeze', from: 'opponent', target: 'player' } });

    const shielded = run(withCharge(state, 100), { type: 'power', power: 'shield' }).state;
    const resolved = advance(shielded, RULES.attackTravelMs + 100);
    expect(resolved.events.some((e) => e.type === 'attackBlocked')).toBe(true);
    expect(hasEffect(resolved.state.player, 'freeze')).toBe(false);
  });

  it('le bot peut parer une attaque avec un réflexe de bouclier', () => {
    const careful = duel({ powers: ['shield'], shieldReflex: 1 });
    const state = withCharge(withCharge(careful, 100), 100, 'opponent');
    const launched = run(state, { type: 'power', power: 'freeze' }).state;
    const { events, state: after } = advance(launched, RULES.attackTravelMs + 100);
    expect(events.some((e) => e.type === 'attackBlocked')).toBe(true);
    expect(hasEffect(after.opponent as MatchState['player'], 'freeze')).toBe(false);
  });

  it('se rejoue à l’identique avec la même graine', () => {
    const bot: Partial<BotConfig> = {
      cellMs: [600, 1400],
      mistakeChance: 0.1,
      powers: ['freeze', 'glitch', 'blackout', 'virus', 'shield', 'purge'],
      powerDelayMs: [2000, 5000],
      shieldReflex: 0.5,
      pace: { ratio: 1, minMs: 500, maxMs: 2000 },
    };
    const a = advance(duel(bot, { seed: 77 }), 90_000);
    const b = advance(duel(bot, { seed: 77 }), 90_000);
    const c = advance(duel(bot, { seed: 78 }), 90_000);
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
    expect(a.events).not.toEqual(c.events);
    expect(a.state.status).toBe('lost');
  });

  it('le joueur gagne en finissant le premier', () => {
    const almost = run(duel(), { type: 'debugFill', leave: 1 }).state;
    const [last] = emptyCells(almost);
    const { state } = run(
      almost,
      { type: 'select', cell: last },
      { type: 'digit', digit: puzzle.solution[last] },
    );
    expect(state.status).toBe('won');
    const summary = summarizeMatch(state, 60_000);
    expect(summary.won).toBe(true);
    expect(summary.stars).toBe(3);
    expect(summary.opponentRemaining).toBe(CELLS - puzzle.clues);
  });
});

describe('bilan', () => {
  it('donne trois étoiles pour une partie rapide et sans erreur', () => {
    const state = run(solo(), { type: 'debugFill', leave: 0 }).state;
    const summary = summarizeMatch(state, 60_000);
    expect(summary).toMatchObject({ won: true, stars: 3, mistakes: 0, flawlessBonus: 500 });
    expect(summary.total).toBe(summary.score + summary.speedBonus + summary.flawlessBonus);
    expect(summary.xp).toBeGreaterThan(0);
  });

  it('retire une étoile pour la lenteur et une pour les erreurs', () => {
    const cell = emptyCells(solo())[0];
    const wrong: MatchAction = { type: 'digit', digit: wrongDigitFor(cell) };
    const sloppy = run(solo(), { type: 'select', cell }, wrong, wrong).state;
    const slow = advance(sloppy, 5000).state;
    const done = run(slow, { type: 'debugFill', leave: 0 }).state;
    expect(summarizeMatch(done, 60_000).stars).toBe(2);
    expect(summarizeMatch(done, 1000).stars).toBe(1);
    expect(summarizeMatch(done, 1000).flawlessBonus).toBe(0);
  });

  it('ne donne aucune étoile pour une défaite', () => {
    const lost = run(solo(), { type: 'abandon' }).state;
    expect(summarizeMatch(lost, 60_000)).toMatchObject({ won: false, stars: 0, xp: 0 });
  });

  it('console une défaite selon le travail accompli', () => {
    const worked = run(solo(), { type: 'debugFill', leave: 5 }, { type: 'abandon' }).state;
    expect(summarizeMatch(worked, 60_000)).toMatchObject({ won: false, stars: 0, xp: 15 });
    const barely = run(solo(), { type: 'debugFill', leave: CELLS - puzzle.clues - 4 }, { type: 'abandon' });
    expect(summarizeMatch(barely.state, 60_000).xp).toBe(2);
  });
});
