import { mergeProgress, sameProgress, sanitize, type SyncedProgress } from '../cloudMerge';

const empty: SyncedProgress = { xp: 0, levels: {}, powers: [], loadout: [], soloLoadout: [], free: {}, duels: {} };

const phone: SyncedProgress = {
  xp: 900,
  levels: {
    c1m1: { stars: 3, bestTimeMs: 90_000, bestScore: 5000 },
    c1m2: { stars: 1, bestTimeMs: 400_000, bestScore: 2000 },
  },
  powers: ['scan', 'analyse'],
  loadout: ['scan'],
  soloLoadout: [],
  free: { 'easy:classic': { wins: 4, bestTimeMs: 200_000 } },
  duels: { pixel: { wins: 2, losses: 1 } },
};

const tablet: SyncedProgress = {
  xp: 600,
  levels: {
    c1m2: { stars: 2, bestTimeMs: 500_000, bestScore: 2500 },
    c1m3: { stars: 3, bestTimeMs: 300_000, bestScore: 4000 },
  },
  powers: ['shield', 'scan'],
  loadout: ['shield'],
  soloLoadout: ['shield'],
  free: { 'easy:classic': { wins: 1, bestTimeMs: 150_000 }, 'hard:x': { wins: 1, bestTimeMs: null } },
  duels: { pixel: { wins: 1, losses: 3 }, online: { wins: 5, losses: 0 } },
};

describe('fusion des sauvegardes', () => {
  it('garde le meilleur de chaque côté', () => {
    const merged = mergeProgress(phone, tablet);
    expect(merged.xp).toBe(900);
    expect(merged.levels).toEqual({
      c1m1: { stars: 3, bestTimeMs: 90_000, bestScore: 5000 },
      c1m2: { stars: 2, bestTimeMs: 400_000, bestScore: 2500 },
      c1m3: { stars: 3, bestTimeMs: 300_000, bestScore: 4000 },
    });
    expect(merged.powers).toEqual(['scan', 'analyse', 'shield']);
    expect(merged.free['easy:classic']).toEqual({ wins: 4, bestTimeMs: 150_000 });
    expect(merged.free['hard:x']).toEqual({ wins: 1, bestTimeMs: null });
    expect(merged.duels).toEqual({ pixel: { wins: 2, losses: 3 }, online: { wins: 5, losses: 0 } });
  });

  it("garde l'équipement de l'appareil, sauf s'il est vide", () => {
    const merged = mergeProgress(phone, tablet);
    expect(merged.loadout).toEqual(['scan']);
    expect(merged.soloLoadout).toEqual(['shield']);
  });

  it('ne change plus rien quand on refusionne', () => {
    const once = mergeProgress(phone, tablet);
    expect(sameProgress(mergeProgress(once, tablet), once)).toBe(true);
    expect(sameProgress(mergeProgress(once, phone), once)).toBe(true);
    expect(sameProgress(mergeProgress(once, empty), once)).toBe(true);
  });

  it('donne le même résultat dans les deux sens (hors équipement)', () => {
    const a = { ...mergeProgress(phone, tablet), loadout: [], soloLoadout: [] };
    const b = { ...mergeProgress(tablet, phone), loadout: [], soloLoadout: [] };
    expect(sameProgress(a, b)).toBe(true);
  });

  it('compare sans tenir compte de l’ordre des clés', () => {
    const reordered = { ...phone, levels: { c1m2: phone.levels.c1m2, c1m1: phone.levels.c1m1 } };
    expect(sameProgress(reordered, phone)).toBe(true);
    expect(sameProgress(phone, tablet)).toBe(false);
  });
});

describe('nettoyage des données reçues', () => {
  it('accepte une sauvegarde valide telle quelle', () => {
    expect(sanitize(JSON.parse(JSON.stringify(phone)))).toEqual(phone);
  });

  it('écarte ce qui est invalide ou inconnu', () => {
    const dirty = sanitize({
      xp: -50,
      levels: { c1m1: { stars: 9, bestTimeMs: 'vite', bestScore: 10 }, bad: 'x' },
      powers: ['scan', 'superpouvoir', 'shield'],
      loadout: 'scan',
      free: { a: { wins: 2, bestTimeMs: 1000 }, b: null },
      duels: { x: { wins: 'beaucoup', losses: 1 } },
      pirate: true,
    });
    expect(dirty).toEqual({
      xp: 0,
      levels: { c1m1: { stars: 3, bestTimeMs: null, bestScore: 10 } },
      powers: ['scan', 'shield'],
      loadout: [],
      soloLoadout: [],
      free: { a: { wins: 2, bestTimeMs: 1000 } },
      duels: { x: { wins: 0, losses: 1 } },
    });
    expect(sanitize(null)).toEqual(empty);
    expect(sanitize('n’importe quoi')).toEqual(empty);
  });
});
