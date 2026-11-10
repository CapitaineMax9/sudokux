import { memo, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { C, FILL } from './theme';

const GRID = 36;
const SWEEP_HEIGHT = 140;

/**
 * Fond de tous les écrans : nuit bleutée, lueurs néon, quadrillage discret,
 * lignes d'écran cathodique et un faisceau qui balaie lentement l'image.
 */
export const Backdrop = memo(function Backdrop({ tint = C.cyan }: { tint?: string }) {
  const { height } = useWindowDimensions();
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1);
  }, [sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -SWEEP_HEIGHT + sweep.value * (height + SWEEP_HEIGHT) }],
  }));

  // Sur le web, les identifiants SVG sont globaux à la page : on y glisse la
  // couleur pour que deux écrans empilés ne se marchent pas dessus.
  const glowId = `glowBottom-${tint.replace('#', '')}`;

  return (
    <View style={styles.root} pointerEvents="none">
      <Svg width="100%" height="100%" style={FILL}>
        <Defs>
          <RadialGradient id="glowTop" cx="15%" cy="0%" r="75%">
            <Stop offset="0" stopColor={C.magenta} stopOpacity={0.2} />
            <Stop offset="1" stopColor={C.magenta} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={glowId} cx="90%" cy="100%" r="80%">
            <Stop offset="0" stopColor={tint} stopOpacity={0.16} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
          <Pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <Path
              d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
              stroke={C.cyan}
              strokeOpacity={0.07}
              strokeWidth={1}
              fill="none"
            />
          </Pattern>
          <Pattern id="scan" width={4} height={4} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={4} height={1} fill={C.black} fillOpacity={0.22} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glowTop)" />
        <Rect width="100%" height="100%" fill={`url(#${glowId})`} />
        <Rect width="100%" height="100%" fill="url(#grid)" />
        <Rect width="100%" height="100%" fill="url(#scan)" />
      </Svg>
      <Animated.View style={[styles.sweep, sweepStyle]} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...FILL,
    backgroundColor: C.bg,
    overflow: 'hidden',
  },
  sweep: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SWEEP_HEIGHT,
    backgroundImage:
      'linear-gradient(180deg, rgba(0, 240, 255, 0) 0%, rgba(0, 240, 255, 0.05) 80%, rgba(0, 240, 255, 0.12) 100%)',
  },
});
