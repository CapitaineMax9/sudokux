/** Vibrations. Sans effet sur le web ou si le joueur les a coupées. */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useProgress } from '@/store/progress';

const enabled = () => Platform.OS !== 'web' && useProgress.getState().haptics;

const safely = (run: () => Promise<void>) => {
  if (!enabled()) return;
  run().catch(() => {
    // Certains appareils n'ont pas de moteur de vibration : on ignore.
  });
};

export const haptics = {
  /** Sélection d'une case, appui sur un bouton. */
  tap: () => safely(() => Haptics.selectionAsync()),
  /** Bon chiffre posé. */
  light: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Pouvoir utilisé, unité terminée. */
  medium: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Attaque subie. */
  heavy: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
