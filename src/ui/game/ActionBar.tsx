import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { LOADOUT_SIZE, POWERS, type PowerId } from '@/engine/powers';
import { haptics } from '@/game/haptics';
import { useCharge, useHasEffect, useMatch, usePowers } from '@/game/selectors';
import { useT } from '@/i18n';
import { dispatchMatch } from '@/store/match';

import { Icon, type IconName } from '../Icon';
import { C, FILL, POWER_COLORS, alpha, glow } from '../theme';
import { Txt } from '../Txt';

const HEIGHT = 60;

interface ToolProps {
  icon: IconName;
  label: string;
  color: string;
  active?: boolean;
  onPress: () => void;
  testID: string;
}

const Tool = memo(function Tool({ icon, label, color, active = false, onPress, testID }: ToolProps) {
  const tint = active ? color : C.textDim;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[
        styles.tool,
        { borderColor: alpha(tint, active ? 0.9 : 0.35), backgroundColor: alpha(tint, active ? 0.18 : 0.05) },
        active ? glow(color, 10, 0.45) : null,
      ]}>
      <Icon name={icon} size={22} color={tint} />
      <Txt variant="label" color={tint} size={8} numberOfLines={1} style={styles.tight}>
        {label}
      </Txt>
    </Pressable>
  );
});

interface PowerButtonProps {
  power: PowerId;
  charge: number;
}

const PowerButton = memo(function PowerButton({ power, charge }: PowerButtonProps) {
  const t = useT();
  const def = POWERS[power];
  const color = POWER_COLORS[power];
  const ready = charge >= def.cost;
  // Pare-feu, Miroir et Sonar restent allumés tant qu'ils agissent.
  const lasting = power === 'shield' || power === 'mirror' || power === 'sonar';
  const shieldUp = useHasEffect('player', lasting ? power : 'shield') && lasting;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (ready) {
      pulse.value = withRepeat(withTiming(1, { duration: 650 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 150 });
    }
  }, [ready, pulse]);

  const halo = useAnimatedStyle(() => ({ opacity: 0.15 + pulse.value * 0.3 }));
  const tint = ready || shieldUp ? color : C.textMuted;
  const level = Math.min(1, charge / def.cost);

  return (
    <Pressable
      testID={`power-${power}`}
      accessibilityRole="button"
      accessibilityLabel={`${t(`power.${power}.name`)}, ${def.cost}`}
      accessibilityState={{ disabled: !ready }}
      onPress={() => {
        if (ready) haptics.medium();
        dispatchMatch({ type: 'power', power });
      }}
      style={[
        styles.power,
        { borderColor: alpha(tint, ready || shieldUp ? 0.95 : 0.4) },
        ready ? glow(color, 12, 0.55) : null,
      ]}>
      {/* Niveau de remplissage : la part du coût déjà accumulée. */}
      <View
        pointerEvents="none"
        style={[styles.level, { height: `${level * 100}%`, backgroundColor: alpha(color, ready ? 0.22 : 0.1) }]}
      />
      {ready ? (
        <Animated.View pointerEvents="none" style={[FILL, { backgroundColor: color }, halo]} />
      ) : null}
      <Icon name={power} size={24} color={tint} />
      <Txt
        variant="small"
        color={tint}
        size={9.5}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={styles.powerName}>
        {t(`power.${power}.name`).toUpperCase()}
      </Txt>
      <View style={[styles.cost, { backgroundColor: ready ? color : alpha(C.textMuted, 0.35) }]}>
        <Txt variant="num" color={ready ? C.bg : C.textDim} size={11} style={styles.costText}>
          {def.cost}
        </Txt>
      </View>
    </Pressable>
  );
});

const LockedSlot = memo(function LockedSlot() {
  return (
    <View style={[styles.power, styles.locked]}>
      <Icon name="lock" size={18} color={C.textMuted} />
    </View>
  );
});

/** Rangée d'outils : crayon, gomme, puis les pouvoirs disponibles. */
export const ActionBar = memo(function ActionBar() {
  const t = useT();
  const powers = usePowers();
  const charge = useCharge('player');
  const notesMode = useMatch((match) => match.notesMode, false);
  const slots = Array.from({ length: LOADOUT_SIZE }, (_, i) => powers[i] ?? null);

  return (
    <View style={styles.row} testID="actions">
      <Tool
        testID="tool-notes"
        icon="pencil"
        label={t('game.notes')}
        color={C.yellow}
        active={notesMode}
        onPress={() => dispatchMatch({ type: 'toggleNotes' })}
      />
      <Tool
        testID="tool-erase"
        icon="erase"
        label={t('game.erase')}
        color={C.textDim}
        onPress={() => dispatchMatch({ type: 'erase' })}
      />
      <View style={styles.divider} />
      {slots.map((power, i) =>
        power ? <PowerButton key={power} power={power} charge={charge} /> : <LockedSlot key={`slot-${i}`} />,
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tool: {
    width: 50,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
  },
  divider: {
    width: 1,
    height: HEIGHT - 16,
    backgroundColor: alpha(C.cyan, 0.2),
    marginHorizontal: 2,
  },
  power: {
    flex: 1,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderRadius: 6,
    backgroundColor: alpha(C.panel, 0.9),
    overflow: 'hidden',
  },
  locked: {
    borderColor: alpha(C.textMuted, 0.25),
    borderStyle: 'dashed',
  },
  level: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  powerName: {
    marginTop: 1,
    letterSpacing: 0.1,
    lineHeight: 12,
    paddingHorizontal: 1,
  },
  tight: {
    letterSpacing: 0.8,
  },
  costText: {
    lineHeight: 12,
  },
  cost: {
    position: 'absolute',
    top: 3,
    right: 3,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
