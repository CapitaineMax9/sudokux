/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 * Une même graine produit toujours la même suite : indispensable pour que deux
 * joueurs d'un duel reçoivent exactement la même grille, et pour les tests.
 */
export type Rng = () => number;

/** Avance l'état interne et renvoie [valeur dans [0, 1), nouvel état]. */
export function nextRandom(state: number): [number, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    const [value, next] = nextRandom(state);
    state = next;
    return value;
  };
}

/** Entier uniforme dans [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Nombre uniforme dans [min, max). */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Mélange de Fisher-Yates, en place. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[randInt(rng, items.length)];
}

/** Graine imprévisible pour les parties libres. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

/** Transforme un texte en graine stable (FNV-1a). */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
