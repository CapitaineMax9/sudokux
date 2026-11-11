/**
 * Le cœur du serveur de duels, sans aucune notion de réseau : il reçoit des
 * messages déjà décodés et répond par l'intermédiaire d'un `Peer`. On peut
 * donc le tester entièrement sans ouvrir de connexion.
 *
 * Rôle du serveur :
 *  - mettre deux joueurs en relation (file d'attente ou salon à code) ;
 *  - leur donner la même grille (une graine) ;
 *  - vérifier chaque chiffre posé et suivre l'avancée de chacun ;
 *  - relayer les attaques et leurs résultats ;
 *  - désigner le vainqueur.
 */
import { POWERS, isAttack, type EffectId, type PowerId } from '../src/engine/powers';
import { CELLS, generatePuzzle } from '../src/engine/sudoku';
import {
  ONLINE_PUZZLE,
  PROTOCOL_VERSION,
  ROOM_ALPHABET,
  ROOM_CODE_LENGTH,
  cleanName,
  normalizeRoomCode,
  type OverReason,
  type PuzzleSpec,
  type ServerErrorCode,
  type ServerMessage,
} from '../src/net/protocol';

/** Le moyen d'envoyer un message à un joueur connecté. */
export interface Peer {
  send(message: ServerMessage): void;
}

type ClientState = 'new' | 'idle' | 'queued' | 'hosting' | 'playing';

interface Client {
  id: string;
  peer: Peer;
  name: string;
  state: ClientState;
  room: string | null;
  match: Match | null;
}

interface Match {
  id: string;
  seed: number;
  given: number[];
  solution: number[];
  /** Nombre de cases à remplir. */
  empties: number;
  players: [Client, Client];
  /** Cases correctement remplies par chaque joueur. */
  filled: [Set<number>, Set<number>];
  over: boolean;
  timeout: ReturnType<typeof setTimeout> | null;
}

export interface LobbyOptions {
  /** Source de hasard (remplaçable dans les tests). */
  random?: () => number;
  log?: (line: string) => void;
  puzzle?: PuzzleSpec;
  /** Délai entre la mise en relation et le coup d'envoi. */
  startInMs?: number;
  /** Durée maximale d'un duel. */
  matchTimeoutMs?: number;
}

const KNOWN_EFFECTS: EffectId[] = ['freeze', 'glitch', 'blackout', 'shield', 'sonar', 'mirror', 'flip'];
const OUTCOMES = ['hit', 'blocked', 'reflected'] as const;

const isInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);
const isCell = (value: unknown): value is number => isInt(value) && value >= 0 && value < CELLS;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class Lobby {
  private readonly clients = new Map<string, Client>();
  private readonly rooms = new Map<string, Client>();
  private queue: Client[] = [];
  private matches = 0;
  private nextClient = 1;
  private nextMatch = 1;

  private readonly random: () => number;
  private readonly log: (line: string) => void;
  private readonly spec: PuzzleSpec;
  private readonly startInMs: number;
  private readonly matchTimeoutMs: number;

  constructor(options: LobbyOptions = {}) {
    this.random = options.random ?? Math.random;
    this.log = options.log ?? (() => {});
    this.spec = options.puzzle ?? ONLINE_PUZZLE;
    this.startInMs = options.startInMs ?? 4000;
    this.matchTimeoutMs = options.matchTimeoutMs ?? 30 * 60_000;
  }

  /** Un joueur vient de se connecter. Renvoie son identifiant. */
  connect(peer: Peer): string {
    const id = `p${this.nextClient++}`;
    this.clients.set(id, { id, peer, name: '', state: 'new', room: null, match: null });
    return id;
  }

  /** La connexion d'un joueur est fermée. */
  disconnect(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;
    this.leaveEverything(client);
    this.clients.delete(id);
    this.log(`- ${client.name || id} est parti (${this.clients.size} connectés)`);
  }

  stats() {
    return {
      clients: this.clients.size,
      queued: this.queue.length,
      rooms: this.rooms.size,
      matches: this.matches,
    };
  }

  /** Traite un message reçu d'un joueur. Tout contenu invalide est ignoré. */
  receive(id: string, message: unknown): void {
    const client = this.clients.get(id);
    if (!client || !isRecord(message) || typeof message.t !== 'string') return;

    if (message.t === 'ping') {
      client.peer.send({ t: 'pong' });
      return;
    }

    if (message.t === 'hello') {
      if (message.v !== PROTOCOL_VERSION) {
        this.fail(client, 'badVersion');
        return;
      }
      client.name = cleanName(message.name) || 'Anonyme';
      if (client.state === 'new') client.state = 'idle';
      client.peer.send({ t: 'welcome', id: client.id, online: this.clients.size });
      this.log(`+ ${client.name} est arrivé (${this.clients.size} connectés)`);
      return;
    }

    // Tout le reste exige de s'être présenté.
    if (client.state === 'new') {
      this.fail(client, 'badRequest');
      return;
    }

    switch (message.t) {
      case 'queue':
        this.enqueue(client);
        return;
      case 'createRoom':
        this.createRoom(client);
        return;
      case 'joinRoom':
        this.joinRoom(client, message.code);
        return;
      case 'cancel':
        if (client.state === 'queued' || client.state === 'hosting') {
          this.leaveEverything(client);
          client.peer.send({ t: 'idle' });
        }
        return;
      case 'leave':
        if (client.match) this.forfeit(client);
        return;
      default:
        if (client.match && !client.match.over) this.inMatch(client, client.match, message);
    }
  }

  /* ---------------- Mise en relation ---------------- */

  private enqueue(client: Client): void {
    if (client.state === 'queued') return;
    if (client.state !== 'idle') {
      this.fail(client, 'busy');
      return;
    }
    const other = this.queue.shift();
    if (other) {
      this.startMatch(other, client);
      return;
    }
    client.state = 'queued';
    this.queue.push(client);
    client.peer.send({ t: 'queued' });
  }

  private createRoom(client: Client): void {
    if (client.state !== 'idle') {
      this.fail(client, 'busy');
      return;
    }
    let code = '';
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_ALPHABET[Math.floor(this.random() * ROOM_ALPHABET.length)];
      }
    } while (this.rooms.has(code));
    client.state = 'hosting';
    client.room = code;
    this.rooms.set(code, client);
    client.peer.send({ t: 'room', code });
    this.log(`  salon ${code} ouvert par ${client.name}`);
  }

  private joinRoom(client: Client, rawCode: unknown): void {
    if (client.state !== 'idle') {
      this.fail(client, 'busy');
      return;
    }
    const code = typeof rawCode === 'string' ? normalizeRoomCode(rawCode) : '';
    const host = this.rooms.get(code);
    if (!host) {
      this.fail(client, 'roomNotFound');
      return;
    }
    this.rooms.delete(code);
    host.room = null;
    this.startMatch(host, client);
  }

  private startMatch(a: Client, b: Client): void {
    const seed = Math.floor(this.random() * 0x7fffffff) + 1;
    const puzzle = generatePuzzle({ seed, ...this.spec });
    const match: Match = {
      id: `m${this.nextMatch++}`,
      seed,
      given: puzzle.puzzle,
      solution: puzzle.solution,
      empties: CELLS - puzzle.clues,
      players: [a, b],
      filled: [new Set(), new Set()],
      over: false,
      timeout: null,
    };
    match.timeout = setTimeout(() => this.end(match, null, 'timeout'), this.matchTimeoutMs);
    // Cette minuterie ne doit pas empêcher le processus de s'arrêter.
    (match.timeout as { unref?: () => void }).unref?.();
    this.matches += 1;

    for (const [me, foe] of [
      [a, b],
      [b, a],
    ] as const) {
      me.state = 'playing';
      me.match = match;
      me.peer.send({
        t: 'matched',
        matchId: match.id,
        seed,
        puzzle: this.spec,
        opponent: foe.name,
        startInMs: this.startInMs,
      });
    }
    this.log(`  duel ${match.id} : ${a.name} contre ${b.name}`);
  }

  /* ---------------- Pendant le duel ---------------- */

  private inMatch(client: Client, match: Match, message: Record<string, unknown>): void {
    const me = match.players[0] === client ? 0 : 1;
    const foe = match.players[1 - me];

    switch (message.t) {
      case 'placed': {
        const { cell, digit } = message;
        // On ne relaie que les chiffres justes, posés dans une case à remplir.
        if (!isCell(cell) || match.given[cell] !== 0) return;
        if (digit !== match.solution[cell] || match.filled[me].has(cell)) return;
        match.filled[me].add(cell);
        foe.peer.send({ t: 'placed', cell });
        return;
      }

      case 'attack': {
        const { ref, power } = message;
        if (!isInt(ref) || typeof power !== 'string') return;
        if (!(power in POWERS) || !isAttack(power as PowerId)) return;
        foe.peer.send({ t: 'attack', ref, power: power as never });
        return;
      }

      case 'resolved': {
        const { ref, outcome } = message;
        if (!isInt(ref) || !OUTCOMES.includes(outcome as never)) return;
        // Chiffres perdus à cause d'un virus : ils ne comptent plus dans l'avancée.
        const cells = (Array.isArray(message.cells) ? message.cells : [])
          .filter((cell): cell is number => isCell(cell) && match.filled[me].has(cell))
          .slice(0, 9);
        if (outcome === 'hit') for (const cell of cells) match.filled[me].delete(cell);
        const boxes = (Array.isArray(message.boxes) ? message.boxes : [])
          .filter((box): box is number => isInt(box) && box >= 0 && box < 9)
          .slice(0, 9);
        const amount = isInt(message.amount) ? Math.max(0, Math.min(100, message.amount)) : 0;
        foe.peer.send({
          t: 'resolved',
          ref,
          outcome: outcome as (typeof OUTCOMES)[number],
          cells: outcome === 'hit' ? cells : [],
          boxes,
          amount,
        });
        return;
      }

      case 'status': {
        const effects = (Array.isArray(message.effects) ? message.effects : []).filter(
          (effect): effect is EffectId => KNOWN_EFFECTS.includes(effect as EffectId),
        );
        foe.peer.send({ t: 'status', effects: [...new Set(effects)] });
        return;
      }

      case 'finished':
        // Le serveur ne croit que ce qu'il a vérifié case par case.
        if (match.filled[me].size === match.empties) this.end(match, me, 'solved');
        return;

      default:
        return;
    }
  }

  private forfeit(client: Client): void {
    const match = client.match;
    if (!match || match.over) return;
    const me = match.players[0] === client ? 0 : 1;
    this.end(match, (1 - me) as 0 | 1, 'forfeit');
  }

  /** Termine un duel. `winner` vaut `null` si personne ne gagne (temps écoulé). */
  private end(match: Match, winner: 0 | 1 | null, reason: OverReason): void {
    if (match.over) return;
    match.over = true;
    if (match.timeout) clearTimeout(match.timeout);
    this.matches -= 1;
    match.players.forEach((player, index) => {
      if (player.match !== match) return;
      player.match = null;
      player.state = 'idle';
      player.peer.send({ t: 'over', won: winner === index, reason });
    });
    const name = winner === null ? 'personne' : match.players[winner].name;
    this.log(`  duel ${match.id} terminé (${reason}) : victoire de ${name}`);
  }

  /* ---------------- Outils ---------------- */

  /** Retire un joueur de la file, de son salon et de son duel. */
  private leaveEverything(client: Client): void {
    this.queue = this.queue.filter((queued) => queued !== client);
    if (client.room) {
      this.rooms.delete(client.room);
      client.room = null;
    }
    if (client.match) this.forfeit(client);
    if (client.state !== 'new') client.state = 'idle';
  }

  private fail(client: Client, code: ServerErrorCode): void {
    client.peer.send({ t: 'error', code });
  }
}
