import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BOTS } from '@/content/bots';
import {
  CHAPTERS,
  UPCOMING_CHAPTERS,
  type Chapter,
  type StoryLevel,
} from '@/content/story';
import { haptics } from '@/game/haptics';
import { useL, useT } from '@/i18n';
import { isLevelUnlocked, useProgress } from '@/store/progress';
import { Icon } from '@/ui/Icon';
import { NeonButton } from '@/ui/NeonButton';
import { Panel } from '@/ui/Panel';
import { Portrait } from '@/ui/Portrait';
import { Screen } from '@/ui/Screen';
import { C, POWER_COLORS, alpha, glow } from '@/ui/theme';
import { Txt } from '@/ui/Txt';
import { MissionModifiers } from '@/ui/story/MissionInfo';

const KIND_COLORS = { solo: C.cyan, duel: C.magenta, boss: C.red } as const;

function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3].map((n) => (
        <Icon key={n} name="star" size={size} color={count >= n ? C.yellow : alpha(C.text, 0.14)} />
      ))}
    </View>
  );
}

interface MissionProps {
  level: StoryLevel;
  stars: number;
  unlocked: boolean;
  open: boolean;
  last: boolean;
  rewardOwned: boolean;
  onToggle: () => void;
  onStart: () => void;
}

function Mission({ level, stars, unlocked, open, last, rewardOwned, onToggle, onStart }: MissionProps) {
  const t = useT();
  const l = useL();
  const color = unlocked ? KIND_COLORS[level.kind] : C.textMuted;
  const done = stars > 0;
  const bot = level.botId ? BOTS[level.botId] : null;

  return (
    <View style={styles.mission}>
      {/* Le fil qui relie les missions entre elles. */}
      <View style={styles.rail}>
        <View
          style={[
            styles.node,
            { borderColor: color, backgroundColor: done ? alpha(color, 0.25) : C.bg },
            unlocked && !done ? glow(color, 10, 0.7) : null,
          ]}>
          {unlocked ? (
            done ? (
              <Icon name="check" size={16} color={color} />
            ) : (
              <Txt variant="title" color={color} size={13}>
                {level.number}
              </Txt>
            )
          ) : (
            <Icon name="lock" size={14} color={C.textMuted} />
          )}
        </View>
        {last ? null : (
          <View style={[styles.wire, { backgroundColor: alpha(done ? color : C.textMuted, 0.4) }]} />
        )}
      </View>

      <View style={styles.cardWrap}>
        <View
          style={[
            styles.card,
            { borderColor: alpha(color, open ? 0.9 : 0.35) },
            open ? glow(color, 12, 0.35) : null,
          ]}>
          {/* L'en-tête ouvre ou referme la fiche de la mission. */}
          <Pressable
            testID={`mission-${level.id}`}
            accessibilityRole="button"
            accessibilityLabel={l(level.title)}
            accessibilityState={{ expanded: open }}
            onPress={() => {
              haptics.tap();
              onToggle();
            }}
            style={styles.cardHead}>
            <View style={styles.cardTitles}>
              <Txt variant="label" color={color} size={9}>
                {t('story.mission', { n: level.number })} · {t(`story.kind.${level.kind}`)}
              </Txt>
              <Txt
                variant="title"
                color={unlocked ? C.text : C.textMuted}
                size={15}
                numberOfLines={1}>
                {l(level.title).toUpperCase()}
              </Txt>
            </View>
            {unlocked ? <Stars count={stars} /> : null}
          </Pressable>

          {open ? (
            <Animated.View entering={FadeIn.duration(180)} style={styles.details}>
              {unlocked ? (
                <>
                  <View style={styles.briefRow}>
                    {bot ? <Portrait who={bot.character} size={72} /> : null}
                    <Txt variant="body" color={C.textDim} size={16} style={styles.brief}>
                      {l(level.brief)}
                    </Txt>
                  </View>
                  <MissionModifiers level={level} />
                  {level.reward ? (
                    <View style={styles.reward}>
                      <Icon
                        name={level.reward}
                        size={20}
                        color={rewardOwned ? C.textMuted : POWER_COLORS[level.reward]}
                      />
                      <View style={styles.rewardText}>
                        <Txt variant="label" color={C.textDim} size={9}>
                          {t('story.reward')}
                          {rewardOwned ? ` · ${t('story.rewardOwned')}` : ''}
                        </Txt>
                        <Txt
                          variant="title"
                          size={13}
                          color={rewardOwned ? C.textMuted : POWER_COLORS[level.reward]}>
                          {t(`power.${level.reward}.name`).toUpperCase()}
                        </Txt>
                      </View>
                    </View>
                  ) : null}
                  <NeonButton
                    testID={`start-${level.id}`}
                    label={t(done ? 'story.replay' : 'story.start')}
                    icon="play"
                    variant="solid"
                    color={color}
                    onPress={onStart}
                  />
                </>
              ) : (
                <Txt variant="small" color={C.textMuted}>
                  {t('story.lockedHint')}
                </Txt>
              )}
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ChapterView({ chapter }: { chapter: Chapter }) {
  const router = useRouter();
  const t = useT();
  const l = useL();
  const levels = useProgress((state) => state.levels);
  const powers = useProgress((state) => state.powers);

  // Par défaut, on ouvre la première mission débloquée qui n'est pas encore réussie.
  const [openId, setOpenId] = useState<string | null>(() => {
    const current = chapter.levels.find(
      (level) => isLevelUnlocked(levels, level.id) && (levels[level.id]?.stars ?? 0) === 0,
    );
    return current ? current.id : null;
  });

  const earned = chapter.levels.reduce((sum, level) => sum + (levels[level.id]?.stars ?? 0), 0);
  const complete = chapter.levels.every((level) => (levels[level.id]?.stars ?? 0) > 0);

  return (
    <View style={styles.chapter}>
      <Panel color={C.cyan} style={styles.chapterHead}>
        <View style={styles.chapterTitles}>
          <Txt variant="label" color={C.magenta} size={10}>
            {t('story.chapter', { n: chapter.number })}
            {complete ? ` · ${t('story.chapterDone')}` : ''}
          </Txt>
          <Txt variant="heading" color={C.text} glow={8} size={20}>
            {l(chapter.title).toUpperCase()}
          </Txt>
          <Txt variant="small" color={C.textDim}>
            {l(chapter.subtitle)}
          </Txt>
        </View>
        <View style={styles.chapterStars}>
          <Icon name="star" size={18} color={C.yellow} />
          <Txt variant="num" color={C.yellow} size={18}>
            {earned} / {chapter.levels.length * 3}
          </Txt>
        </View>
      </Panel>

      {chapter.levels.map((level, i) => (
        <Mission
          key={level.id}
          level={level}
          stars={levels[level.id]?.stars ?? 0}
          unlocked={isLevelUnlocked(levels, level.id)}
          open={openId === level.id}
          last={i === chapter.levels.length - 1}
          rewardOwned={level.reward !== null && powers.includes(level.reward)}
          onToggle={() => setOpenId(openId === level.id ? null : level.id)}
          onStart={() =>
            router.push({ pathname: '/play', params: { kind: 'story', level: level.id } })
          }
        />
      ))}
    </View>
  );
}

export default function StoryScreen() {
  const router = useRouter();
  const t = useT();
  const l = useL();
  const levels = useProgress((state) => state.levels);

  // On ouvre le chapitre de la première mission qui reste à faire.
  const [selected, setSelected] = useState(() => {
    const index = CHAPTERS.findIndex((chapter) =>
      chapter.levels.some((level) => (levels[level.id]?.stars ?? 0) === 0),
    );
    if (index < 0) return CHAPTERS.length - 1;
    return isLevelUnlocked(levels, CHAPTERS[index].levels[0].id) ? index : Math.max(0, index - 1);
  });
  const chapter = CHAPTERS[selected];

  return (
    <Screen title={t('story.title')} onBack={() => router.back()} scroll tint={C.violet}>
      <View style={styles.tabs}>
        {CHAPTERS.map((item, index) => {
          const active = index === selected;
          const open = isLevelUnlocked(levels, item.levels[0].id);
          const tint = active ? C.cyan : open ? C.textDim : C.textMuted;
          return (
            <Pressable
              key={item.id}
              testID={`chapter-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                haptics.tap();
                setSelected(index);
              }}
              style={[
                styles.tab,
                { borderColor: alpha(tint, active ? 1 : 0.3), backgroundColor: alpha(tint, active ? 0.14 : 0.04) },
                active ? glow(C.cyan, 10, 0.4) : null,
              ]}>
              {open ? null : <Icon name="lock" size={13} color={tint} />}
              <Txt variant="title" color={tint} size={12} numberOfLines={1}>
                {item.number} · {l(item.title).toUpperCase()}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <ChapterView key={chapter.id} chapter={chapter} />

      <Txt variant="label" color={C.textMuted} size={10} style={styles.upcomingTitle}>
        {t('story.upcoming')}
      </Txt>
      <View style={styles.upcoming}>
        {UPCOMING_CHAPTERS.map((chapter) => (
          <View key={chapter.number} style={styles.upcomingRow}>
            <Icon name="lock" size={14} color={C.textMuted} />
            <View style={styles.upcomingText}>
              <Txt variant="title" color={C.textMuted} size={12}>
                {t('story.chapter', { n: chapter.number })} · {l(chapter.title).toUpperCase()}
              </Txt>
              <Txt variant="small" color={C.textMuted} size={13}>
                {l(chapter.subtitle)}
              </Txt>
            </View>
            <Txt variant="label" color={C.textMuted} size={8}>
              {t('common.soon')}
            </Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderRadius: 6,
  },
  chapter: {
    marginBottom: 8,
  },
  chapterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  chapterTitles: {
    flex: 1,
    gap: 2,
  },
  chapterStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mission: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    width: 34,
    alignItems: 'center',
  },
  node: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  wire: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -4,
  },
  cardWrap: {
    flex: 1,
    paddingBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: alpha(C.panel, 0.92),
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  cardTitles: {
    flex: 1,
    gap: 3,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  details: {
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  briefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brief: {
    flex: 1,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: alpha(C.text, 0.05),
  },
  rewardText: {
    flex: 1,
    gap: 2,
  },
  upcomingTitle: {
    marginTop: 14,
    marginBottom: 8,
  },
  upcoming: {
    gap: 6,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: alpha(C.textMuted, 0.25),
    borderRadius: 6,
    backgroundColor: alpha(C.panel, 0.5),
  },
  upcomingText: {
    flex: 1,
    gap: 1,
  },
});
