/**
 * Les messages échangés entre le jeu et le serveur de duels, en JSON sur une
 * connexion WebSocket. Ce fichier est partagé par l'application et par le
 * serveur (`server/`) : il ne doit dépendre de rien d'autre que du moteur.
 *
 * Principe : chaque joueur fait autorité sur son propre plateau et annonce
 * ce qu'il fait ; le serveur met les joueurs en relation, vérifie les
 * chiffres posés, relaie les actions et désigne le vainqueur.
 */
import type { AttackId, EffectId } from '../engine/powers';
import type { AttackOutcome } from '../engine/remote';
import type { Difficulty, Variant } from '../engine/sudoku';

/** À augmenter quand le protocole change de façon incompatible. */
export const PROTOCOL_VERSION = 1;
export const ROOM_CODE_LENGTH = 4;
export const MAX_NAME_LENGTH = 14;

export interface PuzzleSpec {
  difficulty: Difficulty;
  clues: number;
  variant: Variant;
}

/** Du jeu vers le serveur. */
export type ClientMessage =
  | { t: 'hello'; v: number; name: string }
  /** Partie rapide : affronter le premier joueur disponible. */
  | { t: 'queue' }
  /** Ouvrir un salon privé et recevoir son code. */
  | { t: 'createRoom' }
  | { t: 'joinRoom'; code: string }
  /** Quitter la file d'attente ou fermer son salon. */
  | { t: 'cancel' }
  | { t: 'placed'; cell: number; digit: number }
  | { t: 'attack'; ref: number; power: AttackId }
  | {
      t: 'resolved';
      ref: number;
      outcome: AttackOutcome;
      cells: number[];
      boxes: number[];
      amount: number;
    }
  | { t: 'status'; effects: EffectId[] }
  /** « J'ai terminé ma grille » : le serveur vérifie avant de trancher. */
  | { t: 'finished' }
  /** Abandonner le duel en cours. */
  | { t: 'leave' }
  | { t: 'ping' };

export type ServerErrorCode = 'badVersion' | 'roomNotFound' | 'busy' | 'badRequest';

export type OverReason = 'solved' | 'forfeit' | 'timeout';

/** Du serveur vers le jeu. */
export type ServerMessage =
  | { t: 'welcome'; id: string; online: number }
  | { t: 'queued' }
  | { t: 'room'; code: string }
  /** Retour à l'accueil (après une annulation ou une fin de partie). */
  | { t: 'idle' }
  | { t: 'error'; code: ServerErrorCode }
  | {
      t: 'matched';
      matchId: string;
      /** Les deux joueurs génèrent la même grille à partir de cette graine. */
      seed: number;
      puzzle: PuzzleSpec;
      opponent: string;
      /** Délai avant le coup d'envoi, pour démarrer en même temps. */
      startInMs: number;
    }
  | { t: 'placed'; cell: number }
  | { t: 'attack'; ref: number; power: AttackId }
  | {
      t: 'resolved';
      ref: number;
      outcome: AttackOutcome;
      cells: number[];
      boxes: number[];
      amount: number;
    }
  | { t: 'status'; effects: EffectId[] }
  | { t: 'over'; won: boolean; reason: OverReason }
  | { t: 'pong' };

/** Grille utilisée pour les duels en ligne. */
export const ONLINE_PUZZLE: PuzzleSpec = { difficulty: 'easy', clues: 44, variant: 'classic' };

/** Lettres et chiffres sans ambiguïté à la lecture (ni O/0, ni I/1). */
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function cleanName(input: unknown): string {
  if (typeof input !== 'string') return '';
  // On retire les caractères de contrôle et les espaces en trop.
  return input
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}
