import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { unlockMissionOf } from '@/content/story';
import { LOADOUT_SIZE, POWERS, POWER_ORDER, type PowerId } from '@/engine/powers';
import { haptics } from '@/game/haptics';
import { soloPowers } from '@/game/setup';
import { useT } from '@/i18n';
import { useProgress } from '@/store/progress';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { C, POWER_COLORS, alpha, glow } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

const KIND_COLORS = { support: C.cyan, defense: C.green, attack: C.red } as const;

export default function PowersScreen() {
  const router = useRouter();
  const t = useT();
  const unlocked = useProgress((state) => state.powers);
  const duelLoadout = useProgress((state) => state.loadout);
  const soloLoadout = useProgress((state) => state.soloLoadout);
  const [mode, setMode] = useState<'solo' | 'duel'>('duel');
  const loadout =
    mode === 'solo' ? soloPowers({ powers: unlocked, soloLoadout }) : duelLoadout;
  const toggleLoadout = useProgress((state) => state.toggleLoadout);
  // On garde la liste des nouveautés telle qu'elle était à l'ouverture de l'écran.
  const [fresh] = useState<PowerId[]>(() => useProgress.getState().freshPowers);
  const [full, setFull] = useState(false);

  useEffect(() => {
    useProgress.getState().markPowersSeen();
  }, []);

  useEffect(() => {
    if (!full) return;
    const timer = setTimeout(() => setFull(false), 1800);
    return () => clearTimeout(timer);
  }, [full]);

  const onToggle = (power: PowerId) => {
    if (toggleLoadout(power, mode)) {
      haptics.medium();
      setFull(false);
    } else {
      haptics.warning();
      setFull(true);
    }
  };

  return (
    <Screen title={t('powers.title')} onBack={() => router.back()} scroll tint={C.yellow}>
      <View style={styles.modes}>
        {(['duel', 'solo'] as const).map((id) => {
          const active = mode === id;
          return (
            <Pressable
              key={id}
              testID={`loadout-${id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                haptics.tap();
                setMode(id);
                setFull(false);
              }}
              style={[
                styles.mode,
                {
                  borderColor: alpha(C.yellow, active ? 1 : 0.3),
                  backgroundColor: alpha(C.yellow, active ? 0.16 : 0.04),
                },
                active ? glow(C.yellow, 10, 0.4) : null,
              ]}>
              <Icon name={id === 'duel' ? 'duel' : 'grid'} size={18} color={active ? C.yellow : C.textDim} />
              <Txt variant="title" color={active ? C.yellow : C.textDim} size={13}>
                {t(`powers.mode.${id}`).toUpperCase()}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Panel color={C.yellow} style={styles.loadout}>
        <View style={styles.loadoutHead}>
          <Txt variant="label" color={C.yellow} size={10}>
            {t(mode === 'solo' ? 'powers.loadoutSolo' : 'powers.loadout')}
          </Txt>
          <Txt variant="num" color={C.yellow} size={15}>
            {loadout.length} / {LOADOUT_SIZE}
          </Txt>
        </View>
        <View style={styles.slots}>
          {Array.from({ length: LOADOUT_SIZE }, (_, i) => {
            const power = POWER_ORDER.filter((p) => loadout.includes(p))[i];
            return (
              <View
                key={i}
                style={[
                  styles.slot,
                  { borderColor: power ? POWER_COLORS[power] : alpha(C.textMuted, 0.3) },
                ]}>
                {power ? (
                  <>
                    <Icon name={power} size={22} color={POWER_COLORS[power]} />
                    <Txt
                      variant="label"
                      color={POWER_COLORS[power]}
                      size={7.5}
                      numberOfLines={1}
                      style={styles.slotLabel}>
                      {t(`power.${power}.name`)}
                    </Txt>
                  </>
                ) : (
                  <Txt variant="label" color={C.textMuted} size={8}>
                    {t('powers.emptySlot')}
                  </Txt>
                )}
              </View>
            );
          })}
        </View>
        <Txt variant="small" color={C.textDim}>
          {t(mode === 'solo' ? 'powers.hintSolo' : 'powers.hint')}
        </Txt>
        {full ? (
          <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(200)}>
            <Txt variant="bodyBold" color={C.orange} size={15} testID="powers-full">
              {t('powers.full')}
            </Txt>
          </Animated.View>
        ) : null}
      </Panel>

      <View style={styles.list}>
        {POWER_ORDER.map((power) => {
          const def = POWERS[power];
          const usable = mode === 'duel' || def.kind !== 'attack';
          const owned = unlocked.includes(power) && usable;
          const equipped = loadout.includes(power);
          const color = owned ? POWER_COLORS[power] : C.textMuted;
          const mission = unlockMissionOf(power);
          return (
            <Pressable
              key={power}
              testID={`power-card-${power}`}
              accessibilityRole="button"
              accessibilityLabel={t(`power.${power}.name`)}
              accessibilityState={{ disabled: !owned, selected: equipped }}
              disabled={!owned}
              onPress={() => onToggle(power)}
              style={[
                styles.card,
                { borderColor: alpha(color, equipped ? 1 : 0.35) },
                equipped ? glow(color, 10, 0.35) : null,
              ]}>
              <View
                style={[
                  styles.iconBox,
                  { borderColor: alpha(color, 0.8), backgroundColor: alpha(color, owned ? 0.12 : 0.04) },
                ]}>
                <Icon
                  name={unlocked.includes(power) ? power : 'lock'}
                  size={unlocked.includes(power) ? 30 : 22}
                  color={color}
                />
              </View>
              <View style={styles.cardText}>
                <View style={styles.titleRow}>
                  <Txt variant="heading" color={color} size={16} glow={owned ? 6 : false}>
                    {t(`power.${power}.name`).toUpperCase()}
                  </Txt>
                  {fresh.includes(power) ? (
                    <View style={styles.newBadge}>
                      <Txt variant="label" color={C.bg} size={8}>
                        {t('common.new')}
                      </Txt>
                    </View>
                  ) : null}
                </View>
                <View style={styles.tags}>
                  <Txt variant="label" color={owned ? KIND_COLORS[def.kind] : C.textMuted} size={9}>
                    {t(`kind.${def.kind}`)}
                  </Txt>
                  <Txt variant="label" color={C.textMuted} size={9}>
                    ·
                  </Txt>
                  <Txt variant="label" color={C.textDim} size={9}>
                    {t('powers.cost')}
                  </Txt>
                  <Txt variant="num" color={C.text} size={14} style={styles.costValue}>
                    {def.cost}
                  </Txt>
                </View>
                <Txt variant="small" color={owned ? C.textDim : C.textMuted} size={14}>
                  {t(`power.${power}.desc`)}
                </Txt>
              </View>
              <View style={styles.state}>
                {owned ? (
                  <View
                    style={[
                      styles.check,
                      { borderColor: color, backgroundColor: equipped ? color : 'transparent' },
                    ]}>
                    {equipped ? <Icon name="check" size={16} color={C.bg} strokeWidth={2.6} /> : null}
                  </View>
                ) : unlocked.includes(power) ? (
                  <Txt variant="label" color={C.textMuted} size={8} center>
                    {t('powers.duelOnly')}
                  </Txt>
                ) : mission !== null ? (
                  <Txt variant="label" color={C.textMuted} size={8} center>
                    {t('powers.unlockAt', { c: mission.chapter, n: mission.number })}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 6,
  },
  loadout: {
    gap: 10,
  },
  loadoutHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slots: {
    flexDirection: 'row',
    gap: 8,
  },
  slot: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: alpha(C.bg, 0.6),
  },
  list: {
    marginTop: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: alpha(C.panel, 0.92),
  },
  iconBox: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newBadge: {
    backgroundColor: C.yellow,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  costValue: {
    lineHeight: 15,
  },
  slotLabel: {
    letterSpacing: 0.5,
  },
  state: {
    width: 44,
    alignItems: 'center',
  },
  check: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 6,
  },
});
