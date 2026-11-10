/**
 * Petits accès à l'état de la partie pour les composants.
 *
 * Chaque sélecteur renvoie une valeur simple (nombre, booléen, texte) : un
 * composant ne se redessine donc que si SA valeur change, pas à chaque tic
 * d'horloge.
 */
import type { EffectId, PowerId } from '@/engine/powers';
import { CELLS, topology, type Variant } from '@/engine/sudoku';
import type { MatchState, Side, SideState } from '@/engine/match';
import { useMatchStore } from '@/store/match';

export function useMatch<T>(selector: (match: MatchState) => T, fallback: T): T {
  return useMatchStore((store) => (store.match ? selector(store.match) : fallback));
}

const sideState = (match: MatchState, side: Side): SideState | null =>
  side === 'player' ? match.player : match.opponent;

/** Instant de fin d'un effet actif, ou 0 s'il n'est pas actif. */
export function useEffectUntil(side: Side, id: EffectId): number {
  return useMatch((match) => {
    const effect = sideState(match, side)?.effects.find((e) => e.id === id);
    return effect ? effect.until : 0;
  }, 0);
}

export function useHasEffect(side: Side, id: EffectId): boolean {
  return useEffectUntil(side, id) > 0;
}

/** Blocs masqués par un blackout, sous forme de masque de 9 bits. */
export function useHiddenBoxes(side: Side): number {
  return useMatch((match) => {
    const effect = sideState(match, side)?.effects.find((e) => e.id === 'blackout');
    if (!effect) return 0;
    let mask = 0;
    for (const box of effect.boxes) mask |= 1 << box;
    return mask;
  }, 0);
}

/** Graine du brouillage en cours, ou 0. */
export function useGlitchSeed(side: Side): number {
  return useMatch((match) => {
    const effect = sideState(match, side)?.effects.find((e) => e.id === 'glitch');
    return effect ? effect.seed || 1 : 0;
  }, 0);
}

export function useCharge(side: Side): number {
  return useMatch((match) => sideState(match, side)?.charge ?? 0, 0);
}

export function usePowers(): PowerId[] {
  // La liste appartient à la configuration : sa référence ne change pas en cours de partie.
  return useMatch((match) => match.config.powers, EMPTY_POWERS);
}
const EMPTY_POWERS: PowerId[] = [];

/** Secondes écoulées (ne change qu'une fois par seconde). */
export function useElapsedSeconds(): number {
  return useMatch((match) => Math.floor(match.now / 1000), 0);
}

/* ---------------- Surbrillance des cases ---------------- */

const peerTables: Partial<Record<Variant, Uint8Array[]>> = {};

function peerTable(variant: Variant): Uint8Array[] {
  let table = peerTables[variant];
  if (!table) {
    const { peers } = topology(variant);
    table = peers.map((list) => {
      const flags = new Uint8Array(CELLS);
      for (const peer of list) flags[peer] = 1;
      return flags;
    });
    peerTables[variant] = table;
  }
  return table;
}

export const HL_NONE = 0;
export const HL_PEER = 1;
export const HL_SAME = 2;
export const HL_SELECTED = 3;

/** Comment une case doit être mise en valeur par rapport à la case sélectionnée. */
export function highlightOf(match: MatchState, cell: number): number {
  const selected = match.selected;
  if (selected === null) return HL_NONE;
  if (selected === cell) return HL_SELECTED;
  const mine = match.player.values[cell];
  const theirs = match.player.values[selected];
  if (theirs !== 0 && mine === theirs) return HL_SAME;
  return peerTable(match.config.puzzle.variant)[selected][cell] ? HL_PEER : HL_NONE;
}

/** Chiffre de la case sélectionnée (0 si aucune ou vide) : sert à souligner les notes. */
export function useSelectedDigit(): number {
  return useMatch(
    (match) => (match.selected === null ? 0 : match.player.values[match.selected]),
    0,
  );
}

/** Nombre de cases restantes pour chaque chiffre, codé en texte de 9 caractères. */
export function useDigitsLeft(): string {
  return useMatch((match) => {
    const left = [9, 9, 9, 9, 9, 9, 9, 9, 9];
    const values = match.player.values;
    for (let i = 0; i < CELLS; i++) if (values[i] !== 0) left[values[i] - 1] -= 1;
    return left.join('');
  }, '999999999');
}
