/**
 * Thème cyberpunk néon : couleurs, polices et petits outils de style.
 * Tout le jeu est en mode sombre ; les couleurs vives servent d'accents.
 */
import type { TextStyle, ViewStyle } from 'react-native';

import type { PowerId } from '@/engine/powers';

export const C = {
  bg: '#05050d',
  bgRaised: '#0a0c1c',
  panel: '#0d1126',
  panelHi: '#141a38',
  cell: '#090c1c',
  cellGiven: '#0c1024',

  line: 'rgba(0, 240, 255, 0.14)',
  lineStrong: 'rgba(0, 240, 255, 0.55)',

  cyan: '#00f0ff',
  magenta: '#ff2bd6',
  yellow: '#f9f002',
  green: '#39ff88',
  red: '#ff3860',
  violet: '#9d7bff',
  ice: '#8fe3ff',
  orange: '#ff9f1c',
  indigo: '#6c7dff',

  text: '#e8f6ff',
  textDim: '#93a0cc',
  textMuted: '#55608a',
  black: '#000000',
} as const;

/** Noms des polices chargées dans `src/app/_layout.tsx`. */
export const F = {
  display: 'Orbitron_900Black',
  heading: 'Orbitron_700Bold',
  mono: 'Orbitron_500Medium',
  body: 'Rajdhani_500Medium',
  bodyBold: 'Rajdhani_700Bold',
  bodySemi: 'Rajdhani_600SemiBold',
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Largeur maximale du contenu (tablettes, web). */
export const MAX_WIDTH = 520;

/** Remplit tout le parent (identique sur iOS, Android et web). */
export const FILL = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
} as const;

export const POWER_COLORS: Record<PowerId, string> = {
  scan: C.cyan,
  analyse: C.violet,
  shield: C.green,
  purge: C.yellow,
  freeze: C.ice,
  glitch: C.magenta,
  blackout: C.indigo,
  virus: C.red,
};

/** Ajoute de la transparence à une couleur `#rrggbb`. */
export function alpha(hex: string, opacity: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Halo néon autour d'un bloc. */
export function glow(color: string, radius = 12, opacity = 0.7): ViewStyle {
  return { boxShadow: `0px 0px ${radius}px ${alpha(color, opacity)}` };
}

/** Halo néon autour d'un texte. */
export function textGlow(color: string, radius = 10, opacity = 0.9): TextStyle {
  return {
    textShadowColor: alpha(color, opacity),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: radius,
  };
}
