/**
 * Moteur de sudoku : topologie, solveur, solveur « humain » (pour noter la
 * difficulté) et générateur de grilles à solution unique.
 *
 * Aucune dépendance à React : tout est pur et testable.
 *
 * Une grille est un tableau de 81 nombres (0 = case vide), lu ligne par ligne.
 * Les candidats d'une case sont stockés dans un masque de 9 bits
 * (bit 0 = chiffre 1 … bit 8 = chiffre 9).
 */
import { mulberry32, shuffle, type Rng } from './rng';

/** `classic` = règles normales. `x` = les deux diagonales comptent aussi. */
export type Variant = 'classic' | 'x';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Grid = number[];

export const CELLS = 81;
const ALL = 0x1ff;

export const rowOf = (cell: number) => Math.floor(cell / 9);
export const colOf = (cell: number) => cell % 9;
export const boxOf = (cell: number) => Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3);
export const isOnDiagonal = (cell: number) =>
  rowOf(cell) === colOf(cell) || rowOf(cell) + colOf(cell) === 8;

const bit = (digit: number) => 1 << (digit - 1);

const POPCOUNT = new Uint8Array(512);
for (let i = 1; i < 512; i++) POPCOUNT[i] = POPCOUNT[i >> 1] + (i & 1);

export const countBits = (mask: number) => POPCOUNT[mask & ALL];

export function maskToDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & bit(d)) digits.push(d);
  return digits;
}

/* ------------------------------------------------------------------ */
/* Topologie : unités (lignes, colonnes, blocs, diagonales) et voisins */
/* ------------------------------------------------------------------ */

export type UnitKind = 'row' | 'col' | 'box' | 'diag';

export interface Unit {
  kind: UnitKind;
  index: number;
  cells: number[];
}

export interface Topology {
  variant: Variant;
  units: Unit[];
  /** Pour chaque case : indices (dans `units`) des unités qui la contiennent. */
  unitsOf: number[][];
  /** Pour chaque case : les autres cases qui partagent au moins une unité. */
  peers: number[][];
}

function buildTopology(variant: Variant): Topology {
  const units: Unit[] = [];
  const nine = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  for (const r of nine) units.push({ kind: 'row', index: r, cells: nine.map((c) => r * 9 + c) });
  for (const c of nine) units.push({ kind: 'col', index: c, cells: nine.map((r) => r * 9 + c) });
  for (const b of nine) {
    const r0 = Math.floor(b / 3) * 3;
    const c0 = (b % 3) * 3;
    const cells: number[] = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) cells.push((r0 + dr) * 9 + c0 + dc);
    units.push({ kind: 'box', index: b, cells });
  }
  if (variant === 'x') {
    units.push({ kind: 'diag', index: 0, cells: nine.map((k) => k * 9 + k) });
    units.push({ kind: 'diag', index: 1, cells: nine.map((k) => k * 9 + (8 - k)) });
  }

  const unitsOf: number[][] = Array.from({ length: CELLS }, () => []);
  units.forEach((unit, ui) => unit.cells.forEach((cell) => unitsOf[cell].push(ui)));

  const peers = unitsOf.map((mine, cell) => {
    const set = new Set<number>();
    for (const ui of mine) for (const other of units[ui].cells) if (other !== cell) set.add(other);
    return [...set].sort((a, b) => a - b);
  });

  return { variant, units, unitsOf, peers };
}

const topologyCache: Partial<Record<Variant, Topology>> = {};

export function topology(variant: Variant = 'classic'): Topology {
  let topo = topologyCache[variant];
  if (!topo) {
    topo = buildTopology(variant);
    topologyCache[variant] = topo;
  }
  return topo;
}

/* ------------------------------------------------------------------ */
/* Outils de base                                                      */
/* ------------------------------------------------------------------ */

export function countEmpty(grid: Grid): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (grid[i] === 0) n++;
  return n;
}

/** Masque des chiffres encore possibles dans `cell` d'après ses voisins. */
export function candidatesOf(grid: Grid, cell: number, variant: Variant = 'classic'): number {
  let used = 0;
  for (const peer of topology(variant).peers[cell]) {
    const d = grid[peer];
    if (d) used |= bit(d);
  }
  return ALL & ~used;
}

/** Vrai si poser `digit` dans `cell` ne contredit aucun voisin déjà rempli. */
export function isConsistent(
  grid: Grid,
  cell: number,
  digit: number,
  variant: Variant = 'classic',
): boolean {
  return (candidatesOf(grid, cell, variant) & bit(digit)) !== 0;
}

/** Vrai si la grille est entièrement remplie et respecte toutes les règles. */
export function isSolved(grid: Grid, variant: Variant = 'classic'): boolean {
  for (const unit of topology(variant).units) {
    let seen = 0;
    for (const cell of unit.cells) {
      const d = grid[cell];
      if (!d) return false;
      seen |= bit(d);
    }
    if (seen !== ALL) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Solveur par retour arrière (rapide, sert à compter les solutions)   */
/* ------------------------------------------------------------------ */

function search(
  grid: Grid,
  topo: Topology,
  limit: number,
  rng: Rng | null,
  out: Grid | null,
): number {
  const { units, unitsOf } = topo;
  const used = new Array<number>(units.length).fill(0);

  for (let i = 0; i < CELLS; i++) {
    const d = grid[i];
    if (!d) continue;
    const b = bit(d);
    for (const u of unitsOf[i]) {
      if (used[u] & b) return 0; // deux fois le même chiffre dans une unité
      used[u] |= b;
    }
  }

  let found = 0;

  const recurse = (): void => {
    // Heuristique : on attaque toujours la case qui a le moins de candidats.
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < CELLS; i++) {
      if (grid[i] !== 0) continue;
      let taken = 0;
      const mine = unitsOf[i];
      for (let k = 0; k < mine.length; k++) taken |= used[mine[k]];
      const mask = ALL & ~taken;
      const count = POPCOUNT[mask];
      if (count === 0) return;
      if (count < bestCount) {
        best = i;
        bestMask = mask;
        bestCount = count;
        if (count === 1) break;
      }
    }

    if (best === -1) {
      found++;
      if (out && found === 1) for (let i = 0; i < CELLS; i++) out[i] = grid[i];
      return;
    }

    const digits = maskToDigits(bestMask);
    if (rng) shuffle(digits, rng);
    const mine = unitsOf[best];
    for (const d of digits) {
      const b = bit(d);
      grid[best] = d;
      for (const u of mine) used[u] |= b;
      recurse();
      grid[best] = 0;
      for (const u of mine) used[u] &= ~b;
      if (found >= limit) return;
    }
  };

  recurse();
  return found;
}

/** Compte les solutions, en s'arrêtant à `limit` (2 suffit pour tester l'unicité). */
export function countSolutions(grid: Grid, variant: Variant = 'classic', limit = 2): number {
  return search(grid.slice(), topology(variant), limit, null, null);
}

export function solve(grid: Grid, variant: Variant = 'classic'): Grid | null {
  const out = new Array<number>(CELLS).fill(0);
  return search(grid.slice(), topology(variant), 1, null, out) > 0 ? out : null;
}

/** Fabrique une grille complète aléatoire et valide. */
export function generateSolution(rng: Rng, variant: Variant = 'classic'): Grid {
  const out = new Array<number>(CELLS).fill(0);
  search(new Array<number>(CELLS).fill(0), topology(variant), 1, rng, out);
  return out;
}

/* ------------------------------------------------------------------ */
/* Solveur « humain » : il n'utilise que des techniques de déduction   */
/* ------------------------------------------------------------------ */

/**
 * Niveau de technique nécessaire :
 * 1 = candidats uniques seulement, 2 = paires et candidats verrouillés,
 * 3 = au-delà (techniques avancées).
 */
export type TechniqueLevel = 1 | 2 | 3;

export interface LogicResult {
  solved: boolean;
  grid: Grid;
  /** Plus haut niveau de technique réellement utilisé. */
  level: 1 | 2;
  /** Cases remplies, dans l'ordre où un humain les trouverait. */
  order: number[];
}

export function logicSolve(
  puzzle: Grid,
  variant: Variant = 'classic',
  maxLevel: 1 | 2 = 2,
): LogicResult {
  const { units, unitsOf, peers } = topology(variant);
  const grid = puzzle.slice();
  const cand = new Array<number>(CELLS).fill(0);
  const order: number[] = [];
  let remaining = 0;
  let level: 1 | 2 = 1;
  let broken = false;

  for (let i = 0; i < CELLS; i++) {
    if (grid[i] !== 0) continue;
    remaining++;
    let taken = 0;
    for (const p of peers[i]) if (grid[p]) taken |= bit(grid[p]);
    cand[i] = ALL & ~taken;
  }

  const place = (cell: number, digit: number) => {
    grid[cell] = digit;
    cand[cell] = 0;
    remaining--;
    order.push(cell);
    const b = bit(digit);
    for (const p of peers[cell]) cand[p] &= ~b;
  };

  /** Un chiffre confiné à l'intersection de deux unités est exclu du reste. */
  const eliminateLocked = (): boolean => {
    let changed = false;
    for (let ui = 0; ui < units.length; ui++) {
      const cells = units[ui].cells;
      for (let d = 1; d <= 9; d++) {
        const b = bit(d);
        const spots: number[] = [];
        let placed = false;
        for (const c of cells) {
          if (grid[c] === d) {
            placed = true;
            break;
          }
          if (grid[c] === 0 && cand[c] & b) spots.push(c);
        }
        if (placed || spots.length < 2 || spots.length > 3) continue;
        for (const vi of unitsOf[spots[0]]) {
          if (vi === ui) continue;
          let shared = true;
          for (let k = 1; k < spots.length; k++) {
            if (!unitsOf[spots[k]].includes(vi)) {
              shared = false;
              break;
            }
          }
          if (!shared) continue;
          for (const c of units[vi].cells) {
            if (grid[c] === 0 && cand[c] & b && !spots.includes(c)) {
              cand[c] &= ~b;
              changed = true;
            }
          }
        }
      }
    }
    return changed;
  };

  /** Paires nues et paires cachées. */
  const eliminatePairs = (): boolean => {
    let changed = false;
    for (const unit of units) {
      const cells = unit.cells;

      for (let a = 0; a < 9; a++) {
        const ca = cells[a];
        if (grid[ca] !== 0 || POPCOUNT[cand[ca]] !== 2) continue;
        for (let k = a + 1; k < 9; k++) {
          const cb = cells[k];
          if (grid[cb] !== 0 || cand[cb] !== cand[ca]) continue;
          const pair = cand[ca];
          for (const c of cells) {
            if (c !== ca && c !== cb && grid[c] === 0 && cand[c] & pair) {
              cand[c] &= ~pair;
              changed = true;
            }
          }
        }
      }

      // positions[d] = masque des emplacements (0..8) où d est encore possible
      const positions = new Array<number>(10).fill(0);
      for (let k = 0; k < 9; k++) {
        const c = cells[k];
        if (grid[c] !== 0) continue;
        for (let d = 1; d <= 9; d++) if (cand[c] & bit(d)) positions[d] |= 1 << k;
      }
      for (let d1 = 1; d1 <= 8; d1++) {
        if (POPCOUNT[positions[d1]] !== 2) continue;
        for (let d2 = d1 + 1; d2 <= 9; d2++) {
          if (positions[d2] !== positions[d1]) continue;
          const keep = bit(d1) | bit(d2);
          for (let k = 0; k < 9; k++) {
            if (!(positions[d1] & (1 << k))) continue;
            const c = cells[k];
            if (cand[c] & ~keep) {
              cand[c] &= keep;
              changed = true;
            }
          }
        }
      }
    }
    return changed;
  };

  while (remaining > 0 && !broken) {
    let progressed = false;

    // Candidat unique : une case n'accepte plus qu'un seul chiffre.
    for (let i = 0; i < CELLS; i++) {
      if (grid[i] !== 0) continue;
      const mask = cand[i];
      if (mask === 0) {
        broken = true;
        break;
      }
      if (POPCOUNT[mask] === 1) {
        place(i, maskToDigits(mask)[0]);
        progressed = true;
      }
    }
    if (broken) break;
    if (progressed) continue;

    // Candidat caché : dans une unité, un chiffre n'a plus qu'une case possible.
    for (const unit of units) {
      for (let d = 1; d <= 9; d++) {
        const b = bit(d);
        let spot = -1;
        let n = 0;
        for (const c of unit.cells) {
          if (grid[c] === d) {
            n = -1;
            break;
          }
          if (grid[c] === 0 && cand[c] & b) {
            n++;
            spot = c;
            if (n > 1) break;
          }
        }
        if (n === 1) {
          place(spot, d);
          progressed = true;
        }
      }
    }
    if (progressed) continue;

    if (maxLevel < 2) break;
    const locked = eliminateLocked();
    const pairs = eliminatePairs();
    if (locked || pairs) {
      level = 2;
      continue;
    }
    break;
  }

  return { solved: remaining === 0 && !broken, grid, level, order };
}

/**
 * Cases que l'on peut remplir tout de suite par simple déduction : celles qui
 * n'acceptent plus qu'un chiffre, et celles qui sont le seul endroit possible
 * pour un chiffre dans une ligne, une colonne ou un bloc.
 */
export function obviousCells(grid: Grid, variant: Variant = 'classic'): number[] {
  const { units } = topology(variant);
  const found = new Set<number>();
  const cand = new Array<number>(CELLS).fill(0);

  for (let i = 0; i < CELLS; i++) {
    if (grid[i] !== 0) continue;
    cand[i] = candidatesOf(grid, i, variant);
    if (POPCOUNT[cand[i]] === 1) found.add(i);
  }
  for (const unit of units) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      let spot = -1;
      let n = 0;
      for (const c of unit.cells) {
        if (grid[c] === d) {
          n = -1;
          break;
        }
        if (grid[c] === 0 && cand[c] & b) {
          n++;
          spot = c;
          if (n > 1) break;
        }
      }
      if (n === 1) found.add(spot);
    }
  }
  return [...found].sort((a, b) => a - b);
}

export function gradePuzzle(puzzle: Grid, variant: Variant = 'classic'): TechniqueLevel {
  const result = logicSolve(puzzle, variant, 2);
  return result.solved ? result.level : 3;
}

/* ------------------------------------------------------------------ */
/* Générateur                                                          */
/* ------------------------------------------------------------------ */

export interface Puzzle {
  /** Grille de départ (0 = case à remplir). */
  puzzle: Grid;
  solution: Grid;
  variant: Variant;
  difficulty: Difficulty;
  seed: number;
  /** Nombre de chiffres donnés au départ. */
  clues: number;
  /** Niveau de technique réellement requis. */
  level: TechniqueLevel;
}

export interface GenerateOptions {
  seed: number;
  difficulty: Difficulty;
  variant?: Variant;
  /** Force le nombre de chiffres donnés (sinon : valeur de la difficulté). */
  clues?: number;
}

interface DifficultySpec {
  clues: number;
  level: TechniqueLevel;
}

export const DIFFICULTY_SPECS: Record<Difficulty, DifficultySpec> = {
  easy: { clues: 42, level: 1 },
  medium: { clues: 34, level: 1 },
  hard: { clues: 28, level: 2 },
  expert: { clues: 24, level: 3 },
};

const MAX_ATTEMPTS = 60;

/**
 * Retire des chiffres d'une grille complète tant qu'elle reste résoluble au
 * niveau demandé. Les cases sont retirées par paires symétriques (rotation de
 * 180°) pour donner aux grilles un dessin équilibré.
 */
function dig(
  solution: Grid,
  variant: Variant,
  level: TechniqueLevel,
  targetClues: number,
  rng: Rng,
): Grid {
  const puzzle = solution.slice();
  const order = shuffle(Array.from({ length: CELLS }, (_, i) => i), rng);
  const tried = new Array<boolean>(CELLS).fill(false);
  let clues = CELLS;

  const stillFine = () =>
    level === 3
      ? countSolutions(puzzle, variant, 2) === 1
      : logicSolve(puzzle, variant, level).solved;

  for (const cell of order) {
    if (clues <= targetClues) break;
    if (tried[cell]) continue;
    const twin = CELLS - 1 - cell;
    tried[cell] = true;
    tried[twin] = true;

    const a = puzzle[cell];
    const b = puzzle[twin];
    puzzle[cell] = 0;
    puzzle[twin] = 0;
    if (stillFine()) {
      clues -= cell === twin ? 1 : 2;
    } else {
      puzzle[cell] = a;
      puzzle[twin] = b;
    }
  }
  return puzzle;
}

/**
 * Génère une grille à solution unique. Déterministe : mêmes options, même
 * grille. Si le niveau de technique visé n'est pas atteint après plusieurs
 * essais, la grille la plus proche est renvoyée.
 */
export function generatePuzzle(options: GenerateOptions): Puzzle {
  const variant = options.variant ?? 'classic';
  const spec = DIFFICULTY_SPECS[options.difficulty];
  const target = options.clues ?? spec.clues;
  let fallback: Puzzle | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = mulberry32((options.seed + Math.imul(attempt, 0x9e3779b1)) >>> 0);
    const solution = generateSolution(rng, variant);
    const puzzle = dig(solution, variant, spec.level, target, rng);
    const level = gradePuzzle(puzzle, variant);
    const candidate: Puzzle = {
      puzzle,
      solution,
      variant,
      difficulty: options.difficulty,
      seed: options.seed,
      clues: CELLS - countEmpty(puzzle),
      level,
    };
    if (level === spec.level) return candidate;
    if (!fallback || Math.abs(level - spec.level) < Math.abs(fallback.level - spec.level)) {
      fallback = candidate;
    }
  }
  return fallback as Puzzle;
}

/** Représentation texte d'une grille (pratique pour les tests et le débogage). */
export function gridToString(grid: Grid): string {
  return grid.map((d) => (d === 0 ? '.' : String(d))).join('');
}

export function gridFromString(text: string): Grid {
  const cleaned = text.replace(/\s+/g, '');
  if (cleaned.length !== CELLS) throw new Error(`Grille invalide : ${cleaned.length} caractères`);
  return Array.from(cleaned, (ch) => (ch >= '1' && ch <= '9' ? Number(ch) : 0));
}
