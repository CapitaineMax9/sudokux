import { StyleSheet, View } from 'react-native';

import { BOTS } from '@/content/bots';
import { CHARACTERS } from '@/content/characters';
import type { StoryLevel } from '@/content/story';
import { formatTime, useL, useT } from '@/i18n';

import { Icon, type IconName } from '../Icon';
import { C } from '../theme';
import { Txt } from '../Txt';

function Modifier({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View style={styles.modifier}>
      <Icon name={icon} size={16} color={color} />
      <Txt variant="small" color={color} size={15} style={styles.text}>
        {text}
      </Txt>
    </View>
  );
}

/** Particularités d'une mission : chrono, erreurs permises, contre-mesures, adversaire. */
export function MissionModifiers({ level }: { level: StoryLevel }) {
  const t = useT();
  const l = useL();
  const bot = level.botId ? BOTS[level.botId] : null;

  return (
    <View style={styles.list}>
      {bot ? (
        <Modifier
          icon="duel"
          color={CHARACTERS[bot.character].color}
          text={t('mod.opponent', { name: l(CHARACTERS[bot.character].name) })}
        />
      ) : null}
      {level.puzzle.variant === 'x' ? (
        <Modifier icon="close" color={C.magenta} text={t('mod.xvariant')} />
      ) : null}
      {level.timeLimitMs !== null ? (
        <Modifier
          icon="clock"
          color={C.orange}
          text={t('mod.timer', { time: formatTime(level.timeLimitMs) })}
        />
      ) : null}
      {level.countermeasures ? (
        <Modifier icon="alert" color={C.red} text={t('mod.counter')} />
      ) : null}
      {level.maxMistakes !== null ? (
        <Modifier icon="shield" color={C.textDim} text={t('mod.mistakes', { n: level.maxMistakes })} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 6,
  },
  modifier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
  },
});
