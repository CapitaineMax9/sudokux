import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { mulberry32, shuffle } from '@/engine/rng';
import { haptics } from '@/game/haptics';
import { useDigitsLeft, useEffectUntil, useGlitchSeed, useMatch } from '@/game/selectors';
import { dispatchMatch } from '@/store/match';

import { C, F, alpha, glow, textGlow } from '../theme';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Voir `Cell.tsx` : nécessaire pour que les appuis très brefs comptent sur le web. */
const ignorePress = () => {};

interface KeyProps {
  digit: number;
  left: number;
  color: string;
  blocked: boolean;
  height: number;
}

const Key = memo(function Key({ digit, left, color, blocked, height }: KeyProps) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.1 }],
  }));
  const done = left <= 0;
  const tint = done ? C.textMuted : blocked ? alpha(color, 0.45) : color;

  return (
    <Animated.View style={[styles.keyWrap, style]}>
      <Pressable
        testID={`digit-${digit}`}
        accessibilityRole="button"
        accessibilityLabel={String(digit)}
        disabled={done}
        onPressIn={() => {
          pressed.value = withTiming(1, { duration: 50 });
          haptics.tap();
          dispatchMatch({ type: 'digit', digit });
        }}
        onPressOut={() => {
          pressed.value = withTiming(0, { duration: 140 });
        }}
        onPress={ignorePress}
        style={[
          styles.key,
          { height, borderColor: alpha(tint, done ? 0.25 : 0.7), backgroundColor: alpha(tint, 0.08) },
          done || blocked ? null : glow(color, 8, 0.25),
        ]}>
        <Text
          maxFontSizeMultiplier={1}
          style={[styles.digit, { color: tint, fontSize: height * 0.5 }, done ? null : textGlow(tint, 6, 0.7)]}>
          {digit}
        </Text>
        <Text maxFontSizeMultiplier={1} style={[styles.left, { color: alpha(tint, 0.8) }]}>
          {done ? '' : left}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

/**
 * Clavier de 1 à 9. Sous chaque chiffre : le nombre de cases où il manque
 * encore. Pendant un brouillage, les touches changent de place.
 */
export const NumberPad = memo(function NumberPad({ height = 58 }: { height?: number }) {
  const leftCode = useDigitsLeft();
  const notesMode = useMatch((match) => match.notesMode, false);
  const glitchSeed = useGlitchSeed('player');
  const frozen = useEffectUntil('player', 'freeze') > 0;
  const stunned = useMatch((match) => match.player.stunnedUntil > match.now, false);

  const order = useMemo(
    () => (glitchSeed ? shuffle([...DIGITS], mulberry32(glitchSeed)) : DIGITS),
    [glitchSeed],
  );
  const color = glitchSeed ? C.magenta : notesMode ? C.yellow : C.cyan;

  return (
    <View style={styles.row} testID="numpad">
      {order.map((digit) => (
        <Key
          key={digit}
          digit={digit}
          left={Number(leftCode[digit - 1])}
          color={color}
          blocked={frozen || stunned}
          height={height}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  keyWrap: {
    flex: 1,
  },
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  digit: {
    fontFamily: F.bodyBold,
    includeFontPadding: false,
  },
  left: {
    fontFamily: F.bodySemi,
    fontSize: 10,
    lineHeight: 11,
    includeFontPadding: false,
  },
});
