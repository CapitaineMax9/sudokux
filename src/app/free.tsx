import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Difficulty, Variant } from '@/engine/sudoku';
import { haptics } from '@/game/haptics';
import { freeKey } from '@/game/setup';
import { formatTime, useT } from '@/i18n';
import { useProgress } from '@/store/progress';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { C, alpha, glow } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

const DIFFICULTIES: { id: Difficulty; color: string; bars: number }[] = [
  { id: 'easy', color: C.green, bars: 1 },
  { id: 'medium', color: C.cyan, bars: 2 },
  { id: 'hard', color: C.orange, bars: 3 },
  { id: 'expert', color: C.red, bars: 4 },
];

const VARIANTS: Variant[] = ['classic', 'x'];

export default function FreeScreen() {
  const router = useRouter();
  const t = useT();
  const records = useProgress((state) => state.free);
  const [variant, setVariant] = useState<Variant>('classic');

  return (
    <Screen title={t('free.title')} onBack={() => router.back()} scroll tint={C.violet}>
      <Txt variant="label" color={C.textDim} size={10} style={styles.heading}>
        {t('free.variant')}
      </Txt>
      <View style={styles.variants}>
        {VARIANTS.map((id) => {
          const active = variant === id;
          const color = id === 'x' ? C.magenta : C.cyan;
          return (
            <Pressable
              key={id}
              testID={`variant-${id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                haptics.tap();
                setVariant(id);
              }}
              style={[
                styles.variant,
                { borderColor: alpha(color, active ? 1 : 0.3), backgroundColor: alpha(color, active ? 0.16 : 0.04) },
                active ? glow(color, 10, 0.4) : null,
              ]}>
              <Icon name={id === 'x' ? 'close' : 'grid'} size={20} color={active ? color : C.textDim} />
              <Txt variant="title" color={active ? color : C.textDim} size={13}>
                {t(`variant.${id}`).toUpperCase()}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="small" color={C.textDim} style={styles.hint}>
        {variant === 'x' ? t('variant.xHint') : ' '}
      </Txt>

      <Txt variant="label" color={C.textDim} size={10} style={styles.heading}>
        {t('free.pick')}
      </Txt>
      <View style={styles.list}>
        {DIFFICULTIES.map(({ id, color, bars }) => {
          const record = records[freeKey(id, variant)];
          return (
            <Pressable
              key={id}
              testID={`difficulty-${id}`}
              accessibilityRole="button"
              accessibilityLabel={t(`difficulty.${id}`)}
              onPress={() => {
                haptics.tap();
                router.push({ pathname: '/play', params: { kind: 'free', difficulty: id, variant } });
              }}
              style={({ pressed }) => [
                styles.card,
                { borderColor: alpha(color, 0.6), opacity: pressed ? 0.75 : 1 },
              ]}>
              <View style={styles.bars}>
                {[1, 2, 3, 4].map((n) => (
                  <View
                    key={n}
                    style={[
                      styles.bar,
                      { height: 8 + n * 6, backgroundColor: n <= bars ? color : alpha(C.text, 0.1) },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.cardText}>
                <Txt variant="heading" color={color} glow={6} size={17}>
                  {t(`difficulty.${id}`).toUpperCase()}
                </Txt>
                <Txt variant="small" color={C.textDim}>
                  {t(`difficulty.${id}.desc`)}
                </Txt>
              </View>
              <View style={styles.record}>
                <Icon name="clock" size={13} color={C.textMuted} />
                <Txt variant="num" color={record?.bestTimeMs != null ? C.text : C.textMuted} size={15}>
                  {record?.bestTimeMs != null ? formatTime(record.bestTimeMs) : '–:––'}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: 10,
    marginBottom: 8,
  },
  variants: {
    flexDirection: 'row',
    gap: 10,
  },
  variant: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 6,
  },
  hint: {
    marginTop: 8,
    minHeight: 36,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: alpha(C.panel, 0.92),
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 32,
  },
  bar: {
    width: 6,
    borderRadius: 2,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
