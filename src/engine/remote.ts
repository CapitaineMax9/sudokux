/**
 * Duel en ligne : ce que fait l'adversaire arrive par le réseau sous forme
 * de `RemoteEvent`. Chaque joueur fait autorité sur son propre plateau ;
 * ici, on se contente de reporter ce que l'autre annonce, et d'appliquer le
 * verdict du serveur.
 *
 * Tout ce qui vient du réseau est vérifié avant d'être appliqué : un message
 * mal formé est simplement ignoré.
 */
import {
  finishMatch,
  makeEffect,
  type EndReason,
  type MatchEvent,
  type MatchState,
  type PendingAttack,
} from './matchCore';
import { POWERS, RULES, isAttack, type AttackId, type EffectId } from './powers';
import { CELLS } from './sudoku';

export type AttackOutcome = 'hit' | 'blocked' | 'reflected';

export type RemoteEvent =
  /** L'adversaire a trouvé un chiffre. */
  | { kind: 'placed'; cell: number }
  /** L'adversaire nous lance une attaque ; `ref` est son numéro chez lui. */
  | { kind: 'attack'; ref: number; power: AttackId }
  /** Résultat d'une de nos attaques, identifiée par son numéro chez nous. */
  | {
      kind: 'resolved';
      ref: number;
      outcome: AttackOutcome;
      cells: number[];
      boxes: number[];
      amount: number;
    }
  /** Effets actuellement actifs chez l'adversaire (pour l'affichage). */
  | { kind: 'status'; effects: EffectId[] }
  /** Verdict du serveur. */
  | { kind: 'over'; won: boolean; reason: EndReason };

const isCell = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < CELLS;

const KNOWN_EFFECTS: EffectId[] = ['freeze', 'glitch', 'blackout', 'shield', 'sonar', 'mirror', 'flip'];

export function applyRemote(state: MatchState, event: RemoteEvent, events: MatchEvent[]): void {
  const foe = state.opponent;
  if (!state.config.remote || !foe) return;
  if (state.status === 'won' || state.status === 'lost') return;
  const now = state.now;
  const { puzzle } = state.config;

  switch (event.kind) {
    case 'placed': {
      const cell = event.cell;
      if (!isCell(cell) || foe.values[cell] !== 0) return;
      foe.values[cell] = puzzle.solution[cell];
      foe.remaining -= 1;
      events.push({
        type: 'placed',
        side: 'opponent',
        cell,
        digit: puzzle.solution[cell],
        points: 0,
        combo: 0,
        revealed: false,
      });
      return;
    }

    case 'attack': {
      if (!(event.power in POWERS) || !isAttack(event.power)) return;
      const attack: PendingAttack = {
        id: state.nextId++,
        ref: typeof event.ref === 'number' ? event.ref : null,
        power: event.power,
        from: 'opponent',
        target: 'player',
        launchedAt: now,
        hitAt: now + RULES.attackTravelMs,
      };
      state.pending.push(attack);
      events.push({ type: 'attackLaunched', attack: { ...attack } });
      return;
    }

    case 'resolved': {
      const index = state.pending.findIndex(
        (candidate) => candidate.id === event.ref && candidate.target === 'opponent',
      );
      if (index < 0) return;
      const attack: PendingAttack = { ...state.pending[index] };
      state.pending.splice(index, 1);

      if (event.outcome === 'blocked') {
        events.push({ type: 'attackBlocked', attack });
        return;
      }
      if (event.outcome === 'reflected') {
        // L'attaque renvoyée arrivera comme une attaque ordinaire de l'adversaire.
        events.push({ type: 'attackReflected', attack });
        return;
      }

      const cells = (Array.isArray(event.cells) ? event.cells : []).filter(
        (cell) => isCell(cell) && puzzle.puzzle[cell] === 0 && foe.values[cell] !== 0,
      );
      for (const cell of cells) {
        foe.values[cell] = 0;
        foe.remaining += 1;
      }
      const boxes = (Array.isArray(event.boxes) ? event.boxes : []).filter(
        (box) => Number.isInteger(box) && box >= 0 && box < 9,
      );
      let amount = 0;
      if (attack.power === 'siphon' && typeof event.amount === 'number') {
        amount = Math.max(0, Math.min(RULES.siphonAmount, Math.floor(event.amount)));
        state.player.charge = Math.min(RULES.maxCharge, state.player.charge + amount);
      }
      events.push({ type: 'attackHit', attack, cells, boxes, amount });
      return;
    }

    case 'status': {
      const ids = (Array.isArray(event.effects) ? event.effects : []).filter((id) =>
        KNOWN_EFFECTS.includes(id),
      );
      // Ces effets ne servent qu'à l'affichage : c'est l'adversaire qui les
      // fait vivre et qui nous préviendra quand ils cessent.
      foe.effects = [...new Set(ids)].map((id) => makeEffect(id, now, Number.MAX_SAFE_INTEGER));
      return;
    }

    case 'over':
      finishMatch(state, event.won ? 'won' : 'lost', event.reason, events);
      return;
  }
}
