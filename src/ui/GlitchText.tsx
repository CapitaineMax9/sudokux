import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { C, F, textGlow } from './theme';

interface GlitchTextProps {
  text: string;
  size?: number;
  color?: string;
  /** Temps calme entre deux secousses, en millisecondes. */
  restMs?: number;
  font?: string;
  letterSpacing?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Titre « glitché » : deux copies cyan et magenta du texte se décalent par
 * à-coups derrière le texte principal, comme une image mal synchronisée.
 */
export function GlitchText({
  text,
  size = 40,
  color = C.text,
  restMs = 2400,
  font = F.display,
  letterSpacing = 3,
  style,
}: GlitchTextProps) {
  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(
      withSequence(
        withDelay(restMs, withTiming(1, { duration: 50 })),
        withTiming(-0.7, { duration: 50 }),
        withTiming(0.5, { duration: 40 }),
        withTiming(0, { duration: 40 }),
        withDelay(140, withTiming(-1, { duration: 40 })),
        withTiming(0, { duration: 60 }),
      ),
      -1,
    );
  }, [restMs, shift]);

  const cyan = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * size * 0.09 }, { translateY: shift.value * -1.5 }],
    opacity: shift.value === 0 ? 0 : 0.85,
  }));
  const magenta = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * size * -0.09 }, { translateY: shift.value * 1.5 }],
    opacity: shift.value === 0 ? 0 : 0.85,
  }));

  const base = { fontFamily: font, fontSize: size, letterSpacing, lineHeight: Math.round(size * 1.2) };

  return (
    <View style={style}>
      <Animated.Text
        maxFontSizeMultiplier={1}
        style={[base, styles.ghost, { color: C.cyan }, cyan]}
        numberOfLines={1}>
        {text}
      </Animated.Text>
      <Animated.Text
        maxFontSizeMultiplier={1}
        style={[base, styles.ghost, { color: C.magenta }, magenta]}
        numberOfLines={1}>
        {text}
      </Animated.Text>
      <Animated.Text
        maxFontSizeMultiplier={1}
        style={[base, { color }, textGlow(color, size * 0.24, 0.6)]}
        numberOfLines={1}>
        {text}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
