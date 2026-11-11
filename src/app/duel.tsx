import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BOTS, BOT_ORDER } from '@/content/bots';
import { CHARACTERS } from '@/content/characters';
import { LOADOUT_SIZE } from '@/engine/powers';
import { haptics } from '@/game/haptics';
import { duelPowers } from '@/game/setup';
import { useL, useT, type StringKey } from '@/i18n';
import { useProgress } from '@/store/progress';
import { Icon } from '@/ui/Icon';
import { NeonButton } from '@/ui/NeonButton';
import { Panel } from '@/ui/Panel';
import { Portrait } from '@/ui/Portrait';
import { Screen } from '@/ui/Screen';
import { C, POWER_COLORS, alpha } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

const TIER_COLORS = [C.textDim, C.green, C.orange, C.red];

export default function DuelScreen() {
  const router = useRouter();
  const t = useT();
  const l = useL();
  const levels = useProgress((state) => state.levels);
  const records = useProgress((state) => state.duels);
  const powers = useProgress((state) => state.powers);
  const loadout = useProgress((state) => state.loadout);
  const equipped = duelPowers({ powers, loadout });

  return (
    <Screen title={t('duel.title')} onBack={() => router.back()} scroll tint={C.magenta}>
      <Txt variant="body" color={C.textDim} style={styles.rules}>
        {t('duel.rules')}
      </Txt>

      <Panel color={C.yellow} style={styles.loadout}>
        <View style={styles.loadoutHead}>
          <Txt variant="label" color={C.yellow} size={10}>
            {t('duel.loadout')}
          </Txt>
          <NeonButton
            testID="duel-edit"
            label={t('duel.edit')}
            size="sm"
            color={C.yellow}
            onPress={() => router.push('/powers')}
          />
        </View>
        {equipped.length === 0 ? (
          <Txt variant="small" color={C.textMuted}>
            {t('duel.loadoutEmpty')}
          </Txt>
        ) : (
          <View style={styles.slots}>
            {Array.from({ length: LOADOUT_SIZE }, (_, i) => {
              const power = equipped[i];
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
        )}
      </Panel>

      <Txt variant="label" color={C.textDim} size={10} style={styles.heading}>
        {t('duel.pick')}
      </Txt>
      <View style={styles.list}>
        {BOT_ORDER.map((id) => {
          const bot = BOTS[id];
          const character = CHARACTERS[bot.character];
          const unlocked = bot.unlockedBy === null || (levels[bot.unlockedBy]?.stars ?? 0) > 0;
          const record = records[id];
          const color = unlocked ? character.color : C.textMuted;
          return (
            <Pressable
              key={id}
              testID={`bot-${id}`}
              accessibilityRole="button"
              accessibilityLabel={l(character.name)}
              accessibilityState={{ disabled: !unlocked }}
              disabled={!unlocked}
              onPress={() => {
                haptics.tap();
                router.push({ pathname: '/play', params: { kind: 'duel', bot: id } });
              }}
              style={({ pressed }) => [
                styles.card,
                { borderColor: alpha(color, 0.6), opacity: pressed ? 0.75 : 1 },
              ]}>
              <Portrait who={bot.character} size={70} dimmed={!unlocked} />
              <View style={styles.cardText}>
                <Txt variant="label" color={unlocked ? TIER_COLORS[bot.tier] : C.textMuted} size={9}>
                  {t(`duel.tier.${bot.tier}` as StringKey)}
                  {bot.puzzle.variant === 'x' ? ` · ${t('variant.x')}` : ''}
                </Txt>
                <Txt variant="heading" color={color} glow={unlocked ? 6 : false} size={16} numberOfLines={1}>
                  {l(character.name).toUpperCase()}
                </Txt>
                <Txt variant="small" color={C.textDim} numberOfLines={1}>
                  {unlocked ? l(character.role) : t('duel.lockedBy')}
                </Txt>
              </View>
              {unlocked ? (
                <View style={styles.record}>
                  <Txt variant="num" color={C.textDim} size={14}>
                    {t('duel.record', { w: record?.wins ?? 0, l: record?.losses ?? 0 })}
                  </Txt>
                  <Icon name="duel" size={20} color={color} />
                </View>
              ) : (
                <Icon name="lock" size={20} color={C.textMuted} />
              )}
            </Pressable>
          );
        })}

        <Pressable
          testID="duel-online"
          accessibilityRole="button"
          accessibilityLabel={t('duel.online')}
          onPress={() => {
            haptics.tap();
            router.push('/online');
          }}
          style={({ pressed }) => [
            styles.card,
            styles.online,
            { borderColor: alpha(C.coral, 0.7), opacity: pressed ? 0.75 : 1 },
          ]}>
          <View style={styles.onlineIcon}>
            <Icon name="globe" size={30} color={C.coral} />
          </View>
          <View style={styles.cardText}>
            <Txt variant="heading" color={C.coral} glow={6} size={16}>
              {t('duel.online').toUpperCase()}
            </Txt>
            <Txt variant="small" color={C.textDim}>
              {t('duel.onlineSoon')}
            </Txt>
          </View>
          <View style={styles.record}>
            <Txt variant="num" color={C.textDim} size={14}>
              {t('duel.record', { w: records.online?.wins ?? 0, l: records.online?.losses ?? 0 })}
            </Txt>
            <Icon name="duel" size={20} color={C.coral} />
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rules: {
    marginBottom: 12,
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
  slotLabel: {
    letterSpacing: 0.5,
  },
  heading: {
    marginTop: 18,
    marginBottom: 8,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: alpha(C.panel, 0.92),
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  record: {
    alignItems: 'flex-end',
    gap: 6,
    paddingRight: 4,
  },
  online: {
    paddingRight: 10,
  },
  onlineIcon: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
