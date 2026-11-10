import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';

import { C, FILL, glow } from './theme';

/**
 * L'emblème du jeu : une grille de trois sur trois barrée d'un grand X,
 * dont le halo respire doucement.
 */
export const LogoMark = memo(function LogoMark({ size = 120 }: { size?: number }) {
  const breath = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [breath]);

  const halo = useAnimatedStyle(() => ({ opacity: 0.35 + breath.value * 0.65 }));
  const third = 100 / 3;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[FILL, { borderRadius: size * 0.08 }, glow(C.cyan, size * 0.28, 0.55), halo]}
      />
      <Svg width={size} height={size} viewBox="-6 -6 112 112">
        <Rect
          x={0}
          y={0}
          width={100}
          height={100}
          rx={6}
          fill={C.bg}
          stroke={C.cyan}
          strokeWidth={3.5}
        />
        {[1, 2].map((k) => (
          <Line
            key={`v${k}`}
            x1={third * k}
            y1={0}
            x2={third * k}
            y2={100}
            stroke={C.cyan}
            strokeOpacity={0.55}
            strokeWidth={1.8}
          />
        ))}
        {[1, 2].map((k) => (
          <Line
            key={`h${k}`}
            x1={0}
            y1={third * k}
            x2={100}
            y2={third * k}
            stroke={C.cyan}
            strokeOpacity={0.55}
            strokeWidth={1.8}
          />
        ))}
        <Line x1={20} y1={20} x2={80} y2={80} stroke={C.magenta} strokeWidth={13} strokeLinecap="round" />
        <Line x1={80} y1={20} x2={20} y2={80} stroke={C.magenta} strokeWidth={13} strokeLinecap="round" />
      </Svg>
    </View>
  );
});
