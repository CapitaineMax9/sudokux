import { generatePuzzle } from '../../src/engine/sudoku';
import {
  PROTOCOL_VERSION,
  ROOM_ALPHABET,
  ROOM_CODE_LENGTH,
  type ClientMessage,
  type ServerMessage,
} from '../../src/net/protocol';
import { Lobby } from '../lobby';

/** Un joueur de test : il garde tout ce que le serveur lui envoie. */
class Player {
  readonly inbox: ServerMessage[] = [];
  readonly id: string;

  constructor(
    private readonly lobby: Lobby,
    name?: string,
  ) {
    this.id = lobby.connect({ send: (message) => this.inbox.push(message) });
    if (name !== undefined) this.send({ t: 'hello', v: PROTOCOL_VERSION, name });
  }

  send(message: ClientMessage): void {
    this.lobby.receive(this.id, message);
  }

  raw(message: unknown): void {
    this.lobby.receive(this.id, message);
  }

  last(): ServerMessage | undefined {
    return this.inbox[this.inbox.length - 1];
  }

  /** Dernier message d'un type donné. */
  find<T extends ServerMessage['t']>(type: T): Extract<ServerMessage, { t: T }> | undefined {
    for (let i = this.inbox.length - 1; i >= 0; i--) {
      const message = this.inbox[i];
      if (message.t === type) return message as Extract<ServerMessage, { t: T }>;
    }
    return undefined;
  }

  count(type: ServerMessage['t']): number {
    return this.inbox.filter((message) => message.t === type).length;
  }

  leave(): void {
    this.lobby.disconnect(this.id);
  }
}

/** Deux joueurs déjà en duel, avec la grille que le serveur leur a donnée. */
function duel(lobby = new Lobby()) {
  const alice = new Player(lobby, 'Alice');
  const bob = new Player(lobby, 'Bob');
  alice.send({ t: 'queue' });
  bob.send({ t: 'queue' });
  const matched = alice.find('matched');
  if (!matched) throw new Error('pas de duel');
  const puzzle = generatePuzzle({ seed: matched.seed, ...matched.puzzle });
  const empties = puzzle.puzzle.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  return { lobby, alice, bob, puzzle, empties };
}

describe('arrivée', () => {
  it('accueille un joueur qui se présente', () => {
    const lobby = new Lobby();
    const alice = new Player(lobby, '  Alice  ');
    expect(alice.last()).toEqual({ t: 'welcome', id: alice.id, online: 1 });
    expect(lobby.stats().clients).toBe(1);
  });

  it('refuse une version de protocole inconnue', () => {
    const lobby = new Lobby();
    const old = new Player(lobby);
    old.send({ t: 'hello', v: 0, name: 'Vieux' });
    expect(old.last()).toEqual({ t: 'error', code: 'badVersion' });
    old.send({ t: 'queue' });
    expect(old.last()).toEqual({ t: 'error', code: 'badRequest' });
    expect(lobby.stats().queued).toBe(0);
  });

  it('répond aux pings et ignore ce qui est illisible', () => {
    const lobby = new Lobby();
    const alice = new Player(lobby, 'Alice');
    alice.send({ t: 'ping' });
    expect(alice.last()).toEqual({ t: 'pong' });
    const before = alice.inbox.length;
    for (const junk of [null, 42, 'queue', [], { t: 12 }, { t: 'inconnu' }, {}]) alice.raw(junk);
    expect(alice.inbox).toHaveLength(before);
  });

  it('nettoie les pseudos', () => {
    const lobby = new Lobby();
    const a = new Player(lobby, 'Un pseudo beaucoup trop long pour tenir');
    const b = new Player(lobby, '   ');
    a.send({ t: 'queue' });
    b.send({ t: 'queue' });
    expect(b.find('matched')?.opponent).toBe('Un pseudo beau');
    expect(a.find('matched')?.opponent).toBe('Anonyme');
  });
});

describe('partie rapide', () => {
  it('met en relation les deux premiers joueurs de la file', () => {
    const lobby = new Lobby({ startInMs: 3000 });
    const alice = new Player(lobby, 'Alice');
    const bob = new Player(lobby, 'Bob');
    alice.send({ t: 'queue' });
    expect(alice.last()).toEqual({ t: 'queued' });
    expect(lobby.stats().queued).toBe(1);

    bob.send({ t: 'queue' });
    const forAlice = alice.find('matched');
    const forBob = bob.find('matched');
    expect(forAlice).toMatchObject({ opponent: 'Bob', startInMs: 3000 });
    expect(forBob).toMatchObject({ opponent: 'Alice', startInMs: 3000 });
    expect(forAlice?.seed).toBe(forBob?.seed);
    expect(forAlice?.matchId).toBe(forBob?.matchId);
    expect(lobby.stats()).toMatchObject({ queued: 0, matches: 1 });
  });

  it("permet d'annuler sa recherche", () => {
    const lobby = new Lobby();
    const alice = new Player(lobby, 'Alice');
    const bob = new Player(lobby, 'Bob');
    alice.send({ t: 'queue' });
    alice.send({ t: 'cancel' });
    expect(alice.last()).toEqual({ t: 'idle' });
    bob.send({ t: 'queue' });
    expect(bob.last()).toEqual({ t: 'queued' });
    expect(alice.find('matched')).toBeUndefined();
  });

  it('retire de la file un joueur qui se déconnecte', () => {
    const lobby = new Lobby();
    const alice = new Player(lobby, 'Alice');
    const bob = new Player(lobby, 'Bob');
    alice.send({ t: 'queue' });
    alice.leave();
    bob.send({ t: 'queue' });
    expect(bob.last()).toEqual({ t: 'queued' });
  });

  it('refuse de chercher un second duel pendant une partie', () => {
    const { alice } = duel();
    alice.send({ t: 'queue' });
    expect(alice.last()).toEqual({ t: 'error', code: 'busy' });
  });
});

describe('salons', () => {
  it('donne un code lisible et réunit les deux amis', () => {
    const lobby = new Lobby();
    const alice = new Player(lobby, 'Alice');
    const bob = new Player(lobby, 'Bob');
    alice.send({ t: 'createRoom' });
    const code = alice.find('room')?.code as string;
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    for (const letter of code) expect(ROOM_ALPHABET).toContain(letter);

    // Le code est accepté en minuscules et avec des espaces.
    bob.send({ t: 'joinRoom', code: ` ${code.toLowerCase().split('').join(' ')} ` });
    expect(alice.find('matched')?.opponent).toBe('Bob');
    expect(bob.find('matched')?.opponent).toBe('Alice');
    expect(lobby.stats().rooms).toBe(0);
  });

  it('signale un code inconnu', () => {
    const lobby = new Lobby();
    const bob = new Player(lobby, 'Bob');
    bob.send({ t: 'joinRoom', code: 'ZZZZ' });
    expect(bob.last()).toEqual({ t: 'error', code: 'roomNotFound' });
  });

  it("ferme le salon quand l'hôte annule ou s'en va", () => {
    const lobby = new Lobby();
    const alice = new Player(lobby, 'Alice');
    const bob = new Player(lobby, 'Bob');
    alice.send({ t: 'createRoom' });
    const first = alice.find('room')?.code as string;
    alice.send({ t: 'cancel' });
    bob.send({ t: 'joinRoom', code: first });
    expect(bob.last()).toEqual({ t: 'error', code: 'roomNotFound' });

    alice.send({ t: 'createRoom' });
    const second = alice.find('room')?.code as string;
    alice.leave();
    bob.send({ t: 'joinRoom', code: second });
    expect(bob.last()).toEqual({ t: 'error', code: 'roomNotFound' });
    expect(lobby.stats().rooms).toBe(0);
  });

  it('ne donne jamais deux fois le même code en même temps', () => {
    // Un « hasard » qui se répète : le serveur doit insister jusqu'à trouver un code libre.
    const values = [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    const lobby = new Lobby({ random: () => values[i++ % values.length] });
    const a = new Player(lobby, 'A');
    const b = new Player(lobby, 'B');
    a.send({ t: 'createRoom' });
    b.send({ t: 'createRoom' });
    expect(a.find('room')?.code).not.toBe(b.find('room')?.code);
  });
});

describe('pendant le duel', () => {
  it('relaie les bons chiffres et eux seulement', () => {
    const { alice, bob, puzzle, empties } = duel();
    const cell = empties[0];
    const given = puzzle.puzzle.findIndex((v) => v !== 0);

    alice.send({ t: 'placed', cell, digit: (puzzle.solution[cell] % 9) + 1 });
    alice.send({ t: 'placed', cell: given, digit: puzzle.puzzle[given] });
    alice.send({ t: 'placed', cell: 99, digit: 1 });
    expect(bob.count('placed')).toBe(0);

    alice.send({ t: 'placed', cell, digit: puzzle.solution[cell] });
    alice.send({ t: 'placed', cell, digit: puzzle.solution[cell] });
    expect(bob.count('placed')).toBe(1);
    expect(bob.last()).toEqual({ t: 'placed', cell });
    expect(alice.count('placed')).toBe(0);
  });

  it('relaie les attaques et leurs résultats', () => {
    const { alice, bob } = duel();
    alice.send({ t: 'attack', ref: 5, power: 'freeze' });
    expect(bob.last()).toEqual({ t: 'attack', ref: 5, power: 'freeze' });

    bob.send({ t: 'resolved', ref: 5, outcome: 'blocked', cells: [], boxes: [], amount: 0 });
    expect(alice.last()).toEqual({
      t: 'resolved',
      ref: 5,
      outcome: 'blocked',
      cells: [],
      boxes: [],
      amount: 0,
    });
  });

  it('refuse les attaques qui ne sont pas des attaques', () => {
    const { alice, bob } = duel();
    alice.raw({ t: 'attack', ref: 1, power: 'scan' });
    alice.raw({ t: 'attack', ref: 1, power: 'toString' });
    alice.raw({ t: 'attack', ref: 'x', power: 'freeze' });
    alice.raw({ t: 'resolved', ref: 1, outcome: 'gagné', cells: [], boxes: [], amount: 0 });
    expect(bob.count('attack')).toBe(0);
    expect(alice.count('resolved') + bob.count('resolved')).toBe(0);
  });

  it('relaie les effets en écartant les inconnus', () => {
    const { alice, bob } = duel();
    alice.raw({ t: 'status', effects: ['freeze', 'bidon', 'freeze', 'shield'] });
    expect(bob.last()).toEqual({ t: 'status', effects: ['freeze', 'shield'] });
  });

  it('tient compte des chiffres effacés par un virus', () => {
    const { alice, bob, puzzle, empties } = duel();
    for (const cell of empties) alice.send({ t: 'placed', cell, digit: puzzle.solution[cell] });
    // Bob lance un virus ; Alice annonce deux cases perdues (et une qui n'existe pas).
    bob.send({ t: 'attack', ref: 1, power: 'virus' });
    alice.send({
      t: 'resolved',
      ref: 1,
      outcome: 'hit',
      cells: [empties[0], empties[1], 200],
      boxes: [],
      amount: 0,
    });
    expect(bob.find('resolved')).toMatchObject({ cells: [empties[0], empties[1]] });

    // Sa grille n'est plus complète : sa victoire est refusée tant qu'elle ne les a pas reposées.
    alice.send({ t: 'finished' });
    expect(alice.find('over')).toBeUndefined();
    alice.send({ t: 'placed', cell: empties[0], digit: puzzle.solution[empties[0]] });
    alice.send({ t: 'placed', cell: empties[1], digit: puzzle.solution[empties[1]] });
    alice.send({ t: 'finished' });
    expect(alice.find('over')).toEqual({ t: 'over', won: true, reason: 'solved' });
  });
});

describe('fin du duel', () => {
  it('ne croit une victoire que si toute la grille a été vérifiée', () => {
    const { lobby, alice, bob, puzzle, empties } = duel();
    alice.send({ t: 'finished' });
    expect(alice.find('over')).toBeUndefined();

    for (const cell of empties) alice.send({ t: 'placed', cell, digit: puzzle.solution[cell] });
    alice.send({ t: 'finished' });
    expect(alice.find('over')).toEqual({ t: 'over', won: true, reason: 'solved' });
    expect(bob.find('over')).toEqual({ t: 'over', won: false, reason: 'solved' });
    expect(lobby.stats().matches).toBe(0);
  });

  it('donne la victoire au premier qui termine', () => {
    const { alice, bob, puzzle, empties } = duel();
    for (const cell of empties) {
      alice.send({ t: 'placed', cell, digit: puzzle.solution[cell] });
      bob.send({ t: 'placed', cell, digit: puzzle.solution[cell] });
    }
    bob.send({ t: 'finished' });
    alice.send({ t: 'finished' });
    expect(bob.find('over')?.won).toBe(true);
    expect(alice.find('over')?.won).toBe(false);
    expect(alice.count('over')).toBe(1);
  });

  it("déclare forfait le joueur qui abandonne ou se déconnecte", () => {
    const first = duel();
    first.alice.send({ t: 'leave' });
    expect(first.alice.find('over')).toEqual({ t: 'over', won: false, reason: 'forfeit' });
    expect(first.bob.find('over')).toEqual({ t: 'over', won: true, reason: 'forfeit' });

    const second = duel();
    second.bob.leave();
    expect(second.alice.find('over')).toEqual({ t: 'over', won: true, reason: 'forfeit' });
    expect(second.lobby.stats()).toMatchObject({ clients: 1, matches: 0 });
  });

  it('remet les joueurs à disposition après la partie', () => {
    const { lobby, alice, bob } = duel();
    alice.send({ t: 'leave' });
    alice.send({ t: 'queue' });
    bob.send({ t: 'queue' });
    expect(alice.count('matched')).toBe(2);
    expect(bob.count('matched')).toBe(2);
    expect(lobby.stats().matches).toBe(1);
    // Les messages de l'ancienne partie ne sont plus relayés n'importe comment.
    expect(alice.find('matched')?.matchId).not.toBe(alice.inbox.find((m) => m.t === 'matched'));
  });

  it('arrête un duel qui dure trop longtemps', () => {
    jest.useFakeTimers();
    try {
      const { alice, bob } = duel(new Lobby({ matchTimeoutMs: 60_000 }));
      jest.advanceTimersByTime(59_000);
      expect(alice.find('over')).toBeUndefined();
      jest.advanceTimersByTime(2_000);
      expect(alice.find('over')).toEqual({ t: 'over', won: false, reason: 'timeout' });
      expect(bob.find('over')).toEqual({ t: 'over', won: false, reason: 'timeout' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('ignore les messages de jeu une fois le duel terminé', () => {
    const { alice, bob, puzzle, empties } = duel();
    alice.send({ t: 'leave' });
    const before = bob.inbox.length;
    alice.send({ t: 'placed', cell: empties[0], digit: puzzle.solution[empties[0]] });
    alice.send({ t: 'attack', ref: 1, power: 'freeze' });
    expect(bob.inbox).toHaveLength(before);
  });
});
