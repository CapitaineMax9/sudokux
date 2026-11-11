import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { onCellFx } from '@/game/events';
import { haptics } from '@/game/haptics';
import {
  HL_NONE,
  HL_PEER,
  HL_SAME,
  HL_SELECTED,
  highlightOf,
  useMatch,
} from '@/game/selectors';
import { dispatchMatch } from '@/store/match';

import { C, F, FILL, alpha, textGlow } from '../theme';

/** Symboles affichés à la place des chiffres pendant un brouillage. */
const GLYPHS = ['#', '%', '&', '?', '@', '$', '*', '!', '¤', '§', '≠', '∆'];

/** Petit hachage déterministe : même entrée, même résultat. */
function scramble(a: number, b: number, c: number): number {
  let h = Math.imul(a ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35) ^ Math.imul(c + 7, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/**
 * La sélection se fait dès que le doigt touche la case (`onPressIn`), pour
 * une réaction immédiate. Sur le web, un appui très bref n'est transmis que
 * si `onPress` est aussi fourni : d'où cette fonction qui ne fait rien.
 */
const ignorePress = () => {};

/** Halo qui pulse sur une case désignée par le Sonar. */
function SonarPing() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.value * 0.5 }));
  return <Animated.View pointerEvents="none" style={[FILL, styles.ping, style]} />;
}

interface CellProps {
  index: number;
  size: number;
  /** Chiffre donné au départ (non modifiable). */
  given: boolean;
  /** Case sur une diagonale d'un Scellé-X. */
  diagonal: boolean;
  /** 0 hors brouillage ; sinon un compteur qui change plusieurs fois par seconde. */
  glitchTick: number;
  glitchSeed: number;
}

const BACKGROUNDS: Record<number, string> = {
  [HL_NONE]: C.cell,
  [HL_PEER]: '#101a36',
  [HL_SAME]: '#0d3a52',
  [HL_SELECTED]: '#3a1650',
};

export const Cell = memo(function Cell({
  index,
  size,
  given,
  diagonal,
  glitchTick,
  glitchSeed,
}: CellProps) {
  const value = useMatch((match) => match.player.values[index], 0);
  const notes = useMatch((match) => match.player.notes[index], 0);
  const highlight = useMatch((match) => highlightOf(match, index), HL_NONE);
  // Note identique au chiffre de la case sélectionnée : on la fait ressortir.
  const litNote = useMatch((match) => {
    if (match.selected === null) return 0;
    const digit = match.player.values[match.selected];
    return digit !== 0 && match.player.notes[index] & (1 << (digit - 1)) ? digit : 0;
  }, 0);

  // Case désignée par le Sonar : on peut la déduire tout de suite.
  const pinged = useMatch((match) => {
    if (match.player.values[index] !== 0) return false;
    const sonar = match.player.effects.find((effect) => effect.id === 'sonar');
    return sonar !== undefined && sonar.cells.includes(index);
  }, false);

  const [wrong, setWrong] = useState<number | null>(null);
  const [flashColor, setFlashColor] = useState<string>(C.cyan);
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onCellFx(index, (fx) => {
      switch (fx.kind) {
        case 'pop':
          setFlashColor(C.cyan);
          scale.value = withSequence(
            withTiming(1.45, { duration: 80 }),
            withSpring(1, { damping: 9, stiffness: 220 }),
          );
          flash.value = withSequence(
            withTiming(0.75, { duration: 60 }),
            withTiming(0, { duration: 380 }),
          );
          break;
        case 'reveal':
          setFlashColor(C.text);
          scale.value = 0.2;
          scale.value = withSpring(1, { damping: 8, stiffness: 160 });
          flash.value = withSequence(
            withTiming(0.95, { duration: 90 }),
            withTiming(0, { duration: 700 }),
          );
          break;
        case 'error':
          setFlashColor(C.red);
          setWrong(fx.digit);
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => setWrong(null), 560);
          shake.value = withSequence(
            withTiming(-5, { duration: 45 }),
            withTiming(5, { duration: 45 }),
            withTiming(-4, { duration: 45 }),
            withTiming(4, { duration: 45 }),
            withTiming(0, { duration: 45 }),
          );
          flash.value = withSequence(
            withTiming(0.8, { duration: 50 }),
            withTiming(0, { duration: 480 }),
          );
          break;
        case 'wave':
          setFlashColor(C.yellow);
          flash.value = withDelay(
            fx.delay,
            withSequence(withTiming(0.8, { duration: 110 }), withTiming(0, { duration: 420 })),
          );
          scale.value = withDelay(
            fx.delay,
            withSequence(withTiming(1.22, { duration: 110 }), withTiming(1, { duration: 220 })),
          );
          break;
        case 'corrupt':
          setFlashColor(C.red);
          flash.value = withSequence(
            withTiming(1, { duration: 60 }),
            withTiming(0.2, { duration: 120 }),
            withTiming(0.9, { duration: 80 }),
            withTiming(0, { duration: 600 }),
          );
          break;
      }
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [index, scale, shake, flash]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: scale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const selected = highlight === HL_SELECTED;
  const garbled =
    glitchTick > 0 && value !== 0 && scramble(glitchSeed, glitchTick, index) % 100 < 38;

  let content = null;
  if (wrong !== null) {
    content = (
      <Text
        maxFontSizeMultiplier={1}
        style={[styles.digit, { fontSize: size * 0.62, color: C.red }, textGlow(C.red, 8)]}>
        {wrong}
      </Text>
    );
  } else if (value !== 0) {
    const shown = garbled
      ? GLYPHS[scramble(glitchSeed, glitchTick + 3, index) % GLYPHS.length]
      : String(value);
    const color = garbled ? C.magenta : given ? '#c9d6f5' : C.cyan;
    content = (
      <Text
        maxFontSizeMultiplier={1}
        style={[
          styles.digit,
          { fontSize: size * 0.62, color },
          given && !garbled ? null : textGlow(color, 7, 0.8),
        ]}>
        {shown}
      </Text>
    );
  } else if (notes !== 0) {
    const slot = size / 3;
    content = (
      <View style={FILL} pointerEvents="none">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) =>
          notes & (1 << (d - 1)) ? (
            <Text
              key={d}
              maxFontSizeMultiplier={1}
              style={[
                styles.note,
                {
                  left: ((d - 1) % 3) * slot,
                  top: Math.floor((d - 1) / 3) * slot,
                  width: slot,
                  height: slot,
                  lineHeight: slot,
                  fontSize: slot * 0.82,
                  color: litNote === d ? C.yellow : C.textDim,
                },
              ]}>
              {d}
            </Text>
          ) : null,
        )}
      </View>
    );
  }

  return (
    <Pressable
      testID={`cell-${index}`}
      onPressIn={() => {
        haptics.tap();
        dispatchMatch({ type: 'select', cell: index });
      }}
      onPress={ignorePress}
      style={[styles.cell, { width: size, height: size, backgroundColor: BACKGROUNDS[highlight] }]}>
      {diagonal && highlight === HL_NONE ? (
        <View pointerEvents="none" style={[FILL, styles.diagonal]} />
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[FILL, { backgroundColor: flashColor }, flashStyle]}
      />
      {pinged ? <SonarPing /> : null}
      {selected ? <View pointerEvents="none" style={[FILL, styles.ring]} /> : null}
      <Animated.View pointerEvents="none" style={[styles.center, contentStyle]}>
        {content}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  center: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontFamily: F.bodyBold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  note: {
    position: 'absolute',
    fontFamily: F.bodySemi,
    textAlign: 'center',
    includeFontPadding: false,
  },
  diagonal: {
    backgroundColor: alpha(C.magenta, 0.08),
  },
  ring: {
    borderWidth: 2,
    borderColor: C.magenta,
  },
  ping: {
    backgroundColor: alpha(C.teal, 0.45),
    borderWidth: 1.5,
    borderColor: C.teal,
  },
});
