/**
 * Accès au module TCP natif. Il n'existe que dans l'application installée
 * (APK) : ni dans Expo Go, ni dans le navigateur. On le charge donc à la
 * demande, sans faire planter le jeu s'il est absent.
 */
import { NativeModules, Platform } from 'react-native';

import type { NetLike } from './tcp';

export function localAvailable(): boolean {
  return Platform.OS !== 'web' && NativeModules.TcpSockets != null;
}

export function nativeNet(): NetLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('react-native-tcp-socket');
  return (module.default ?? module) as NetLike;
}
