/**
 * Progression du joueur, sauvegardée sur l'appareil : missions terminées,
 * pouvoirs débloqués, équipement de duel, expérience et réglages.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ALL_LEVELS, getLevel, previousLevelId } from '@/content/story';
import type { MatchSummary } from '@/engine/match';
import { LOADOUT_SIZE, POWERS, POWER_ORDER, type PowerId } from '@/engine/powers';
import { soloPowers } from '@/game/setup';
import type { Lang } from '@/i18n/strings';

import type { DuelRecord, FreeRecord, LevelRecord, SyncedProgress } from './cloudMerge';

export type { DuelRecord, FreeRecord, LevelRecord } from './cloudMerge';

interface ProgressData {
  /** `null` = suivre la langue du téléphone. */
  lang: Lang | null;
  haptics: boolean;
  xp: number;
  levels: Record<string, LevelRecord>;
  powers: PowerId[];
  /** Pouvoirs emportés en duel. */
  loadout: PowerId[];
  /** Pouvoirs emportés en solo (vide = les premiers débloqués). */
  soloLoadout: PowerId[];
  /** Pouvoirs débloqués que le joueur n'a pas encore vus dans l'écran Pouvoirs. */
  freshPowers: PowerId[];
  free: Record<string, FreeRecord>;
  duels: Record<string, DuelRecord>;
  /** Pseudo affiché à l'adversaire en ligne. */
  playerName: string;
  /** Code secret de la sauvegarde en ligne (`null` = pas encore créée). */
  cloudKey: string | null;
}

export interface StoryOutcome {
  /** Pouvoir gagné lors de cette victoire, s'il est nouveau. */
  unlocked: PowerId | null;
  rankBefore: number;
  rankAfter: number;
  firstClear: boolean;
}

interface ProgressActions {
  setLang: (lang: Lang) => void;
  setHaptics: (enabled: boolean) => void;
  setPlayerName: (name: string) => void;
  /** Remplace la progression par celle venue du cloud (déjà fusionnée). */
  applySynced: (data: SyncedProgress) => void;
  setCloudKey: (key: string | null) => void;
  recordStory: (levelId: string, summary: MatchSummary) => StoryOutcome;
  recordFree: (key: string, summary: MatchSummary) => StoryOutcome;
  recordDuel: (botId: string, summary: MatchSummary) => StoryOutcome;
  /** Équipe ou retire un pouvoir. Renvoie `false` si l'équipement est plein. */
  toggleLoadout: (power: PowerId, mode?: 'solo' | 'duel') => boolean;
  markPowersSeen: () => void;
  reset: () => void;
}

export type ProgressState = ProgressData & ProgressActions;

const INITIAL: ProgressData = {
  lang: null,
  haptics: true,
  xp: 0,
  levels: {},
  powers: [],
  loadout: [],
  soloLoadout: [],
  freshPowers: [],
  free: {},
  duels: {},
  playerName: `X-${1000 + Math.floor(Math.random() * 9000)}`,
  cloudKey: null,
};

/** Expérience nécessaire pour atteindre chaque rang. */
export const RANK_THRESHOLDS = [0, 300, 800, 1600, 2800, 4500, 7000];

export function rankOf(xp: number): number {
  let rank = 0;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) if (xp >= RANK_THRESHOLDS[i]) rank = i;
  return rank;
}

/** Avancement vers le rang suivant, entre 0 et 1 (1 au rang maximum). */
export function rankProgress(xp: number): number {
  const rank = rankOf(xp);
  const next = RANK_THRESHOLDS[rank + 1];
  if (next === undefined) return 1;
  const base = RANK_THRESHOLDS[rank];
  return (xp - base) / (next - base);
}

export function isLevelUnlocked(levels: Record<string, LevelRecord>, levelId: string): boolean {
  const previous = previousLevelId(levelId);
  if (previous === null) return true;
  return (levels[previous]?.stars ?? 0) > 0;
}

export function totalStars(levels: Record<string, LevelRecord>): number {
  return ALL_LEVELS.reduce((sum, level) => sum + (levels[level.id]?.stars ?? 0), 0);
}

const better = (previous: number | null | undefined, time: number) =>
  previous == null ? time : Math.min(previous, time);

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setLang: (lang) => set({ lang }),
      setHaptics: (haptics) => set({ haptics }),
      setPlayerName: (playerName) => set({ playerName }),
      applySynced: (data) => set(data),
      setCloudKey: (cloudKey) => set({ cloudKey }),

      recordStory: (levelId, summary) => {
        const state = get();
        const rankBefore = rankOf(state.xp);
        const xp = state.xp + summary.xp;
        const previous = state.levels[levelId];
        const firstClear = summary.won && (previous?.stars ?? 0) === 0;
        const patch: Partial<ProgressData> = { xp };
        let unlocked: PowerId | null = null;

        if (summary.won) {
          patch.levels = {
            ...state.levels,
            [levelId]: {
              stars: Math.max(previous?.stars ?? 0, summary.stars),
              bestTimeMs: better(previous?.bestTimeMs, summary.timeMs),
              bestScore: Math.max(previous?.bestScore ?? 0, summary.total),
            },
          };
          const reward = getLevel(levelId)?.reward ?? null;
          if (reward && !state.powers.includes(reward)) {
            unlocked = reward;
            patch.powers = POWER_ORDER.filter((p) => p === reward || state.powers.includes(p));
            patch.freshPowers = [...state.freshPowers, reward];
            if (state.loadout.length < LOADOUT_SIZE) patch.loadout = [...state.loadout, reward];
            // Un équipement solo déjà choisi accueille le nouveau pouvoir s'il reste de la place.
            if (
              POWERS[reward].kind !== 'attack' &&
              state.soloLoadout.length > 0 &&
              state.soloLoadout.length < LOADOUT_SIZE
            ) {
              patch.soloLoadout = [...state.soloLoadout, reward];
            }
          }
        }

        set(patch);
        return { unlocked, rankBefore, rankAfter: rankOf(xp), firstClear };
      },

      recordFree: (key, summary) => {
        const state = get();
        const rankBefore = rankOf(state.xp);
        const xp = state.xp + summary.xp;
        const patch: Partial<ProgressData> = { xp };
        if (summary.won) {
          const previous = state.free[key];
          patch.free = {
            ...state.free,
            [key]: {
              wins: (previous?.wins ?? 0) + 1,
              bestTimeMs: better(previous?.bestTimeMs, summary.timeMs),
            },
          };
        }
        set(patch);
        return { unlocked: null, rankBefore, rankAfter: rankOf(xp), firstClear: false };
      },

      recordDuel: (botId, summary) => {
        const state = get();
        const rankBefore = rankOf(state.xp);
        const xp = state.xp + summary.xp;
        const previous = state.duels[botId] ?? { wins: 0, losses: 0 };
        set({
          xp,
          duels: {
            ...state.duels,
            [botId]: {
              wins: previous.wins + (summary.won ? 1 : 0),
              losses: previous.losses + (summary.won ? 0 : 1),
            },
          },
        });
        return { unlocked: null, rankBefore, rankAfter: rankOf(xp), firstClear: false };
      },

      toggleLoadout: (power, mode = 'duel') => {
        const { loadout, soloLoadout, powers } = get();
        if (mode === 'solo') {
          if (POWERS[power].kind === 'attack') return false;
          // On part de l'équipement effectif (le choix automatique s'il n'y en a pas encore).
          const current = soloPowers({ powers, soloLoadout });
          if (current.includes(power)) {
            // Il faut garder au moins un pouvoir, sinon le choix automatique reviendrait.
            if (current.length === 1) return false;
            set({ soloLoadout: current.filter((p) => p !== power) });
            return true;
          }
          if (!powers.includes(power) || current.length >= LOADOUT_SIZE) return false;
          set({ soloLoadout: [...current, power] });
          return true;
        }
        if (loadout.includes(power)) {
          set({ loadout: loadout.filter((p) => p !== power) });
          return true;
        }
        if (!powers.includes(power) || loadout.length >= LOADOUT_SIZE) return false;
        set({ loadout: [...loadout, power] });
        return true;
      },

      markPowersSeen: () => {
        if (get().freshPowers.length > 0) set({ freshPowers: [] });
      },

      reset: () =>
        // On se détache aussi de la sauvegarde en ligne : sinon elle ramènerait
        // aussitôt l'ancienne progression. Une nouvelle sera créée.
        set({
          ...INITIAL,
          lang: get().lang,
          haptics: get().haptics,
          playerName: get().playerName,
          cloudKey: null,
        }),
    }),
    {
      name: 'sudokux-progress-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): ProgressData => ({
        lang: state.lang,
        haptics: state.haptics,
        xp: state.xp,
        levels: state.levels,
        powers: state.powers,
        loadout: state.loadout,
        soloLoadout: state.soloLoadout,
        freshPowers: state.freshPowers,
        free: state.free,
        duels: state.duels,
        playerName: state.playerName,
        cloudKey: state.cloudKey,
      }),
    },
  ),
);

/** Langue du téléphone, ramenée aux deux langues du jeu. */
export function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

export function useLang(): Lang {
  const chosen = useProgress((state) => state.lang);
  return chosen ?? deviceLang();
}

const subscribeToHydration = (onChange: () => void) =>
  useProgress.persist.onFinishHydration(onChange);
const isHydrated = () => useProgress.persist.hasHydrated();

/** Vrai une fois la sauvegarde relue depuis l'appareil. */
export function useProgressReady(): boolean {
  return useSyncExternalStore(subscribeToHydration, isHydrated, isHydrated);
}
