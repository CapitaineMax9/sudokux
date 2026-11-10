/**
 * Pont entre le moteur et les animations.
 *
 * Le moteur dit ce qui vient de se passer (`MatchEvent`). Ici, on redistribue
 * ces événements : à toute l'interface (`matchEvents`) et, pour les effets qui
 * concernent une case précise, directement à cette case (`onCellFx`), afin de
 * ne pas réveiller les 81 cases à chaque fois.
 */
import type { MatchEvent } from '@/engine/match';
import { CELLS, colOf, rowOf } from '@/engine/sudoku';

type Handler<T> = (payload: T) => void;

export class Emitter<T> {
  private handlers = new Set<Handler<T>>();

  on(handler: Handler<T>): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  emit(payload: T): void {
    for (const handler of [...this.handlers]) handler(payload);
  }
}

export const matchEvents = new Emitter<MatchEvent>();

export type CellFx =
  /** Bon chiffre posé par le joueur. */
  | { kind: 'pop' }
  /** Chiffre révélé par un pouvoir. */
  | { kind: 'reveal' }
  /** Mauvais chiffre : il s'affiche un instant en rouge. */
  | { kind: 'error'; digit: number }
  /** Vague lumineuse quand une ligne, une colonne ou un bloc est terminé. */
  | { kind: 'wave'; delay: number }
  /** Chiffre effacé par un virus. */
  | { kind: 'corrupt' };

const cellHandlers: (Handler<CellFx> | null)[] = new Array(CELLS).fill(null);

export function onCellFx(cell: number, handler: Handler<CellFx>): () => void {
  cellHandlers[cell] = handler;
  return () => {
    if (cellHandlers[cell] === handler) cellHandlers[cell] = null;
  };
}

function emitCellFx(cell: number, fx: CellFx): void {
  cellHandlers[cell]?.(fx);
}

const WAVE_STEP_MS = 45;

/** Diffuse les événements d'une action du moteur. */
export function routeEvents(events: MatchEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case 'placed':
        if (event.side === 'player') {
          emitCellFx(event.cell, { kind: event.revealed ? 'reveal' : 'pop' });
        }
        break;
      case 'mistake':
        if (event.side === 'player') emitCellFx(event.cell, { kind: 'error', digit: event.digit });
        break;
      case 'unitComplete':
        if (event.side === 'player') {
          for (const cell of event.cells) {
            const distance =
              Math.abs(rowOf(cell) - rowOf(event.origin)) + Math.abs(colOf(cell) - colOf(event.origin));
            emitCellFx(cell, { kind: 'wave', delay: distance * WAVE_STEP_MS });
          }
        }
        break;
      case 'attackHit':
        if (event.attack.target === 'player') {
          for (const cell of event.cells) emitCellFx(cell, { kind: 'corrupt' });
        }
        break;
      default:
        break;
    }
    matchEvents.emit(event);
  }
}
