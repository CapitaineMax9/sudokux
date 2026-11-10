import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const TAG = 'sudokux-play';

/**
 * Empêche l'écran de s'éteindre pendant une partie.
 * Sur le web, le navigateur peut refuser : on ignore alors l'erreur, ce
 * n'est qu'un confort.
 */
export function useStayAwake(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(TAG).catch(() => {});
    };
  }, []);
}
