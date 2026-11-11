import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CHARACTERS } from '@/content/characters';
import { nextLevelId } from '@/content/story';
import { summarizeMatch, type MatchSummary } from '@/engine/match';
import type { Difficulty, Variant } from '@/engine/sudoku';
import { matchEvents } from '@/game/events';
import { useStayAwake } from '@/game/keepAwake';
import { rivalOf } from '@/game/rival';
import {
  buildDuelMatch,
  buildFreeMatch,
  buildOnlineMatch,
  buildStoryMatch,
  freeKey,
  type MatchSetup,
} from '@/game/setup';
import { useL, useT } from '@/i18n';
import { useOnline } from '@/net/online';
import { dispatchMatch, useMatchStore } from '@/store/match';
import { isLevelUnlocked, useProgress, type StoryOutcome } from '@/store/progress';
import { GlitchText } from '@/ui/GlitchText';
import { NeonButton } from '@/ui/NeonButton';
import { Panel } from '@/ui/Panel';
import { Portrait } from '@/ui/Portrait';
import { Screen } from '@/ui/Screen';
import { C, FILL, alpha } from '@/ui/theme';
import { Txt } from '@/ui/Txt';
import { ActionBar } from '@/ui/game/ActionBar';
import { Board } from '@/ui/game/Board';
import { ChargeBar } from '@/ui/game/ChargeBar';
import { Hud } from '@/ui/game/Hud';
import { NumberPad } from '@/ui/game/NumberPad';
import { OpponentPanel } from '@/ui/game/OpponentPanel';
import {
  Announcer,
  AttackWarning,
  FlashOverlay,
  ParticleBurst,
  StartCountdown,
} from '@/ui/game/Overlays';
import { ResultView } from '@/ui/game/ResultView';
import { DialogueScene } from '@/ui/story/DialogueScene';
import { MissionModifiers } from '@/ui/story/MissionInfo';

/**
 * Étapes d'une partie :
 * chargement → dialogue d'intro → consignes → décompte → jeu → animation de
 * fin → dialogue de fin → résultats.
 */
type Phase =
  | 'loading'
  | 'intro'
  | 'briefing'
  | 'countdown'
  | 'playing'
  | 'finishing'
  | 'outro'
  | 'result';

interface Outcome {
  summary: MatchSummary;
  outcome: StoryOutcome;
  xpAfter: number;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

const asDifficulty = (value: string | undefined): Difficulty =>
  DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : 'easy';

const asVariant = (value: string | undefined): Variant => (value === 'x' ? 'x' : 'classic');

/** Lit un paramètre d'URL qui peut arriver sous forme de tableau. */
const one = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

function PauseModal({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  /** Absent en ligne : on ne recommence pas un duel contre un autre joueur. */
  onRestart?: () => void;
  onQuit: () => void;
}) {
  const t = useT();
  return (
    <Animated.View entering={FadeIn.duration(120)} style={[FILL, styles.pauseCover]} testID="pause-modal">
      <Panel color={C.cyan} style={styles.pausePanel}>
        <Txt variant="display" color={C.cyan} glow={14} size={28} center>
          {t(onRestart ? 'game.paused' : 'game.quitTitle')}
        </Txt>
        <NeonButton
          testID="pause-resume"
          label={t('game.resume')}
          icon="play"
          variant="solid"
          onPress={onResume}
        />
        {onRestart ? (
          <NeonButton
            testID="pause-restart"
            label={t('game.restart')}
            icon="retry"
            color={C.violet}
            onPress={onRestart}
          />
        ) : null}
        <NeonButton
          testID="pause-quit"
          label={t('game.quit')}
          icon="close"
          color={C.red}
          variant="ghost"
          onPress={onQuit}
        />
      </Panel>
    </Animated.View>
  );
}

/** Affiche du duel pendant le décompte : X contre son adversaire. */
function Versus({ setup }: { setup: MatchSetup }) {
  const l = useL();
  const foe = rivalOf(setup, l);
  if (!foe) return null;
  return (
    <View style={styles.versus}>
      <View style={styles.fighter}>
        <Portrait who="x" size={104} />
        <Txt variant="title" color={CHARACTERS.x.color} glow={6}>
          {l(CHARACTERS.x.name).toUpperCase()}
        </Txt>
      </View>
      <Txt variant="display" color={C.yellow} glow={12} size={26}>
        VS
      </Txt>
      <View style={styles.fighter}>
        <Portrait who={foe.portrait} size={104} tint={foe.color} />
        <Txt variant="title" color={foe.color} glow={6} numberOfLines={2} center>
          {foe.name.toUpperCase()}
        </Txt>
      </View>
    </View>
  );
}

export default function PlayScreen() {
  const router = useRouter();
  const t = useT();
  const l = useL();
  const window = useWindowDimensions();
  const params = useLocalSearchParams();
  const kind = one(params.kind);
  const levelId = one(params.level);
  const botId = one(params.bot);
  const difficulty = one(params.difficulty);
  const variant = one(params.variant);
  const seedParam = one(params.seed);

  const setup = useMatchStore((store) => store.setup);
  const runId = useMatchStore((store) => store.runId);
  const status = useMatchStore((store) => store.match?.status ?? null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [result, setResult] = useState<Outcome | null>(null);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  /** Numéro de la dernière partie lancée par cet écran (voir le nettoyage plus bas). */
  const ownedRun = useRef(-1);
  /** En ligne, on ne peut pas mettre en pause : le bouton propose seulement d'abandonner. */
  const [quitting, setQuitting] = useState(false);

  useStayAwake();

  /** Prépare une partie neuve. `withStory` = rejouer aussi les dialogues et consignes. */
  const begin = useCallback(
    (withStory: boolean) => {
      const { powers, loadout, soloLoadout } = useProgress.getState();
      const player = { powers, loadout, soloLoadout };
      const seed = seedParam && /^\d+$/.test(seedParam) ? Number(seedParam) : undefined;

      let next: MatchSetup | null;
      if (kind === 'online') {
        // La grille et l'adversaire viennent du serveur.
        const found = useOnline.getState().found;
        next = found ? buildOnlineMatch(found, player) : null;
        if (!next) {
          router.replace('/online');
          return;
        }
      } else if (kind === 'story' && levelId) next = buildStoryMatch(levelId, player);
      else if (kind === 'duel' && botId) next = buildDuelMatch(botId, player, seed);
      else next = buildFreeMatch(asDifficulty(difficulty), asVariant(variant), player, seed);

      if (!next) {
        router.replace('/');
        return;
      }
      useMatchStore.getState().start(next);
      ownedRun.current = useMatchStore.getState().runId;
      if (next.config.remote) useOnline.getState().beginRelay();
      setResult(null);
      setQuitting(false);
      if (withStory && next.level) setPhase(next.level.intro.length > 0 ? 'intro' : 'briefing');
      else setPhase('countdown');
    },
    [kind, levelId, botId, difficulty, variant, seedParam, router],
  );

  // Premier lancement : on laisse l'écran de chargement s'afficher avant de générer la grille.
  useEffect(() => {
    const timer = setTimeout(() => begin(true), 40);
    return () => clearTimeout(timer);
  }, [begin]);

  // En quittant l'écran, on libère la partie — sauf si un autre écran de jeu
  // en a déjà lancé une nouvelle entre-temps (transition entre deux missions).
  useEffect(
    () => () => {
      const store = useMatchStore.getState();
      if (store.runId === ownedRun.current) {
        if (store.setup?.config.remote) useOnline.getState().leaveMatch();
        store.clear();
      }
    },
    [],
  );

  // L'horloge de la partie.
  useEffect(() => {
    if (phase !== 'playing') return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      // Si l'appli a été figée un moment, on n'avance pas le temps d'un seul bond.
      const dt = Math.min(250, now - last);
      last = now;
      dispatchMatch({ type: 'tick', dt });
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  // Fin de partie : on enregistre le résultat tout de suite, puis on joue l'animation.
  useEffect(
    () =>
      matchEvents.on((event) => {
        if (event.type !== 'finished') return;
        const { match, setup: current } = useMatchStore.getState();
        if (!match || !current) return;
        const summary = summarizeMatch(match, current.parTimeMs);
        const progress = useProgress.getState();
        let outcome: StoryOutcome;
        if (current.meta.kind === 'story') {
          outcome = progress.recordStory(current.meta.levelId, summary);
        } else if (current.meta.kind === 'duel') {
          outcome = progress.recordDuel(current.meta.botId, summary);
        } else if (current.meta.kind === 'online') {
          outcome = progress.recordDuel('online', summary);
        } else {
          const key = freeKey(current.meta.difficulty, current.meta.variant);
          outcome = progress.recordFree(key, summary);
        }
        setResult({ summary, outcome, xpAfter: useProgress.getState().xp });
        setPhase('finishing');
      }),
    [],
  );

  useEffect(() => {
    if (phase !== 'finishing') return;
    const timer = setTimeout(() => {
      const level = useMatchStore.getState().setup?.level;
      const hasOutro = result?.summary.won && level && level.outro.length > 0;
      setPhase(hasOutro ? 'outro' : 'result');
    }, 2000);
    return () => clearTimeout(timer);
  }, [phase, result]);

  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(kind === 'story' ? '/story' : kind === 'duel' ? '/duel' : '/');
  }, [kind, router]);

  const online = kind === 'online';
  const pause = useCallback(() => {
    if (online) setQuitting(true);
    else dispatchMatch({ type: 'pause' });
  }, [online]);
  const resume = useCallback(() => dispatchMatch({ type: 'resume' }), []);
  const restart = useCallback(() => begin(false), [begin]);

  // Bouton retour d'Android : il met en pause au lieu de quitter la partie.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'playing') {
        if (useMatchStore.getState().match?.status === 'paused') resume();
        else pause();
        return true;
      }
      // Avant ou après la partie, le bouton quitte l'écran ; pendant les
      // animations de fin, on l'ignore pour ne rien interrompre.
      if (phase !== 'finishing' && phase !== 'outro') exit();
      return true;
    });
    return () => subscription.remove();
  }, [phase, pause, resume, exit]);

  // L'appli passe en arrière-plan en pleine partie : pause automatique.
  useEffect(() => {
    if (phase !== 'playing' || online) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') dispatchMatch({ type: 'pause' });
    });
    return () => subscription.remove();
  }, [phase, online]);

  /** Fin du décompte. En ligne, on attend l'heure du coup d'envoi commun. */
  const onCountdownDone = useCallback(() => {
    const startAt = useOnline.getState().found?.startAt;
    const wait = online && startAt ? Math.max(0, startAt - Date.now()) : 0;
    if (wait === 0) setPhase('playing');
    else setTimeout(() => setPhase((current) => (current === 'countdown' ? 'playing' : current)), wait);
  }, [online]);

  const onBoardArea = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((previous) =>
      previous && previous.width === width && previous.height === height
        ? previous
        : { width, height },
    );
  }, []);

  if (phase === 'loading' || !setup) {
    return (
      <Screen>
        <View style={styles.centered} testID="loading">
          <Txt variant="label" color={C.cyan} glow={8} size={12}>
            {t('game.loading')}
          </Txt>
        </View>
      </Screen>
    );
  }

  const level = setup.level;

  if (phase === 'intro' && level) {
    return (
      <Screen padded={false} tint={C.violet}>
        <DialogueScene key={`intro-${runId}`} lines={level.intro} onDone={() => setPhase('briefing')} />
      </Screen>
    );
  }

  if (phase === 'outro' && level) {
    return (
      <Screen padded={false} tint={C.violet}>
        <DialogueScene key={`outro-${runId}`} lines={level.outro} onDone={() => setPhase('result')} />
      </Screen>
    );
  }

  if (phase === 'briefing' && level) {
    return (
      <Screen>
        <View style={styles.centered} testID="briefing">
          <Panel color={C.cyan} style={styles.briefing}>
            <Txt variant="label" color={C.magenta} size={10}>
              {t('story.mission', { n: level.number })} · {t(`story.kind.${level.kind}`)}
            </Txt>
            <Txt variant="heading" color={C.text} glow={8} size={21}>
              {l(level.title).toUpperCase()}
            </Txt>
            <Txt variant="body" color={C.textDim}>
              {l(level.brief)}
            </Txt>
            <MissionModifiers level={level} />
            <NeonButton
              testID="briefing-start"
              label={t('common.continue')}
              icon="play"
              variant="solid"
              onPress={() => setPhase('countdown')}
              style={styles.briefingButton}
            />
          </Panel>
        </View>
      </Screen>
    );
  }

  if (phase === 'result' && result) {
    const upcoming = level ? nextLevelId(level.id) : null;
    const canAdvance =
      result.summary.won &&
      upcoming !== null &&
      isLevelUnlocked(useProgress.getState().levels, upcoming);
    return (
      <Screen padded={false} tint={result.summary.won ? C.cyan : C.red}>
        <ResultView
          key={`result-${runId}`}
          setup={setup}
          summary={result.summary}
          outcome={result.outcome}
          xpAfter={result.xpAfter}
          onNext={
            canAdvance && upcoming
              ? // On reste sur le même écran : changer le paramètre relance `begin`.
                () => router.setParams({ level: upcoming })
              : undefined
          }
          onRetry={online ? exit : restart}
          onExit={exit}
        />
      </Screen>
    );
  }

  const duel = setup.config.mode === 'duel';
  const rival = rivalOf(setup, l);
  const title = level
    ? l(level.title)
    : online
      ? t('duel.online')
      : setup.bot
      ? t('duel.title')
      : t(`difficulty.${setup.config.puzzle.difficulty}`);
  const tag = setup.config.puzzle.variant === 'x' ? t('game.xseal') : undefined;
  const padHeight = window.height < 700 ? 50 : 60;
  const won = result?.summary.won ?? false;

  return (
    <Screen padded={false} tint={duel ? C.magenta : C.cyan}>
      <View style={styles.game}>
        <Hud title={title} tag={tag} onPause={pause} />
        {rival ? (
          <OpponentPanel key={`foe-${runId}`} rival={rival} active={phase === 'playing'} />
        ) : null}

        <View style={styles.boardArea} onLayout={onBoardArea}>
          {area ? <Board key={`board-${runId}`} maxSize={Math.min(area.width, area.height)} /> : null}
          <Announcer />
          <AttackWarning />
        </View>

        <ChargeBar />
        <ActionBar />
        <NumberPad height={padHeight} />
      </View>

      <FlashOverlay />

      {phase === 'countdown' ? (
        <StartCountdown key={`count-${runId}`} onDone={onCountdownDone}>
          <Versus setup={setup} />
        </StartCountdown>
      ) : null}

      {phase === 'finishing' ? (
        <View style={[FILL, styles.finish]} pointerEvents="none" testID="finish">
          {won ? <ParticleBurst seed={runId} /> : null}
          <GlitchText
            text={t(won ? (duel ? 'result.winDuel' : 'result.winSolo') : 'result.lose')}
            size={32}
            color={won ? (duel ? C.magenta : C.cyan) : C.red}
            letterSpacing={2}
            restMs={300}
          />
        </View>
      ) : null}

      {phase === 'playing' && status === 'paused' ? (
        <PauseModal onResume={resume} onRestart={restart} onQuit={exit} />
      ) : null}
      {phase === 'playing' && quitting ? (
        <PauseModal onResume={() => setQuitting(false)} onQuit={exit} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  game: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefing: {
    width: '100%',
    gap: 12,
    padding: 20,
  },
  briefingButton: {
    marginTop: 6,
  },
  versus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 18,
  },
  fighter: {
    alignItems: 'center',
    gap: 8,
    width: 132,
    minHeight: 150,
  },
  finish: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(C.bg, 0.6),
  },
  pauseCover: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: alpha(C.bg, 0.97),
  },
  pausePanel: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
    padding: 22,
  },
});
