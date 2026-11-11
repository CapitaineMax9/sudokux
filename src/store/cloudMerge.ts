/**
 * Fusion de deux sauvegardes (celle de l'appareil et celle du cloud).
 *
 * On ne choisit pas « la plus récente » : on garde le meilleur des deux,
 * élément par élément (plus d'étoiles, meilleur temps, pouvoirs réunis…).
 * Ainsi, jouer sur deux appareils ne fait jamais rien perdre, et fusionner
 * deux fois de suite ne change plus rien.
 */
import { POWER_ORDER, type PowerId } from '@/engine/powers';

export interface LevelRecord {
  stars: number;
  bestTimeMs: number | null;
  bestScore: number;
}

export interface FreeRecord {
  wins: number;
  bestTimeMs: number | null;
}

export interface DuelRecord {
  wins: number;
  losses: number;
}

/** La partie de la progression qui suit le joueur d'un appareil à l'autre. */
export interface SyncedProgress {
  xp: number;
  levels: Record<string, LevelRecord>;
  powers: PowerId[];
  loadout: PowerId[];
  soloLoadout: PowerId[];
  free: Record<string, FreeRecord>;
  duels: Record<string, DuelRecord>;
}

export const SYNCED_KEYS: (keyof SyncedProgress)[] = [
  'xp',
  'levels',
  'powers',
  'loadout',
  'soloLoadout',
  'free',
  'duels',
];

export function pickSynced(source: SyncedProgress): SyncedProgress {
  return {
    xp: source.xp,
    levels: source.levels,
    powers: source.powers,
    loadout: source.loadout,
    soloLoadout: source.soloLoadout,
    free: source.free,
    duels: source.duels,
  };
}

const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const bestTime = (a: number | null | undefined, b: number | null | undefined) => {
  const values = [a, b].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return values.length ? Math.min(...values) : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const powerList = (value: unknown): PowerId[] =>
  Array.isArray(value) ? POWER_ORDER.filter((power) => value.includes(power)) : [];

/** Transforme des données venues du réseau en sauvegarde propre (champs inconnus ignorés). */
export function sanitize(raw: unknown): SyncedProgress {
  const data = isRecord(raw) ? raw : {};
  const levels: Record<string, LevelRecord> = {};
  if (isRecord(data.levels)) {
    for (const [id, entry] of Object.entries(data.levels)) {
      if (!isRecord(entry)) continue;
      levels[id] = {
        stars: Math.max(0, Math.min(3, Math.floor(num(entry.stars)))),
        bestTimeMs: bestTime(entry.bestTimeMs as number | null, null),
        bestScore: Math.max(0, num(entry.bestScore)),
      };
    }
  }
  const free: Record<string, FreeRecord> = {};
  if (isRecord(data.free)) {
    for (const [id, entry] of Object.entries(data.free)) {
      if (!isRecord(entry)) continue;
      free[id] = { wins: Math.max(0, num(entry.wins)), bestTimeMs: bestTime(entry.bestTimeMs as number | null, null) };
    }
  }
  const duels: Record<string, DuelRecord> = {};
  if (isRecord(data.duels)) {
    for (const [id, entry] of Object.entries(data.duels)) {
      if (!isRecord(entry)) continue;
      duels[id] = { wins: Math.max(0, num(entry.wins)), losses: Math.max(0, num(entry.losses)) };
    }
  }
  return {
    xp: Math.max(0, num(data.xp)),
    levels,
    powers: powerList(data.powers),
    loadout: powerList(data.loadout),
    soloLoadout: powerList(data.soloLoadout),
    free,
    duels,
  };
}

function mergeMap<T>(
  a: Record<string, T>,
  b: Record<string, T>,
  merge: (x: T, y: T) => T,
): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [id, value] of Object.entries(b)) out[id] = id in out ? merge(out[id], value) : value;
  return out;
}

/** Garde le meilleur des deux sauvegardes. `local` l'emporte pour les choix d'équipement. */
export function mergeProgress(local: SyncedProgress, remote: SyncedProgress): SyncedProgress {
  const powers = POWER_ORDER.filter((p) => local.powers.includes(p) || remote.powers.includes(p));
  return {
    xp: Math.max(local.xp, remote.xp),
    levels: mergeMap(local.levels, remote.levels, (x, y) => ({
      stars: Math.max(x.stars, y.stars),
      bestTimeMs: bestTime(x.bestTimeMs, y.bestTimeMs),
      bestScore: Math.max(x.bestScore, y.bestScore),
    })),
    powers,
    loadout: local.loadout.length > 0 ? local.loadout : remote.loadout,
    soloLoadout: local.soloLoadout.length > 0 ? local.soloLoadout : remote.soloLoadout,
    free: mergeMap(local.free, remote.free, (x, y) => ({
      wins: Math.max(x.wins, y.wins),
      bestTimeMs: bestTime(x.bestTimeMs, y.bestTimeMs),
    })),
    duels: mergeMap(local.duels, remote.duels, (x, y) => ({
      wins: Math.max(x.wins, y.wins),
      losses: Math.max(x.losses, y.losses),
    })),
  };
}

/** Comparaison stable (les clés sont triées) pour savoir s'il faut écrire. */
export function sameProgress(a: SyncedProgress, b: SyncedProgress): boolean {
  const stable = (value: unknown): string =>
    JSON.stringify(value, (_key, inner) =>
      isRecord(inner) ? Object.fromEntries(Object.entries(inner).sort(([x], [y]) => x.localeCompare(y))) : inner,
    );
  return stable(a) === stable(b);
}
