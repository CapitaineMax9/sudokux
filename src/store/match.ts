/**
 * La partie en cours. L'état vient du moteur (`reduceMatch`) ; ce magasin se
 * contente de le garder et de diffuser les événements aux animations.
 */
import { create } from 'zustand';

import { createMatch, reduceMatch, type MatchAction, type MatchState } from '@/engine/match';
import { routeEvents } from '@/game/events';
import type { MatchSetup } from '@/game/setup';

interface MatchStore {
  setup: MatchSetup | null;
  match: MatchState | null;
  /** Change à chaque nouvelle partie : sert à réinitialiser les composants. */
  runId: number;
  start: (setup: MatchSetup) => void;
  dispatch: (action: MatchAction) => void;
  clear: () => void;
}

export const useMatchStore = create<MatchStore>()((set, get) => ({
  setup: null,
  match: null,
  runId: 0,

  start: (setup) => set({ setup, match: createMatch(setup.config), runId: get().runId + 1 }),

  dispatch: (action) => {
    const current = get().match;
    if (!current) return;
    const { state, events } = reduceMatch(current, action);
    if (state !== current) set({ match: state });
    if (events.length > 0) routeEvents(events);
  },

  clear: () => set({ setup: null, match: null }),
}));

export const dispatchMatch = (action: MatchAction) => useMatchStore.getState().dispatch(action);
