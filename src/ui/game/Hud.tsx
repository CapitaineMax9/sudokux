import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { RULES } from '@/engine/powers';
import { haptics } from '@/game/haptics';
import { useElapsedSeconds, useMatch } from '@/game/selectors';
import { formatNumber, formatTime, useT } from '@/i18n';

import { Icon } from '../Icon';
import { C, alpha, glow } from '../theme';
import { Txt } from '../Txt';

/** Chronomètre, ou compte à rebours quand la mission est limitée en temps. */
const Timer = memo(function Timer() {
  const seconds = useElapsedSeconds();
  const limit = useMatch((match) => match.config.timeLimitMs, null);
  const shown = limit === null ? seconds * 1000 : Math.max(0, limit - seconds * 1000);
  const urgent = limit !== null && shown <= 60_000;
  const color = urgent ? C.red : limit !== null ? C.orange : C.text;
  return (
    <View style={styles.timer}>
      <Icon name="clock" size={14} color={color} />
      <Txt variant="num" color={color} size={20} glow={urgent ? 8 : false} testID="timer">
        {formatTime(shown)}
      </Txt>
    </View>
  );
});

/** Erreurs restantes : une pastille par erreur autorisée. */
const Mistakes = memo(function Mistakes() {
  const t = useT();
  const mistakes = useMatch((match) => match.player.mistakes, 0);
  const max = useMatch((match) => match.config.maxMistakes, null);
  if (max === null) {
    return (
      <View style={styles.side}>
        <Txt variant="label" color={C.textDim} size={9}>
          {t('game.errors')}
        </Txt>
        <Txt variant="num" color={mistakes > 0 ? C.red : C.textDim} size={16} testID="mistakes">
          {mistakes}
        </Txt>
      </View>
    );
  }
  return (
    <View style={styles.side} testID="mistakes">
      <Txt variant="label" color={C.textDim} size={9}>
        {t('game.errors')}
      </Txt>
      <View style={styles.pips}>
        {Array.from({ length: max }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              i < mistakes
                ? { backgroundColor: C.red, borderColor: C.red, ...glow(C.red, 6) }
                : { borderColor: alpha(C.text, 0.4) },
            ]}
          />
        ))}
      </View>
    </View>
  );
});

/** Combo en cours, avec une barre qui montre le temps restant pour le prolonger. */
const Combo = memo(function Combo() {
  const t = useT();
  const combo = useMatch((match) => match.player.combo, 0);
  const lastCorrectAt = useMatch((match) => match.player.lastCorrectAt, 0);
  const pop = useSharedValue(1);
  const fuse = useSharedValue(0);

  useEffect(() => {
    if (combo >= 2) {
      pop.value = withSequence(withTiming(1.5, { duration: 70 }), withSpring(1, { damping: 8 }));
      fuse.value = 1;
      fuse.value = withTiming(0, { duration: RULES.comboWindowMs, easing: Easing.linear });
    } else {
      fuse.value = 0;
    }
  }, [combo, lastCorrectAt, pop, fuse]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const fuseStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fuse.value }] }));

  if (combo < 2) return <View style={styles.combo} />;
  const color = combo >= 5 ? C.magenta : combo >= 3 ? C.yellow : C.cyan;
  return (
    <View style={styles.combo} testID="combo">
      <Animated.View style={popStyle}>
        <Txt variant="heading" color={color} glow={10} size={15}>
          {t('game.combo')} ×{combo}
        </Txt>
      </Animated.View>
      <View style={styles.fuseTrack}>
        <Animated.View style={[styles.fuse, { backgroundColor: color }, fuseStyle]} />
      </View>
    </View>
  );
});

const Score = memo(function Score() {
  const t = useT();
  const score = useMatch((match) => match.player.score, 0);
  return (
    <View style={[styles.side, styles.right]}>
      <Txt variant="label" color={C.textDim} size={9}>
        {t('game.score')}
      </Txt>
      <Txt variant="num" color={C.text} size={17} testID="score">
        {formatNumber(score)}
      </Txt>
    </View>
  );
});

interface HudProps {
  title: string;
  /** Ligne secondaire sous le titre (par ex. « SCELLÉ-X »). */
  tag?: string;
  onPause: () => void;
}

export const Hud = memo(function Hud({ title, tag, onPause }: HudProps) {
  return (
    <View style={styles.hud}>
      <View style={styles.top}>
        <Pressable
          testID="pause"
          accessibilityRole="button"
          accessibilityLabel="Pause"
          hitSlop={10}
          onPress={() => {
            haptics.tap();
            onPause();
          }}
          style={styles.pause}>
          <Icon name="pause" size={18} color={C.cyan} />
        </Pressable>
        <View style={styles.titles}>
          <Txt variant="title" color={C.text} size={12} numberOfLines={1}>
            {title.toUpperCase()}
          </Txt>
          {tag ? (
            <Txt variant="label" color={C.magenta} size={8}>
              {tag}
            </Txt>
          ) : null}
        </View>
        <Timer />
      </View>
      <View style={styles.bottom}>
        <Mistakes />
        <Combo />
        <Score />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  hud: {
    gap: 6,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pause: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: alpha(C.cyan, 0.4),
    backgroundColor: alpha(C.cyan, 0.06),
  },
  titles: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  timer: {
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 30,
  },
  side: {
    width: 86,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  pips: {
    flexDirection: 'row',
    gap: 5,
  },
  pip: {
    width: 11,
    height: 11,
    borderRadius: 2,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  combo: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  fuseTrack: {
    width: 70,
    height: 3,
    borderRadius: 2,
    backgroundColor: alpha(C.text, 0.12),
    overflow: 'hidden',
  },
  fuse: {
    width: '100%',
    height: 3,
  },
});
