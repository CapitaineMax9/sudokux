/**
 * Duels entre joueurs, sans serveur à nous. Deux façons de se retrouver :
 *  - « local » : sur le même Wi-Fi ou via le partage de connexion, en direct ;
 *  - « internet » : par Firebase, qui sert de boîte aux lettres.
 * Dans les deux cas, le téléphone de l'hôte arbitre (`HostSession`).
 *
 * La connexion vit en dehors des écrans. Pendant un duel, ce module fait le
 * pont entre le moteur (nos coups) et le réseau (ceux de l'adversaire).
 */
import * as Network from 'expo-network';
import { create } from 'zustand';

import type { EndReason } from '@/engine/match';
import { matchEvents } from '@/game/events';
import { dispatchMatch, useMatchStore } from '@/store/match';
import { useProgress } from '@/store/progress';

import { HostSession } from './host';
import {
  claimQuickMatch,
  hostInternet,
  internetAvailable,
  joinInternet,
  leaveQuickMatch,
} from './internet';
import type { Link, LinkHandlers } from './link';
import { LOCAL_PORT, codeToIp, ipToCode } from './localCode';
import { localAvailable, nativeNet } from './nativeTcp';
import { PROTOCOL_VERSION, type ClientMessage, type PuzzleSpec, type ServerMessage } from './protocol';
import { hostTcp, joinTcp } from './tcp';

export type OnlineMode = 'local' | 'internet';
export type OnlinePhase =
  /** Pas de connexion. */
  | 'idle'
  /** Connexion ou création du salon en cours. */
  | 'busy'
  /** Hôte : salon ouvert, on attend l'invité (le code est affiché). */
  | 'hosting'
  /** Partie rapide : on cherche un adversaire. */
  | 'searching'
  /** Reliés à l'adversaire, entre deux duels. */
  | 'paired'
  /** Revanche demandée : on attend que l'autre accepte aussi. */
  | 'waitingRematch'
  /** Duel trouvé : direction l'écran de jeu. */
  | 'matched';

export type OnlineError =
  | 'unreachable'
  | 'roomNotFound'
  | 'badCode'
  | 'noNetwork'
  | 'lost'
  | 'rivalLeft'
  | 'badVersion'
  | null;

export interface FoundMatch {
  seed: number;
  puzzle: PuzzleSpec;
  opponent: string;
  /** Heure locale (Date.now) du coup d'envoi. */
  startAt: number;
}

interface OnlineState {
  phase: OnlinePhase;
  mode: OnlineMode | null;
  error: OnlineError;
  /** Code à donner à l'adversaire (hôte). */
  code: string | null;
  rival: string | null;
  found: FoundMatch | null;
  hostLocal: () => Promise<void>;
  joinLocal: (code: string) => void;
  quickMatch: () => Promise<void>;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  rematch: () => void;
  /** Tout fermer et revenir au départ. */
  cancel: () => void;
  beginRelay: () => void;
  leaveMatch: () => void;
}

export { internetAvailable, localAvailable };

/* ---------------- État de la connexion (hors React) ---------------- */

let link: Link | null = null;
let teardownTransport: (() => void) | null = null;
/** Code du salon qu'on a inscrit en partie rapide, à retirer en partant. */
let queuedCode: string | null = null;
let relaying = false;
let lastStatus = '';
/** Incrémenté à chaque nouvelle tentative : les réponses des anciennes sont ignorées. */
let attempt = 0;

function send(message: ClientMessage): void {
  link?.send(message);
}

function stopRelay(): void {
  relaying = false;
  lastStatus = '';
}

function greet(): void {
  send({ t: 'hello', v: PROTOCOL_VERSION, name: useProgress.getState().playerName });
  send({ t: 'queue' });
}

export const useOnline = create<OnlineState>()((set, get) => {
  /** Ferme tout ce qui est ouvert. */
  const teardown = () => {
    attempt += 1;
    if (queuedCode) {
      leaveQuickMatch(queuedCode).catch(() => {});
      queuedCode = null;
    }
    const current = link;
    link = null;
    current?.close();
    teardownTransport?.();
    teardownTransport = null;
  };

  /** La connexion s'est arrêtée d'elle-même. */
  const lostConnection = (error: OnlineError) => {
    if (relaying) {
      const match = useMatchStore.getState().match;
      const done = match !== null && match.player.remaining === 0;
      dispatchMatch({
        type: 'remote',
        event: {
          kind: 'over',
          won: error === 'rivalLeft' || done,
          reason: error === 'rivalLeft' ? 'forfeit' : done ? 'solved' : 'disconnected',
        },
      });
    }
    stopRelay();
    teardown();
    set({ phase: 'idle', error, code: null, found: null });
  };

  const onMessage = (message: ServerMessage) => {
    switch (message.t) {
      case 'queued':
        return;
      case 'error':
        if (message.code === 'badVersion') lostConnection('badVersion');
        return;
      case 'matched':
        if (queuedCode) {
          leaveQuickMatch(queuedCode).catch(() => {});
          queuedCode = null;
        }
        set({
          phase: 'matched',
          error: null,
          rival: message.opponent,
          found: {
            seed: message.seed,
            puzzle: message.puzzle,
            opponent: message.opponent,
            startAt: Date.now() + message.startInMs,
          },
        });
        return;
      case 'placed':
        if (relaying) dispatchMatch({ type: 'remote', event: { kind: 'placed', cell: message.cell } });
        return;
      case 'attack':
        if (relaying) {
          dispatchMatch({ type: 'remote', event: { kind: 'attack', ref: message.ref, power: message.power } });
        }
        return;
      case 'resolved':
        if (relaying) {
          dispatchMatch({
            type: 'remote',
            event: {
              kind: 'resolved',
              ref: message.ref,
              outcome: message.outcome,
              cells: message.cells,
              boxes: message.boxes,
              amount: message.amount,
            },
          });
        }
        return;
      case 'status':
        if (relaying) dispatchMatch({ type: 'remote', event: { kind: 'status', effects: message.effects } });
        return;
      case 'over': {
        const reason: EndReason = message.won
          ? message.reason === 'forfeit'
            ? 'forfeit'
            : 'solved'
          : message.reason === 'timeout'
            ? 'timeout'
            : 'outpaced';
        if (relaying) dispatchMatch({ type: 'remote', event: { kind: 'over', won: message.won, reason } });
        stopRelay();
        set({ phase: 'paired', found: null });
        return;
      }
      default:
        return;
    }
  };

  /** Prépare les gestionnaires d'un lien, en ignorant ceux d'une tentative abandonnée. */
  const handlersFor = (mine: number): LinkHandlers => ({
    onOpen: () => {
      if (mine === attempt) greet();
    },
    onMessage: (message) => {
      if (mine === attempt) onMessage(message);
    },
    onClose: (reason) => {
      if (mine !== attempt) return;
      lostConnection(
        reason === 'rivalLeft' ? 'rivalLeft' : get().phase === 'busy' && reason === 'unreachable' ? 'unreachable' : 'lost',
      );
    },
  });

  /** Crée une session d'hôte qui prévient quand l'invité arrive ou repart. */
  const newHost = (mine: number) =>
    new HostSession(handlersFor(mine), {
      onGuestJoined: () => {
        if (mine !== attempt) return;
        if (queuedCode) {
          leaveQuickMatch(queuedCode).catch(() => {});
          queuedCode = null;
        }
      },
      onGuestLeft: () => {
        // Laisse d'abord passer le message de fin de duel (forfait), puis ferme.
        setTimeout(() => {
          if (mine === attempt) lostConnection('rivalLeft');
        }, 50);
      },
    });

  const startHostLink = (session: HostSession) => {
    link = session.link;
    greet();
  };

  return {
    phase: 'idle',
    mode: null,
    error: null,
    code: null,
    rival: null,
    found: null,

    hostLocal: async () => {
      teardown();
      const mine = attempt;
      set({ phase: 'busy', mode: 'local', error: null, code: null, rival: null });
      let ip = '';
      try {
        ip = await Network.getIpAddressAsync();
      } catch {
        ip = '';
      }
      const code = ipToCode(ip);
      if (mine !== attempt) return;
      if (!code) {
        set({ phase: 'idle', error: 'noNetwork' });
        return;
      }
      const session = newHost(mine);
      try {
        const server = await hostTcp(nativeNet(), LOCAL_PORT, session);
        if (mine !== attempt) {
          server.stop();
          session.close();
          return;
        }
        teardownTransport = () => {
          server.stop();
          session.close();
        };
      } catch {
        session.close();
        if (mine === attempt) set({ phase: 'idle', error: 'unreachable' });
        return;
      }
      startHostLink(session);
      set({ phase: 'hosting', code });
    },

    joinLocal: (input) => {
      teardown();
      const ip = codeToIp(input);
      if (!ip) {
        set({ phase: 'idle', mode: 'local', error: 'badCode' });
        return;
      }
      const mine = attempt;
      set({ phase: 'busy', mode: 'local', error: null, code: null, rival: null });
      link = joinTcp(nativeNet(), ip, LOCAL_PORT, handlersFor(mine));
    },

    createRoom: async () => {
      teardown();
      const mine = attempt;
      set({ phase: 'busy', mode: 'internet', error: null, code: null, rival: null });
      const session = newHost(mine);
      try {
        const room = await hostInternet(session);
        if (mine !== attempt) {
          room.stop();
          session.close();
          return;
        }
        teardownTransport = () => {
          room.stop();
          session.close();
        };
        startHostLink(session);
        set({ phase: 'hosting', code: room.code });
      } catch {
        session.close();
        if (mine === attempt) set({ phase: 'idle', error: 'unreachable' });
      }
    },

    joinRoom: async (code) => {
      teardown();
      const mine = attempt;
      set({ phase: 'busy', mode: 'internet', error: null, code: null, rival: null });
      try {
        const joined = await joinInternet(code, handlersFor(mine));
        if (mine !== attempt) {
          joined?.close();
          return;
        }
        if (!joined) {
          set({ phase: 'idle', error: 'roomNotFound' });
          return;
        }
        link = joined;
      } catch {
        if (mine === attempt) set({ phase: 'idle', error: 'unreachable' });
      }
    },

    quickMatch: async () => {
      teardown();
      const mine = attempt;
      set({ phase: 'busy', mode: 'internet', error: null, code: null, rival: null });
      try {
        // Deux essais : un joueur en attente a pu partir juste avant qu'on le rejoigne.
        for (let round = 0; round < 3 && mine === attempt; round++) {
          const session = newHost(mine);
          const room = await hostInternet(session);
          const claim = await claimQuickMatch(room.code);
          if (mine !== attempt) {
            room.stop();
            session.close();
            if ('wait' in claim) await leaveQuickMatch(room.code);
            return;
          }
          if ('wait' in claim) {
            queuedCode = room.code;
            teardownTransport = () => {
              room.stop();
              session.close();
            };
            startHostLink(session);
            set({ phase: 'searching' });
            return;
          }
          // Quelqu'un attendait : on rejoint son salon et on ferme le nôtre.
          room.stop();
          session.close();
          const joined = await joinInternet(claim.join, handlersFor(mine));
          if (mine !== attempt) {
            joined?.close();
            return;
          }
          if (joined) {
            link = joined;
            set({ phase: 'searching' });
            return;
          }
        }
        if (mine === attempt) set({ phase: 'idle', error: 'unreachable' });
      } catch {
        if (mine === attempt) set({ phase: 'idle', error: 'unreachable' });
      }
    },

    rematch: () => {
      if (get().phase !== 'paired') return;
      send({ t: 'queue' });
      set({ phase: 'waitingRematch' });
    },

    cancel: () => {
      stopRelay();
      teardown();
      set({ phase: 'idle', error: null, code: null, found: null, rival: null });
    },

    beginRelay: () => {
      relaying = true;
      lastStatus = '';
    },

    leaveMatch: () => {
      if (relaying) send({ t: 'leave' });
      stopRelay();
      if (get().phase === 'matched') set({ phase: link ? 'paired' : 'idle', found: null });
    },
  };
});

/* Ce que fait le joueur part vers l'adversaire. */
matchEvents.on((event) => {
  if (!relaying) return;
  switch (event.type) {
    case 'placed':
      if (event.side === 'player') send({ t: 'placed', cell: event.cell, digit: event.digit });
      break;
    case 'attackLaunched':
      if (event.attack.from === 'player') send({ t: 'attack', ref: event.attack.id, power: event.attack.power });
      break;
    case 'attackHit':
    case 'attackBlocked':
    case 'attackReflected': {
      const { attack } = event;
      if (attack.target !== 'player' || attack.from !== 'opponent' || attack.ref === null) break;
      const hit = event.type === 'attackHit';
      send({
        t: 'resolved',
        ref: attack.ref,
        outcome: hit ? 'hit' : event.type === 'attackBlocked' ? 'blocked' : 'reflected',
        cells: hit ? event.cells : [],
        boxes: hit ? event.boxes : [],
        amount: hit ? event.amount : 0,
      });
      break;
    }
    case 'completed':
      if (event.side === 'player') send({ t: 'finished' });
      break;
    default:
      break;
  }
});

/* Nos effets en cours sont annoncés à l'adversaire dès qu'ils changent. */
useMatchStore.subscribe((store) => {
  if (!relaying || !store.match) return;
  const effects = store.match.player.effects.map((effect) => effect.id);
  const key = effects.join(',');
  if (key === lastStatus) return;
  lastStatus = key;
  send({ t: 'status', effects });
});
