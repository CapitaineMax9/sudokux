/**
 * Connexion au serveur de duels et relais d'une partie en ligne.
 *
 * La connexion vit en dehors des écrans : on la garde en passant de l'écran
 * « En ligne » à l'écran de jeu. Pendant un duel, ce module fait le pont :
 *  - ce que fait le joueur (événements du moteur) part vers le serveur ;
 *  - ce que fait l'adversaire (messages du serveur) entre dans le moteur.
 */
import { create } from 'zustand';

import type { EndReason } from '@/engine/match';
import { matchEvents } from '@/game/events';
import { dispatchMatch, useMatchStore } from '@/store/match';
import { useProgress } from '@/store/progress';

import { serverUrl } from './config';
import {
  PROTOCOL_VERSION,
  normalizeRoomCode,
  type ClientMessage,
  type PuzzleSpec,
  type ServerMessage,
} from './protocol';

export type OnlinePhase = 'offline' | 'connecting' | 'lobby' | 'queued' | 'hosting' | 'matched';
export type OnlineError = 'unreachable' | 'roomNotFound' | 'badVersion' | 'lost' | null;

export interface FoundMatch {
  seed: number;
  puzzle: PuzzleSpec;
  opponent: string;
  /** Heure locale (Date.now) du coup d'envoi. */
  startAt: number;
}

interface OnlineState {
  phase: OnlinePhase;
  error: OnlineError;
  roomCode: string | null;
  found: FoundMatch | null;
  url: string;
  connect: () => void;
  disconnect: () => void;
  quickMatch: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  cancel: () => void;
  /** L'écran de jeu a lancé la partie : on commence à relayer. */
  beginRelay: () => void;
  /** Le joueur quitte l'écran de jeu (abandon si le duel est en cours). */
  leaveMatch: () => void;
}

const PING_MS = 20_000;

let socket: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let relaying = false;
let lastStatus = '';

function send(message: ClientMessage): void {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function stopRelay(): void {
  relaying = false;
  lastStatus = '';
}

export const useOnline = create<OnlineState>()((set, get) => {
  const closed = (reason: OnlineError) => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
    socket = null;
    // Connexion perdue en plein duel : c'est une défaite, sauf grille déjà finie.
    if (relaying) {
      const match = useMatchStore.getState().match;
      const done = match !== null && match.player.remaining === 0;
      dispatchMatch({
        type: 'remote',
        event: { kind: 'over', won: done, reason: done ? 'solved' : 'disconnected' },
      });
    }
    stopRelay();
    set({ phase: 'offline', error: reason, roomCode: null, found: null });
  };

  const onMessage = (message: ServerMessage) => {
    switch (message.t) {
      case 'welcome':
        set({ phase: 'lobby', error: null });
        return;
      case 'queued':
        set({ phase: 'queued', error: null });
        return;
      case 'room':
        set({ phase: 'hosting', roomCode: message.code, error: null });
        return;
      case 'idle':
        set({ phase: 'lobby', roomCode: null });
        return;
      case 'error':
        if (message.code === 'roomNotFound') set({ error: 'roomNotFound' });
        else if (message.code === 'badVersion') set({ error: 'badVersion' });
        return;
      case 'matched':
        set({
          phase: 'matched',
          roomCode: null,
          error: null,
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
          dispatchMatch({
            type: 'remote',
            event: { kind: 'attack', ref: message.ref, power: message.power },
          });
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
        if (relaying) {
          dispatchMatch({ type: 'remote', event: { kind: 'over', won: message.won, reason } });
        }
        stopRelay();
        set({ phase: 'lobby', found: null });
        return;
      }
      default:
        return;
    }
  };

  return {
    phase: 'offline',
    error: null,
    roomCode: null,
    found: null,
    url: serverUrl(),

    connect: () => {
      if (socket) return;
      const url = serverUrl();
      set({ phase: 'connecting', error: null, url });
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        set({ phase: 'offline', error: 'unreachable' });
        return;
      }
      socket = ws;
      let opened = false;
      ws.onopen = () => {
        opened = true;
        send({ t: 'hello', v: PROTOCOL_VERSION, name: useProgress.getState().playerName });
        pingTimer = setInterval(() => send({ t: 'ping' }), PING_MS);
      };
      ws.onmessage = (event) => {
        if (socket !== ws) return;
        try {
          onMessage(JSON.parse(String(event.data)) as ServerMessage);
        } catch {
          // Message illisible : on l'ignore.
        }
      };
      ws.onclose = () => {
        if (socket !== ws) return;
        closed(opened ? 'lost' : 'unreachable');
      };
      ws.onerror = () => {
        // `onclose` suit toujours : c'est lui qui fait le ménage.
      };
    },

    disconnect: () => {
      const ws = socket;
      if (!ws) return;
      socket = null;
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      stopRelay();
      ws.close();
      set({ phase: 'offline', error: null, roomCode: null, found: null });
    },

    quickMatch: () => {
      set({ error: null });
      send({ t: 'queue' });
    },
    createRoom: () => {
      set({ error: null });
      send({ t: 'createRoom' });
    },
    joinRoom: (code) => {
      set({ error: null });
      send({ t: 'joinRoom', code: normalizeRoomCode(code) });
    },
    cancel: () => send({ t: 'cancel' }),

    beginRelay: () => {
      relaying = true;
      lastStatus = '';
    },

    leaveMatch: () => {
      if (relaying) send({ t: 'leave' });
      stopRelay();
      if (get().phase === 'matched') set({ phase: socket ? 'lobby' : 'offline', found: null });
    },
  };
});

/* Ce que fait le joueur part vers le serveur. */
matchEvents.on((event) => {
  if (!relaying) return;
  switch (event.type) {
    case 'placed':
      if (event.side === 'player') send({ t: 'placed', cell: event.cell, digit: event.digit });
      break;
    case 'attackLaunched':
      if (event.attack.from === 'player') {
        send({ t: 'attack', ref: event.attack.id, power: event.attack.power });
      }
      break;
    case 'attackHit':
    case 'attackBlocked':
    case 'attackReflected': {
      const { attack } = event;
      if (attack.target !== 'player' || attack.from !== 'opponent' || attack.ref === null) break;
      send({
        t: 'resolved',
        ref: attack.ref,
        outcome: event.type === 'attackHit' ? 'hit' : event.type === 'attackBlocked' ? 'blocked' : 'reflected',
        cells: event.type === 'attackHit' ? event.cells : [],
        boxes: event.type === 'attackHit' ? event.boxes : [],
        amount: event.type === 'attackHit' ? event.amount : 0,
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
