/**
 * Outils de développement, actifs uniquement en mode développement sur le
 * web : ils exposent l'état du jeu dans la console du navigateur
 * (`__sudokux.match.getState()`), ce qui sert aussi aux tests automatisés.
 */
import { Platform } from 'react-native';

import { dispatchMatch, useMatchStore } from '@/store/match';
import { useProgress } from '@/store/progress';

export function installDevtools(): void {
  if (!__DEV__ || Platform.OS !== 'web') return;
  (globalThis as Record<string, unknown>).__sudokux = {
    match: useMatchStore,
    progress: useProgress,
    dispatch: dispatchMatch,
  };
}
