import {
  createMatch,
  hasEffect,
  reduceMatch,
  summarizeMatch,
  type MatchAction,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
  type SideState,
} from '../match';
import { POWERS, POWER_ORDER, RULES } from '../powers';
import type { RemoteEvent } from '../remote';
import { CELLS, generatePuzzle } from '../sudoku';

const puzzle = generatePuzzle({ seed: 515, difficulty: 'easy', clues: 44 });
const empties = puzzle.puzzle.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);

function online(overrides: Partial<MatchConfig> = {}): MatchState {
  return createMatch({
    mode: 'duel',
    puzzle,
    seed: 9,
    powers: [...POWER_ORDER],
    maxMistakes: null,
    timeLimitMs: null,
    countermeasures: null,
    bot: null,
    remote: true,
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

const remote = (event: RemoteEvent): MatchAction => ({ type: 'remote', event });

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

const withCharge = (state: MatchState, charge: number): MatchState => ({
  ...state,
  player: { ...state.player, charge },
});

const foe = (state: MatchState) => state.opponent as SideState;

describe('mise en place', () => {
  it("crée le plateau de l'adversaire sans intelligence artificielle", () => {
    const state = online();
    expect(state.opponent).not.toBeNull();
    expect(state.ai).toBeNull();
    expect(foe(state).remaining).toBe(empties.length);
    // Rien ne bouge tout seul chez l'adversaire.
    const later = advance(state, 5000).state;
    expect(foe(later).remaining).toBe(empties.length);
    expect(later.status).toBe('running');
  });

  it('ignore les messages réseau hors duel en ligne', () => {
    const solo = createMatch({ ...online().config, remote: false, mode: 'solo' });
    const { state } = run(solo, remote({ kind: 'over', won: true, reason: 'forfeit' }));
    expect(state).toBe(solo);
  });
});

describe("avancée de l'adversaire", () => {
  it('reporte ses chiffres trouvés', () => {
    const { state, events } = run(online(), remote({ kind: 'placed', cell: empties[0] }));
    expect(foe(state).values[empties[0]]).toBe(puzzle.solution[empties[0]]);
    expect(foe(state).remaining).toBe(empties.length - 1);
    expect(events).toMatchObject([{ type: 'placed', side: 'opponent', cell: empties[0] }]);
  });

  it('ignore les cases invalides ou déjà remplies', () => {
    const given = puzzle.puzzle.findIndex((v) => v !== 0);
    const { state, events } = run(
      online(),
      remote({ kind: 'placed', cell: given }),
      remote({ kind: 'placed', cell: -1 }),
      remote({ kind: 'placed', cell: 99 }),
      remote({ kind: 'placed', cell: 1.5 }),
      remote({ kind: 'placed', cell: empties[0] }),
      remote({ kind: 'placed', cell: empties[0] }),
    );
    expect(foe(state).remaining).toBe(empties.length - 1);
    expect(events).toHaveLength(1);
  });

  it("ne termine pas la partie tant que le serveur n'a pas tranché", () => {
    const actions = empties.map((cell) => remote({ kind: 'placed', cell }));
    const { state } = run(online(), ...actions);
    expect(foe(state).remaining).toBe(0);
    expect(state.status).toBe('running');

    const over = run(state, remote({ kind: 'over', won: false, reason: 'outpaced' }));
    expect(over.state.status).toBe('lost');
    expect(over.state.endReason).toBe('outpaced');
    expect(over.events).toContainEqual({ type: 'finished', result: 'lost', reason: 'outpaced' });
  });

  it('affiche ses effets tels qu’il les annonce', () => {
    const { state } = run(online(), remote({ kind: 'status', effects: ['freeze', 'shield'] }));
    expect(hasEffect(foe(state), 'freeze')).toBe(true);
    expect(hasEffect(foe(state), 'shield')).toBe(true);
    // Ils ne s'éteignent pas tout seuls : c'est lui qui préviendra.
    const later = advance(state, 60_000).state;
    expect(hasEffect(foe(later), 'freeze')).toBe(true);
    const cleared = run(later, remote({ kind: 'status', effects: [] })).state;
    expect(foe(cleared).effects).toHaveLength(0);
  });
});

describe('attaques reçues', () => {
  it('prévient, puis touche le joueur en gardant le numéro d’origine', () => {
    const warned = run(online(), remote({ kind: 'attack', ref: 42, power: 'freeze' }));
    expect(warned.state.pending).toMatchObject([{ ref: 42, power: 'freeze', target: 'player' }]);
    expect(warned.events).toMatchObject([{ type: 'attackLaunched', attack: { from: 'opponent' } }]);

    const { state, events } = advance(warned.state, RULES.attackTravelMs + 100);
    expect(hasEffect(state.player, 'freeze')).toBe(true);
    expect(events.find((e) => e.type === 'attackHit')).toMatchObject({ attack: { ref: 42 } });
  });

  it('est bloquée par le Pare-feu', () => {
    const warned = run(withCharge(online(), 100), remote({ kind: 'attack', ref: 7, power: 'virus' })).state;
    const shielded = run(warned, { type: 'power', power: 'shield' }).state;
    const { state, events } = advance(shielded, RULES.attackTravelMs + 100);
    expect(events.find((e) => e.type === 'attackBlocked')).toMatchObject({ attack: { ref: 7 } });
    expect(state.player.remaining).toBe(empties.length);
  });

  it('est renvoyée par le Miroir comme une attaque sortante', () => {
    const warned = run(withCharge(online(), 100), remote({ kind: 'attack', ref: 7, power: 'flip' })).state;
    const mirrored = run(warned, { type: 'power', power: 'mirror' }).state;
    const { state, events } = advance(mirrored, RULES.attackTravelMs + 100);
    expect(events.find((e) => e.type === 'attackReflected')).toMatchObject({ attack: { ref: 7 } });
    const back = events.filter((e) => e.type === 'attackLaunched');
    expect(back).toMatchObject([{ attack: { from: 'player', target: 'opponent', power: 'flip' } }]);
    expect(hasEffect(state.player, 'flip')).toBe(false);
    expect(state.pending).toMatchObject([{ target: 'opponent', power: 'flip' }]);
  });

  it('ignore un pouvoir inconnu ou qui n’est pas une attaque', () => {
    const { state } = run(
      online(),
      remote({ kind: 'attack', ref: 1, power: 'scan' as never }),
      remote({ kind: 'attack', ref: 2, power: 'nope' as never }),
    );
    expect(state.pending).toHaveLength(0);
  });
});

describe('attaques lancées', () => {
  function launch(power: 'freeze' | 'virus' | 'siphon') {
    const step = run(withCharge(online(), 100), { type: 'power', power });
    const launched = step.events.find((e) => e.type === 'attackLaunched');
    if (launched?.type !== 'attackLaunched') throw new Error('attaque non lancée');
    return { state: step.state, id: launched.attack.id };
  }

  it('attendent la réponse de l’adversaire au lieu de se résoudre ici', () => {
    const { state } = launch('freeze');
    const later = advance(state, RULES.attackTravelMs + 1000);
    expect(later.state.pending).toHaveLength(1);
    expect(later.events.some((e) => e.type === 'attackHit' || e.type === 'attackBlocked')).toBe(false);
    expect(hasEffect(foe(later.state), 'freeze')).toBe(false);
  });

  it('sont oubliées si la réponse ne vient jamais', () => {
    const { state } = launch('freeze');
    const later = advance(state, RULES.attackTravelMs + 7000).state;
    expect(later.pending).toHaveLength(0);
  });

  it('touchent quand l’adversaire le confirme', () => {
    const { state, id } = launch('freeze');
    const answered = run(
      state,
      remote({ kind: 'resolved', ref: id, outcome: 'hit', cells: [], boxes: [], amount: 0 }),
    );
    expect(answered.state.pending).toHaveLength(0);
    expect(answered.events).toMatchObject([{ type: 'attackHit', attack: { id, target: 'opponent' } }]);
  });

  it('peuvent être bloquées ou renvoyées', () => {
    const first = launch('freeze');
    const blocked = run(
      first.state,
      remote({ kind: 'resolved', ref: first.id, outcome: 'blocked', cells: [], boxes: [], amount: 0 }),
    );
    expect(blocked.events).toMatchObject([{ type: 'attackBlocked' }]);

    const second = launch('freeze');
    const reflected = run(
      second.state,
      remote({ kind: 'resolved', ref: second.id, outcome: 'reflected', cells: [], boxes: [], amount: 0 }),
    );
    expect(reflected.events).toMatchObject([{ type: 'attackReflected' }]);
    expect(reflected.state.pending).toHaveLength(0);
  });

  it('Virus : retire les chiffres que l’adversaire dit avoir perdus', () => {
    const progressed = run(
      withCharge(online(), 100),
      remote({ kind: 'placed', cell: empties[0] }),
      remote({ kind: 'placed', cell: empties[1] }),
      remote({ kind: 'placed', cell: empties[2] }),
      { type: 'power', power: 'virus' },
    );
    const launched = progressed.events.find((e) => e.type === 'attackLaunched');
    if (launched?.type !== 'attackLaunched') throw new Error('attaque non lancée');
    const given = puzzle.puzzle.findIndex((v) => v !== 0);
    const { state, events } = run(
      progressed.state,
      remote({
        kind: 'resolved',
        ref: launched.attack.id,
        outcome: 'hit',
        // Une case donnée et une case vide sont glissées dans la liste : elles sont ignorées.
        cells: [empties[0], empties[2], given, empties[5]],
        boxes: [],
        amount: 0,
      }),
    );
    expect(foe(state).values[empties[0]]).toBe(0);
    expect(foe(state).values[empties[1]]).not.toBe(0);
    expect(foe(state).values[empties[2]]).toBe(0);
    expect(foe(state).remaining).toBe(empties.length - 1);
    expect(events.find((e) => e.type === 'attackHit')).toMatchObject({ cells: [empties[0], empties[2]] });
  });

  it('Siphon : crédite la charge annoncée, dans la limite permise', () => {
    const first = launch('siphon');
    const before = first.state.player.charge;
    const normal = run(
      first.state,
      remote({ kind: 'resolved', ref: first.id, outcome: 'hit', cells: [], boxes: [], amount: 18 }),
    ).state;
    expect(normal.player.charge).toBe(before + 18);

    const second = launch('siphon');
    const greedy = run(
      second.state,
      remote({ kind: 'resolved', ref: second.id, outcome: 'hit', cells: [], boxes: [], amount: 9999 }),
    ).state;
    expect(greedy.player.charge).toBe(Math.min(RULES.maxCharge, before + RULES.siphonAmount));
  });

  it('ignorent une réponse qui ne correspond à rien', () => {
    const { state } = launch('freeze');
    const { state: after, events } = run(
      state,
      remote({ kind: 'resolved', ref: 12345, outcome: 'hit', cells: [], boxes: [], amount: 0 }),
    );
    expect(after.pending).toHaveLength(1);
    expect(events).toHaveLength(0);
  });

  it('coûtent leur prix dès le lancement', () => {
    const { state } = launch('freeze');
    expect(state.player.charge).toBe(100 - POWERS.freeze.cost);
  });
});

describe('fin de partie', () => {
  it('signale la grille terminée et attend le verdict', () => {
    const almost = run(online(), { type: 'debugFill', leave: 1 }).state;
    const last = almost.player.values.findIndex((v) => v === 0);
    const { state, events } = run(
      almost,
      { type: 'select', cell: last },
      { type: 'digit', digit: puzzle.solution[last] },
    );
    expect(state.player.remaining).toBe(0);
    expect(state.status).toBe('running');
    expect(events).toContainEqual({ type: 'completed', side: 'player' });
    expect(events.some((e) => e.type === 'finished')).toBe(false);

    const won = run(state, remote({ kind: 'over', won: true, reason: 'solved' })).state;
    expect(won.status).toBe('won');
    expect(summarizeMatch(won, 60_000)).toMatchObject({ won: true, stars: 3 });
  });

  it('accorde une victoire sans bonus quand l’adversaire abandonne', () => {
    const { state } = run(online(), remote({ kind: 'over', won: true, reason: 'forfeit' }));
    expect(state.status).toBe('won');
    expect(summarizeMatch(state, 60_000)).toMatchObject({ won: true, stars: 1, speedBonus: 0 });
  });

  it('compte une déconnexion comme une défaite', () => {
    const { state } = run(online(), remote({ kind: 'over', won: false, reason: 'disconnected' }));
    expect(state.status).toBe('lost');
    expect(state.endReason).toBe('disconnected');
  });

  it('ne change plus rien une fois la partie finie', () => {
    const over = run(online(), remote({ kind: 'over', won: false, reason: 'outpaced' })).state;
    const { state } = run(
      over,
      remote({ kind: 'over', won: true, reason: 'solved' }),
      remote({ kind: 'placed', cell: empties[0] }),
    );
    expect(state).toBe(over);
  });

  it('compte bien toutes les cases du plateau adverse', () => {
    expect(empties.length).toBe(CELLS - puzzle.clues);
  });
});
