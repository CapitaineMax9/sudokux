import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { rankOf, rankProgress, useProgress } from '@/store/progress';
import { GlitchText } from '@/ui/GlitchText';
import { LogoMark } from '@/ui/LogoMark';
import { NeonButton } from '@/ui/NeonButton';
import { Screen } from '@/ui/Screen';
import { C, alpha, glow } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();
  const xp = useProgress((state) => state.xp);
  const freshPowers = useProgress((state) => state.freshPowers.length);
  const rank = rankOf(xp);

  return (
    <Screen>
      <View style={styles.hero}>
        <LogoMark size={108} />
        <View style={styles.logoRow}>
          <GlitchText text="SUDOKU" size={38} />
          <GlitchText text="X" size={64} color={C.magenta} restMs={3100} style={styles.logoX} />
        </View>
        <Txt variant="body" color={C.textDim} center style={styles.tagline}>
          {t('app.tagline')}
        </Txt>
      </View>

      <View style={styles.rank}>
        <View style={styles.rankLine}>
          <Txt variant="label" color={C.textDim}>
            {t('home.rank')}
          </Txt>
          <Txt variant="title" color={C.cyan} glow={6}>
            {t(`rank.${rank}` as 'rank.0').toUpperCase()}
          </Txt>
          <Txt variant="num" color={C.textDim} size={14}>
            {xp} XP
          </Txt>
        </View>
        <View style={styles.rankTrack}>
          <View style={[styles.rankFill, { width: `${Math.round(rankProgress(xp) * 100)}%` }]} />
        </View>
      </View>

      <View style={styles.menu}>
        <NeonButton
          testID="menu-story"
          label={t('home.story')}
          sub={t('home.storySub')}
          icon="story"
          size="lg"
          variant="solid"
          color={C.cyan}
          onPress={() => router.push('/story')}
        />
        <NeonButton
          testID="menu-duel"
          label={t('home.duel')}
          sub={t('home.duelSub')}
          icon="duel"
          size="lg"
          color={C.magenta}
          onPress={() => router.push('/duel')}
        />
        <NeonButton
          testID="menu-free"
          label={t('home.free')}
          sub={t('home.freeSub')}
          icon="grid"
          size="lg"
          color={C.violet}
          onPress={() => router.push('/free')}
        />
        <View style={styles.row}>
          <NeonButton
            testID="menu-powers"
            label={t('home.powers')}
            icon="bolt"
            color={C.yellow}
            badge={freshPowers > 0 ? t('common.new') : undefined}
            compact
            onPress={() => router.push('/powers')}
            style={styles.half}
          />
          <NeonButton
            testID="menu-settings"
            label={t('home.settings')}
            icon="settings"
            color={C.textDim}
            compact
            onPress={() => router.push('/settings')}
            style={styles.half}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  logoX: {
    marginLeft: 10,
  },
  tagline: {
    marginTop: 10,
  },
  rank: {
    marginBottom: 18,
    gap: 6,
  },
  rankLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: alpha(C.cyan, 0.15),
    overflow: 'hidden',
  },
  rankFill: {
    height: 4,
    backgroundColor: C.cyan,
    ...glow(C.cyan, 6),
  },
  menu: {
    gap: 12,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
});
