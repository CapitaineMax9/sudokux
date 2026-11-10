import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { RULES } from '@/engine/powers';
import { colOf, isOnDiagonal, rowOf } from '@/engine/sudoku';
import { matchEvents } from '@/game/events';
import {
  useEffectUntil,
  useGlitchSeed,
  useHasEffect,
  useHiddenBoxes,
  useMatch,
} from '@/game/selectors';
import { useT } from '@/i18n';
import { useMatchStore } from '@/store/match';

import { Icon } from '../Icon';
import { C, F, FILL, alpha, glow, textGlow } from '../theme';
import { Txt } from '../Txt';
import { Cell } from './Cell';

const PAD = 3;
const BOX_GAP = 3;
const CELL_GAP = 1;
const NINE = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/** Tailles en pixels entiers, pour des lignes nettes sur tous les écrans. */
export function boardMetrics(maxSize: number) {
  const cell = Math.max(
    18,
    Math.floor((maxSize - 2 * PAD - 2 * BOX_GAP - 6 * CELL_GAP) / 9),
  );
  const box = cell * 3 + CELL_GAP * 2;
  const size = box * 3 + BOX_GAP * 2 + PAD * 2;
  return { cell, box, size };
}

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

/** Points gagnés qui s'envolent au-dessus de la case. */
function FloatingPoints({ floater }: { floater: Floater }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.quad) });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * progress.value,
    transform: [{ translateY: -34 * progress.value }, { scale: 0.8 + 0.4 * progress.value }],
  }));
  return (
    <Animated.Text
      pointerEvents="none"
      maxFontSizeMultiplier={1}
      style={[
        styles.floater,
        { left: floater.x - 40, top: floater.y - 12, color: floater.color },
        textGlow(floater.color, 8),
        style,
      ]}>
      {floater.text}
    </Animated.Text>
  );
}

/** Barre qui se vide pendant la durée restante d'un effet. */
function Countdown({ until, color }: { until: number; color: string }) {
  const width = useSharedValue(1);
  useEffect(() => {
    const now = useMatchStore.getState().match?.now ?? 0;
    width.value = 1;
    width.value = withTiming(0, { duration: Math.max(0, until - now), easing: Easing.linear });
  }, [until, width]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: width.value }] }));
  return (
    <View style={styles.countdownTrack}>
      <Animated.View style={[styles.countdownFill, { backgroundColor: color }, style]} />
    </View>
  );
}

function FreezeOverlay({ until }: { until: number }) {
  const t = useT();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.75 + pulse.value * 0.25 }));
  return (
    <Animated.View pointerEvents="none" style={[FILL, styles.freeze, style]}>
      <Icon name="freeze" size={46} color={C.ice} />
      <Txt variant="heading" color={C.ice} glow={12} size={22}>
        {t('game.frozen')}
      </Txt>
      <Countdown until={until} color={C.ice} />
    </Animated.View>
  );
}

function BlackoutPanel({ left, top, size }: { left: number; top: number; size: number }) {
  const t = useT();
  const flicker = useSharedValue(1);
  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(0.86, { duration: 90 }),
        withTiming(1, { duration: 60 }),
        withTiming(0.94, { duration: 420 }),
        withTiming(1, { duration: 120 }),
      ),
      -1,
    );
  }, [flicker]);
  const style = useAnimatedStyle(() => ({ opacity: flicker.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.blackout, { left, top, width: size, height: size }, style]}>
      <Icon name="blackout" size={Math.min(30, size * 0.3)} color={C.indigo} />
      <Txt variant="label" color={C.indigo} size={8} center>
        {t('game.noSignal')}
      </Txt>
    </Animated.View>
  );
}

function ShieldRing() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45 }));
  return <Animated.View pointerEvents="none" style={[styles.shield, style]} />;
}

interface BoardProps {
  /** Côté maximal disponible ; la grille choisit la plus grande taille « nette ». */
  maxSize: number;
}

export const Board = memo(function Board({ maxSize }: BoardProps) {
  const puzzle = useMatchStore((store) => store.match?.config.puzzle ?? null);
  const hiddenMask = useHiddenBoxes('player');
  const glitchSeed = useGlitchSeed('player');
  const freezeUntil = useEffectUntil('player', 'freeze');
  const shielded = useHasEffect('player', 'shield');
  const stunned = useMatch((match) => match.player.stunnedUntil > match.now, false);

  const metrics = useMemo(() => boardMetrics(maxSize), [maxSize]);
  const [glitchTick, setGlitchTick] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextFloater = useRef(1);
  const shake = useSharedValue(0);

  // Pendant un brouillage, l'affichage change plusieurs fois par seconde.
  useEffect(() => {
    if (!glitchSeed) {
      setGlitchTick(0);
      return;
    }
    setGlitchTick(1);
    const timer = setInterval(() => setGlitchTick((tick) => tick + 1), 300);
    return () => clearInterval(timer);
  }, [glitchSeed]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const jolt = (strength: number) => {
      shake.value = withSequence(
        withTiming(-strength, { duration: 40 }),
        withTiming(strength, { duration: 40 }),
        withTiming(-strength * 0.6, { duration: 40 }),
        withTiming(strength * 0.6, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    };
    const unsubscribe = matchEvents.on((event) => {
      if (event.type === 'placed' && event.side === 'player' && event.points > 0) {
        const id = nextFloater.current++;
        const step = metrics.cell + CELL_GAP;
        const col = colOf(event.cell);
        const row = rowOf(event.cell);
        const x = PAD + col * step + Math.floor(col / 3) * (BOX_GAP - CELL_GAP) + metrics.cell / 2;
        const y = PAD + row * step + Math.floor(row / 3) * (BOX_GAP - CELL_GAP);
        const color = event.combo >= 5 ? C.magenta : event.combo >= 3 ? C.yellow : C.cyan;
        setFloaters((list) => [...list, { id, x, y, text: `+${event.points}`, color }]);
        const timer = setTimeout(() => {
          timers.delete(timer);
          setFloaters((list) => list.filter((f) => f.id !== id));
        }, 900);
        timers.add(timer);
      } else if (event.type === 'mistake' && event.side === 'player') {
        jolt(6);
      } else if (event.type === 'inputBlocked') {
        jolt(3);
      } else if (event.type === 'attackHit' && event.attack.target === 'player') {
        jolt(10);
      }
    });
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [metrics.cell, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  if (!puzzle) return null;
  const xSeal = puzzle.variant === 'x';
  const boxStep = metrics.box + BOX_GAP;
  const frame = shielded ? C.green : stunned ? C.red : C.cyan;

  return (
    <Animated.View
      testID="board"
      style={[
        styles.board,
        { width: metrics.size, height: metrics.size, borderColor: frame },
        glow(frame, 18, 0.45),
        shakeStyle,
      ]}>
      {NINE.map((box) => (
        <View
          key={box}
          style={[
            styles.box,
            {
              width: metrics.box,
              height: metrics.box,
              left: PAD + (box % 3) * boxStep,
              top: PAD + Math.floor(box / 3) * boxStep,
            },
          ]}>
          {NINE.map((k) => {
            const row = Math.floor(box / 3) * 3 + Math.floor(k / 3);
            const col = (box % 3) * 3 + (k % 3);
            const index = row * 9 + col;
            return (
              <Cell
                key={index}
                index={index}
                size={metrics.cell}
                given={puzzle.puzzle[index] !== 0}
                diagonal={xSeal && isOnDiagonal(index)}
                glitchTick={glitchTick}
                glitchSeed={glitchSeed}
              />
            );
          })}
        </View>
      ))}

      {xSeal ? (
        <Svg
          pointerEvents="none"
          width={metrics.size}
          height={metrics.size}
          style={styles.overlay}>
          <Line
            x1={PAD}
            y1={PAD}
            x2={metrics.size - PAD}
            y2={metrics.size - PAD}
            stroke={C.magenta}
            strokeOpacity={0.28}
            strokeWidth={1.5}
            strokeDasharray="6 5"
          />
          <Line
            x1={metrics.size - PAD}
            y1={PAD}
            x2={PAD}
            y2={metrics.size - PAD}
            stroke={C.magenta}
            strokeOpacity={0.28}
            strokeWidth={1.5}
            strokeDasharray="6 5"
          />
        </Svg>
      ) : null}

      {NINE.map((box) =>
        hiddenMask & (1 << box) ? (
          <BlackoutPanel
            key={`blackout-${box}`}
            left={PAD + (box % 3) * boxStep}
            top={PAD + Math.floor(box / 3) * boxStep}
            size={metrics.box}
          />
        ) : null,
      )}

      {freezeUntil > 0 ? <FreezeOverlay until={freezeUntil} /> : null}
      {shielded ? <ShieldRing /> : null}
      {floaters.map((floater) => (
        <FloatingPoints key={floater.id} floater={floater} />
      ))}
    </Animated.View>
  );
});

/** Durée du trajet d'une attaque, pour synchroniser les alertes à l'écran. */
export const ATTACK_WARNING_MS = RULES.attackTravelMs;

const styles = StyleSheet.create({
  board: {
    backgroundColor: alpha(C.cyan, 0.55),
    borderWidth: 0,
    borderRadius: 4,
  },
  box: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
    backgroundColor: '#1a2b4d',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  floater: {
    position: 'absolute',
    width: 80,
    textAlign: 'center',
    fontFamily: F.heading,
    fontSize: 15,
  },
  freeze: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: alpha(C.ice, 0.24),
    borderWidth: 3,
    borderColor: C.ice,
    borderRadius: 4,
  },
  countdownTrack: {
    width: '50%',
    height: 5,
    borderRadius: 3,
    backgroundColor: alpha(C.black, 0.45),
    overflow: 'hidden',
  },
  countdownFill: {
    width: '100%',
    height: 5,
    transformOrigin: 'left',
  },
  blackout: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#02030a',
    borderWidth: 1,
    borderColor: alpha(C.indigo, 0.6),
  },
  shield: {
    ...FILL,
    borderWidth: 3,
    borderColor: C.green,
    borderRadius: 4,
    ...glow(C.green, 14, 0.8),
  },
});
