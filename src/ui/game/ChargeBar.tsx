import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { RULES } from '@/engine/powers';
import { useCharge } from '@/game/selectors';
import { useT } from '@/i18n';

import { C, alpha, glow } from '../theme';
import { Txt } from '../Txt';

const SEGMENTS = 10;

/** Jauge de charge : elle se remplit à chaque bon chiffre et paie les pouvoirs. */
export const ChargeBar = memo(function ChargeBar() {
  const t = useT();
  const charge = useCharge('player');
  const level = useSharedValue(0);

  useEffect(() => {
    level.value = withTiming(charge / RULES.maxCharge, { duration: 260 });
  }, [charge, level]);

  const fill = useAnimatedStyle(() => ({ width: `${level.value * 100}%` }));
  const full = charge >= RULES.maxCharge;

  return (
    <View style={styles.row} testID="charge">
      <Txt variant="label" color={C.textDim} size={9}>
        {t('game.charge')}
      </Txt>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: full ? C.yellow : C.cyan },
            glow(full ? C.yellow : C.cyan, 8, 0.7),
            fill,
          ]}
        />
        <View style={styles.ticks} pointerEvents="none">
          {Array.from({ length: SEGMENTS - 1 }, (_, i) => (
            <View key={i} style={styles.tick} />
          ))}
        </View>
      </View>
      <Txt variant="num" color={full ? C.yellow : C.cyan} size={15} style={styles.value}>
        {charge}
      </Txt>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: alpha(C.cyan, 0.12),
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  ticks: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  tick: {
    width: 1.5,
    backgroundColor: C.bg,
  },
  value: {
    width: 30,
    textAlign: 'right',
  },
});
