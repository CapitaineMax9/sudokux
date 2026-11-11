import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { MatchSummary } from '@/engine/match';
import { POWERS } from '@/engine/powers';
import { haptics } from '@/game/haptics';
import { rivalOf } from '@/game/rival';
import type { MatchSetup } from '@/game/setup';
import { formatNumber, formatTime, useL, useT, type StringKey } from '@/i18n';
import { RANK_THRESHOLDS, rankOf, rankProgress, type StoryOutcome } from '@/store/progress';

import { GlitchText } from '../GlitchText';
import { Icon } from '../Icon';
import { NeonButton } from '../NeonButton';
import { Panel } from '../Panel';
import { C, POWER_COLORS, alpha, glow } from '../theme';
import { Txt } from '../Txt';
import { ParticleBurst } from './Overlays';

function Star({ earned, delay }: { earned: boolean; delay: number }) {
  const scale = useSharedValue(earned ? 0 : 1);
  useEffect(() => {
    if (!earned) return;
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.6, { duration: 140 }),
        withSpring(1, { damping: 14, stiffness: 220 }),
      ),
    );
    const timer = setTimeout(() => haptics.medium(), delay);
    return () => clearTimeout(timer);
  }, [delay, earned, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        style,
        styles.star,
        earned ? { backgroundColor: alpha(C.yellow, 0.1), ...glow(C.yellow, 16, 0.5) } : null,
      ]}>
      <Icon name="star" size={46} color={earned ? C.yellow : alpha(C.text, 0.12)} />
    </Animated.View>
  );
}

function Row({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Txt variant="small" color={C.textDim} size={15}>
        {label}
      </Txt>
      <Txt variant="num" color={color} size={17}>
        {value}
      </Txt>
    </View>
  );
}

function Criterion({ done, label }: { done: boolean; label: string }) {
  const tint = done ? C.yellow : C.textMuted;
  return (
    <View style={styles.criterion}>
      <Icon name={done ? 'check' : 'close'} size={14} color={tint} />
      <Txt variant="small" color={done ? C.text : C.textMuted} size={14}>
        {label}
      </Txt>
    </View>
  );
}

export interface ResultViewProps {
  setup: MatchSetup;
  summary: MatchSummary;
  outcome: StoryOutcome;
  xpAfter: number;
  /** Présent seulement s'il existe une mission suivante débloquée. */
  onNext?: () => void;
  onRetry: () => void;
  onExit: () => void;
}

/** Écran de fin de partie : verdict, étoiles, détail du score, récompenses. */
export function ResultView({
  setup,
  summary,
  outcome,
  xpAfter,
  onNext,
  onRetry,
  onExit,
}: ResultViewProps) {
  const t = useT();
  const l = useL();
  const duel = setup.config.mode === 'duel';
  const story = setup.meta.kind === 'story';
  const won = summary.won;
  const color = won ? (duel ? C.magenta : C.cyan) : C.red;
  const titleKey: StringKey = won ? (duel ? 'result.winDuel' : 'result.winSolo') : 'result.lose';

  const botName = rivalOf(setup, l)?.name ?? '';
  const reason =
    summary.reason === 'forfeit' || (!won && summary.reason && summary.reason !== 'solved')
      ? t(`reason.${summary.reason}` as StringKey, { name: botName })
      : null;

  const criteria = duel
    ? [
        { done: won, label: t('star.win') },
        { done: summary.stars >= 2, label: t('star.lead4') },
        { done: summary.stars >= 3, label: t('star.lead8') },
      ]
    : [
        { done: won, label: t('star.finish') },
        { done: won && summary.mistakes <= 1, label: t('star.careful') },
        {
          done: won && summary.timeMs <= setup.parTimeMs,
          label: t('star.fast', { time: formatTime(setup.parTimeMs) }),
        },
      ];

  const rank = rankOf(xpAfter);
  const rankedUp = outcome.rankAfter > outcome.rankBefore;
  const nextThreshold = RANK_THRESHOLDS[rank + 1];

  return (
    <View style={styles.root} testID="result">
      {won ? <ParticleBurst seed={summary.score + 3} radius={260} count={44} /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <GlitchText text={t(titleKey)} size={30} color={color} letterSpacing={2} restMs={1800} />
          {setup.level ? (
            <Txt variant="label" color={C.textDim} size={10} style={styles.sub}>
              {t('story.mission', { n: setup.level.number })} · {l(setup.level.title)}
            </Txt>
          ) : null}
          {reason ? (
            <Txt variant="body" color={C.textDim} center style={styles.sub}>
              {reason}
            </Txt>
          ) : null}
        </View>

        <View style={styles.stars}>
          {[1, 2, 3].map((n) => (
            <Star key={n} earned={summary.stars >= n} delay={250 + n * 260} />
          ))}
        </View>
        <View style={styles.criteria}>
          {criteria.map((item) => (
            <Criterion key={item.label} done={item.done} label={item.label} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(300).duration(260)}>
          <Panel color={color} style={styles.panel}>
            <Row label={t('result.time')} value={formatTime(summary.timeMs)} />
            <Row
              label={t('result.mistakes')}
              value={String(summary.mistakes)}
              color={summary.mistakes === 0 ? C.green : C.text}
            />
            <Row label={t('result.bestCombo')} value={`×${summary.bestCombo}`} />
            <View style={styles.rule} />
            <Row label={t('result.score')} value={formatNumber(summary.score)} />
            {won ? (
              <Row
                label={t(duel ? 'result.leadBonus' : 'result.speedBonus')}
                value={`+${formatNumber(summary.speedBonus)}`}
              />
            ) : null}
            {summary.flawlessBonus > 0 ? (
              <Row
                label={t('result.flawless')}
                value={`+${formatNumber(summary.flawlessBonus)}`}
                color={C.green}
              />
            ) : null}
            <View style={styles.rule} />
            <View style={styles.row}>
              <Txt variant="title" color={color} size={13}>
                {t('result.total').toUpperCase()}
              </Txt>
              <Txt variant="num" color={color} glow={8} size={24} testID="result-total">
                {formatNumber(summary.total)}
              </Txt>
            </View>
          </Panel>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(480).duration(260)} style={styles.xp}>
          <View style={styles.xpLine}>
            <Txt variant="title" color={C.cyan} size={12}>
              {t(`rank.${rank}` as StringKey).toUpperCase()}
            </Txt>
            <Txt variant="num" color={C.yellow} glow={6} size={18}>
              {t('result.xp', { n: summary.xp })}
            </Txt>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(rankProgress(xpAfter) * 100)}%` }]} />
          </View>
          <Txt variant="num" color={C.textMuted} size={13}>
            {nextThreshold === undefined ? `${xpAfter} XP` : `${xpAfter} / ${nextThreshold} XP`}
          </Txt>
          {rankedUp ? (
            <Txt variant="title" color={C.yellow} glow={10} size={13} center>
              ▲ {t('result.rankUp')}
            </Txt>
          ) : null}
        </Animated.View>

        {outcome.unlocked ? (
          <Animated.View entering={FadeInDown.delay(700).duration(300)}>
            <Panel color={POWER_COLORS[outcome.unlocked]} style={styles.unlock}>
              <View
                style={[
                  styles.unlockIcon,
                  { borderColor: POWER_COLORS[outcome.unlocked] },
                  glow(POWER_COLORS[outcome.unlocked], 14, 0.6),
                ]}>
                <Icon name={outcome.unlocked} size={34} color={POWER_COLORS[outcome.unlocked]} />
              </View>
              <View style={styles.unlockText}>
                <Txt variant="label" color={C.yellow} size={9}>
                  {t('result.unlocked')} · {t(`kind.${POWERS[outcome.unlocked].kind}`)}
                </Txt>
                <Txt variant="heading" color={POWER_COLORS[outcome.unlocked]} glow={8} size={18}>
                  {t(`power.${outcome.unlocked}.name`).toUpperCase()}
                </Txt>
                <Txt variant="small" color={C.textDim} size={14}>
                  {t(`power.${outcome.unlocked}.desc`)}
                </Txt>
              </View>
            </Panel>
          </Animated.View>
        ) : null}

        <View style={styles.buttons}>
          {onNext ? (
            <NeonButton
              testID="result-next"
              label={t('result.next')}
              variant="solid"
              color={C.cyan}
              icon="play"
              onPress={onNext}
            />
          ) : null}
          <NeonButton
            testID="result-retry"
            label={t(won ? 'result.replay' : 'result.retry')}
            variant={won || onNext ? 'outline' : 'solid'}
            color={won ? C.violet : C.cyan}
            icon="retry"
            onPress={onRetry}
          />
          <NeonButton
            testID="result-exit"
            label={t(story ? 'result.backToStory' : 'result.menu')}
            variant="ghost"
            color={C.textDim}
            icon={story ? 'story' : 'home'}
            onPress={onExit}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 28,
    gap: 14,
  },
  head: {
    alignItems: 'center',
  },
  sub: {
    marginTop: 6,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
  },
  star: {
    borderRadius: 32,
    padding: 9,
  },
  criteria: {
    alignSelf: 'center',
    gap: 3,
  },
  criterion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panel: {
    gap: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rule: {
    height: 1,
    backgroundColor: alpha(C.text, 0.1),
    marginVertical: 2,
  },
  xp: {
    gap: 5,
  },
  xpLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: alpha(C.cyan, 0.15),
    overflow: 'hidden',
  },
  xpFill: {
    height: 6,
    backgroundColor: C.cyan,
  },
  unlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  unlockIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: alpha(C.bg, 0.8),
  },
  unlockText: {
    flex: 1,
    gap: 2,
  },
  buttons: {
    gap: 10,
    marginTop: 4,
  },
});
