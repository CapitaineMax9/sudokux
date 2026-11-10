import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptics } from '@/game/haptics';

import { Icon, type IconName } from './Icon';
import { C, alpha, glow } from './theme';
import { Txt } from './Txt';

export interface NeonButtonProps {
  label: string;
  /** Ligne de description sous le libellé. */
  sub?: string;
  onPress: () => void;
  color?: string;
  /** `solid` = action principale, `outline` = secondaire, `ghost` = discret. */
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  /** Petite étiquette (par ex. « NOUVEAU »). */
  badge?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEIGHT = { lg: 66, md: 50, sm: 40 } as const;

export function NeonButton({
  label,
  sub,
  onPress,
  color = C.cyan,
  variant = 'outline',
  size = 'md',
  icon,
  disabled = false,
  badge,
  style,
  testID,
}: NeonButtonProps) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
    opacity: 1 - pressed.value * 0.15,
  }));

  const solid = variant === 'solid';
  const ghost = variant === 'ghost';
  const tint = disabled ? C.textMuted : color;
  const foreground = solid && !disabled ? C.bg : tint;

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => {
          pressed.value = withTiming(1, { duration: 70 });
        }}
        onPressOut={() => {
          pressed.value = withTiming(0, { duration: 160 });
        }}
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        style={[
          styles.base,
          { minHeight: HEIGHT[size], borderColor: ghost ? alpha(tint, 0.35) : tint },
          solid
            ? { backgroundColor: disabled ? alpha(C.textMuted, 0.2) : color }
            : { backgroundColor: alpha(tint, ghost ? 0.04 : 0.1) },
          !disabled && !ghost ? glow(color, solid ? 16 : 10, solid ? 0.55 : 0.35) : null,
        ]}>
        {!solid && !ghost ? <View style={[styles.accent, { backgroundColor: tint }]} /> : null}
        {icon ? (
          <View style={styles.icon}>
            <Icon name={icon} size={size === 'lg' ? 26 : 20} color={foreground} />
          </View>
        ) : null}
        <View style={[styles.labels, icon ? null : styles.centered]}>
          <Txt
            variant={size === 'lg' ? 'heading' : 'title'}
            color={foreground}
            size={size === 'sm' ? 12 : undefined}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {label.toUpperCase()}
          </Txt>
          {sub ? (
            <Txt variant="small" color={solid ? alpha(C.bg, 0.75) : C.textDim} numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Txt variant="label" color={C.bg} size={9}>
              {badge}
            </Txt>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  icon: {
    marginRight: 14,
    marginLeft: 4,
  },
  labels: {
    flex: 1,
    gap: 1,
  },
  centered: {
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: C.yellow,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
