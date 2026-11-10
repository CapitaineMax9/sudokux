import { mulberry32 } from '../rng';
import {
  CELLS,
  DIFFICULTY_SPECS,
  boxOf,
  candidatesOf,
  colOf,
  countEmpty,
  countSolutions,
  generatePuzzle,
  generateSolution,
  gradePuzzle,
  gridFromString,
  gridToString,
  isConsistent,
  isSolved,
  logicSolve,
  maskToDigits,
  rowOf,
  solve,
  topology,
  type Difficulty,
  type Variant,
} from '../sudoku';

const KNOWN_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const KNOWN_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('topologie', () => {
  it('décrit 27 unités et 20 voisins par case en mode classique', () => {
    const topo = topology('classic');
    expect(topo.units).toHaveLength(27);
    for (let cell = 0; cell < CELLS; cell++) {
      expect(topo.peers[cell]).toHaveLength(20);
      expect(topo.unitsOf[cell]).toHaveLength(3);
      expect(topo.peers[cell]).not.toContain(cell);
    }
  });

  it('ajoute les deux diagonales en variante X', () => {
    const topo = topology('x');
    expect(topo.units).toHaveLength(29);
    expect(topo.units.filter((u) => u.kind === 'diag')).toHaveLength(2);
    // La case centrale est sur les deux diagonales.
    expect(topo.unitsOf[40]).toHaveLength(5);
    // Une case hors diagonale garde ses 20 voisins.
    expect(topo.peers[1]).toHaveLength(20);
    // Un coin gagne les 6 cases de sa diagonale situées hors de son bloc.
    expect(topo.peers[0]).toHaveLength(26);
  });

  it('calcule ligne, colonne et bloc', () => {
    expect([rowOf(0), colOf(0), boxOf(0)]).toEqual([0, 0, 0]);
    expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
    expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
    expect([rowOf(33), colOf(33), boxOf(33)]).toEqual([3, 6, 5]);
  });
});

describe('solveur', () => {
  it('résout une grille connue', () => {
    expect(gridToString(solve(gridFromString(KNOWN_PUZZLE)) as number[])).toBe(KNOWN_SOLUTION);
  });

  it("ne modifie pas la grille d'entrée", () => {
    const grid = gridFromString(KNOWN_PUZZLE);
    const before = gridToString(grid);
    solve(grid);
    countSolutions(grid);
    logicSolve(grid);
    expect(gridToString(grid)).toBe(before);
  });

  it('compte les solutions', () => {
    expect(countSolutions(gridFromString(KNOWN_PUZZLE))).toBe(1);
    expect(countSolutions(new Array(CELLS).fill(0), 'classic', 2)).toBe(2);
    expect(countSolutions(new Array(CELLS).fill(0), 'classic', 5)).toBe(5);
  });

  it('rejette une grille contradictoire', () => {
    const grid = gridFromString(KNOWN_PUZZLE);
    grid[1] = 5; // deux 5 sur la première ligne
    expect(countSolutions(grid)).toBe(0);
    expect(solve(grid)).toBeNull();
  });

  it('calcule les candidats et la cohérence', () => {
    const grid = gridFromString(KNOWN_PUZZLE);
    // Case (0,2) : la solution est 4.
    expect(maskToDigits(candidatesOf(grid, 2))).toEqual([1, 2, 4]);
    expect(isConsistent(grid, 2, 4)).toBe(true);
    expect(isConsistent(grid, 2, 5)).toBe(false);
  });

  it('valide une grille terminée', () => {
    expect(isSolved(gridFromString(KNOWN_SOLUTION))).toBe(true);
    expect(isSolved(gridFromString(KNOWN_PUZZLE))).toBe(false);
    const wrong = gridFromString(KNOWN_SOLUTION);
    [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
    expect(isSolved(wrong)).toBe(false);
  });
});

describe('solveur humain', () => {
  it('résout une grille facile et donne un ordre complet', () => {
    const grid = gridFromString(KNOWN_PUZZLE);
    const result = logicSolve(grid);
    expect(result.solved).toBe(true);
    expect(gridToString(result.grid)).toBe(KNOWN_SOLUTION);
    expect(result.order).toHaveLength(countEmpty(grid));
    expect(new Set(result.order).size).toBe(result.order.length);
    for (const cell of result.order) expect(grid[cell]).toBe(0);
  });

  it('ne trouve jamais un chiffre faux', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const p = generatePuzzle({ seed, difficulty: 'expert' });
      const result = logicSolve(p.puzzle);
      for (let i = 0; i < CELLS; i++) {
        if (result.grid[i] !== 0) expect(result.grid[i]).toBe(p.solution[i]);
      }
    }
  });
});

describe('générateur', () => {
  const variants: Variant[] = ['classic', 'x'];
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

  it.each(variants)('produit des grilles complètes valides (%s)', (variant) => {
    for (let seed = 1; seed <= 20; seed++) {
      const grid = generateSolution(mulberry32(seed), variant);
      expect(isSolved(grid, variant)).toBe(true);
    }
  });

  it('est déterministe', () => {
    const a = generatePuzzle({ seed: 4242, difficulty: 'hard' });
    const b = generatePuzzle({ seed: 4242, difficulty: 'hard' });
    const c = generatePuzzle({ seed: 4243, difficulty: 'hard' });
    expect(gridToString(a.puzzle)).toBe(gridToString(b.puzzle));
    expect(gridToString(a.solution)).toBe(gridToString(b.solution));
    expect(gridToString(a.puzzle)).not.toBe(gridToString(c.puzzle));
  });

  for (const variant of variants) {
    for (const difficulty of difficulties) {
      it(`génère des grilles ${difficulty} à solution unique (${variant})`, () => {
        for (let seed = 100; seed < 112; seed++) {
          const p = generatePuzzle({ seed, difficulty, variant });
          expect(countSolutions(p.puzzle, variant, 2)).toBe(1);
          expect(isSolved(p.solution, variant)).toBe(true);
          expect(gridToString(solve(p.puzzle, variant) as number[])).toBe(
            gridToString(p.solution),
          );
          // Les chiffres donnés viennent de la solution.
          for (let i = 0; i < CELLS; i++) {
            if (p.puzzle[i] !== 0) expect(p.puzzle[i]).toBe(p.solution[i]);
          }
          // Le niveau de technique correspond à la difficulté demandée.
          expect(p.level).toBe(DIFFICULTY_SPECS[difficulty].level);
          expect(gradePuzzle(p.puzzle, variant)).toBe(p.level);
          expect(p.clues).toBe(CELLS - countEmpty(p.puzzle));
          // Dessin symétrique par rotation de 180°.
          for (let i = 0; i < CELLS; i++) {
            expect(p.puzzle[i] === 0).toBe(p.puzzle[CELLS - 1 - i] === 0);
          }
        }
      });
    }
  }

  it('donne plus de chiffres au départ en facile qu’en expert', () => {
    const easy = generatePuzzle({ seed: 7, difficulty: 'easy' });
    const expert = generatePuzzle({ seed: 7, difficulty: 'expert' });
    expect(easy.clues).toBeGreaterThan(expert.clues);
  });

  it('respecte un nombre de chiffres imposé', () => {
    const p = generatePuzzle({ seed: 9, difficulty: 'easy', clues: 46 });
    expect(p.clues).toBeGreaterThanOrEqual(45);
    expect(p.clues).toBeLessThanOrEqual(46);
  });
});

describe('texte', () => {
  it('convertit dans les deux sens', () => {
    expect(gridToString(gridFromString(KNOWN_PUZZLE))).toBe(
      KNOWN_PUZZLE.replace(/0/g, '.'),
    );
    expect(() => gridFromString('123')).toThrow();
  });
});
