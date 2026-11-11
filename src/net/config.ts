import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { DEFAULT_PORT } from './protocol';

/**
 * Adresse du serveur de duels.
 *
 * - Si `EXPO_PUBLIC_SERVER_URL` est défini (fichier `.env`), on l'utilise :
 *   c'est le cas d'un serveur hébergé sur Internet (`wss://…`).
 * - Sinon, on vise l'ordinateur qui fait tourner `npx expo start` : il suffit
 *   d'y lancer aussi `npm run server` pour jouer sur le même Wi-Fi.
 */
export function serverUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SERVER_URL;
  if (fromEnv) return fromEnv;

  let host: string | undefined;
  if (Platform.OS === 'web') {
    host = typeof window !== 'undefined' ? window.location.hostname : undefined;
  } else {
    host = Constants.expoConfig?.hostUri?.split(':')[0];
  }
  return `ws://${host || 'localhost'}:${DEFAULT_PORT}`;
}
