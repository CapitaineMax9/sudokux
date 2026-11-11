import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { TauntMoment } from '@/content/bots';
import type { EffectId } from '@/engine/powers';
import { CELLS } from '@/engine/sudoku';
import { matchEvents } from '@/game/events';
import type { Rival } from '@/game/rival';
import { useHasEffect, useMatch } from '@/game/selectors';
import { useL, useT } from '@/i18n';

import { Icon } from '../Icon';
import { Portrait } from '../Portrait';
import { C, FILL, POWER_COLORS, alpha, glow } from '../theme';
import { Txt } from '../Txt';

const MINI = 62;
const NINE = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/** Mini-grille : on voit où l'adversaire a déjà posé ses chiffres. */
const MiniGrid = memo(function MiniGrid({ color }: { color: string }) {
  // Un caractère par case : « g » donnée, « f » trouvée, « . » vide.
  const code = useMatch((match) => {
    const given = match.config.puzzle.puzzle;
    const values = match.opponent ? match.opponent.values : given;
    let text = '';
    for (let i = 0; i < CELLS; i++) text += given[i] !== 0 ? 'g' : values[i] !== 0 ? 'f' : '.';
    return text;
  }, '');

  return (
    <View style={styles.mini}>
      {NINE.map((row) => (
        <View key={row} style={styles.miniRow}>
          {NINE.map((col) => {
            const kind = code[row * 9 + col];
            return (
              <View
                key={col}
                style={[
                  styles.miniCell,
                  col % 3 === 2 && col < 8 ? styles.miniGapRight : null,
                  row % 3 === 2 && row < 8 ? styles.miniGapBottom : null,
                  {
                    backgroundColor:
                      kind === 'f' ? color : kind === 'g' ? alpha(C.text, 0.22) : alpha(C.text, 0.05),
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

function ProgressLine({
  label,
  done,
  total,
  color,
}: {
  label: string;
  done: number;
  total: number;
  color: string;
}) {
  const ratio = total > 0 ? done / total : 0;
  return (
    <View style={styles.progressLine}>
      <Txt variant="label" color={color} size={8} numberOfLines={1} style={styles.progressLabel}>
        {label}
      </Txt>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <Txt variant="num" color={color} size={13} style={styles.progressValue}>
        {total - done}
      </Txt>
    </View>
  );
}

const EFFECT_ICONS: EffectId[] = ['freeze', 'glitch', 'blackout', 'flip', 'shield', 'mirror'];

function EffectBadge({ effect }: { effect: EffectId }) {
  const active = useHasEffect('opponent', effect);
  if (!active) return null;
  const color = POWER_COLORS[effect];
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: alpha(color, 0.18) }]}>
      <Icon name={effect} size={12} color={color} />
    </View>
  );
}

interface OpponentPanelProps {
  rival: Rival;
  /** Vrai une fois le décompte terminé : l'adversaire peut commencer à parler. */
  active: boolean;
}

/** Bandeau de l'adversaire en duel : portrait, avancée comparée, effets, répliques. */
export const OpponentPanel = memo(function OpponentPanel({ rival, active }: OpponentPanelProps) {
  const t = useT();
  const l = useL();
  const taunts = rival.taunts;
  const total = useMatch((match) => CELLS - match.config.puzzle.clues, 0);
  const theirs = useMatch((match) => match.opponent?.remaining ?? 0, 0);
  const mine = useMatch((match) => match.player.remaining, 0);
  const incoming = useMatch(
    (match) => match.pending.find((attack) => attack.target === 'opponent')?.power ?? '',
    '',
  );

  const [taunt, setTaunt] = useState<{ id: number; text: string } | null>(null);
  const lastTauntAt = useRef(0);
  const leadTaunted = useRef(false);
  const nextId = useRef(1);
  const hit = useSharedValue(0);
  const [hitColor, setHitColor] = useState<string>(C.red);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const say = (moment: TauntMoment, force = false) => {
      const now = Date.now();
      if (!force && now - lastTauntAt.current < 5000) return;
      const lines = taunts ? taunts[moment] : [];
      if (lines.length === 0) return;
      lastTauntAt.current = now;
      const line = lines[Math.floor(Math.random() * lines.length)];
      if (timer) clearTimeout(timer);
      setTaunt({ id: nextId.current++, text: l(line) });
      timer = setTimeout(() => setTaunt(null), 2600);
    };

    const opening = active ? setTimeout(() => say('start', true), 500) : null;
    const unsubscribe = matchEvents.on((event) => {
      switch (event.type) {
        case 'attackLaunched':
          if (event.attack.from === 'opponent') say('attack');
          break;
        case 'attackHit':
          if (event.attack.target === 'opponent') {
            setHitColor(POWER_COLORS[event.attack.power]);
            hit.value = withSequence(
              withTiming(0.75, { duration: 60 }),
              withTiming(0, { duration: 500 }),
            );
            say('hit');
          }
          break;
        case 'attackBlocked':
          if (event.attack.target === 'opponent') say('blocked', true);
          break;
        case 'finished':
          if (event.reason !== 'abandon') say(event.result === 'won' ? 'lose' : 'win', true);
          break;
        default:
          break;
      }
    });
    return () => {
      if (opening) clearTimeout(opening);
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [active, taunts, hit, l]);

  // Première fois que l'adversaire prend une nette avance : il se moque.
  useEffect(() => {
    if (!leadTaunted.current && total > 0 && mine - theirs >= 5) {
      leadTaunted.current = true;
      const lines = taunts ? taunts.lead : [];
      if (lines.length > 0) {
        lastTauntAt.current = Date.now();
        setTaunt({ id: nextId.current++, text: l(lines[0]) });
        const timer = setTimeout(() => setTaunt(null), 2600);
        return () => clearTimeout(timer);
      }
    }
  }, [taunts, l, mine, theirs, total]);

  const hitStyle = useAnimatedStyle(() => ({ opacity: hit.value }));
  const color = rival.color;

  return (
    <View style={[styles.panel, { borderColor: alpha(color, 0.45) }]} testID="opponent">
      <Portrait who={rival.portrait} size={64} tint={rival.color} />
      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <Txt variant="title" color={color} glow={6} size={13} numberOfLines={1} style={styles.name}>
            {rival.name.toUpperCase()}
          </Txt>
          <View style={styles.badges}>
            {EFFECT_ICONS.map((effect) => (
              <EffectBadge key={effect} effect={effect} />
            ))}
            {incoming ? (
              <View style={[styles.badge, styles.incoming]}>
                <Icon name="bolt" size={12} color={C.yellow} />
              </View>
            ) : null}
          </View>
        </View>
        <ProgressLine
          label={rival.name.split(' ').pop() as string}
          done={total - theirs}
          total={total}
          color={color}
        />
        <ProgressLine label={t('game.you')} done={total - mine} total={total} color={C.cyan} />
      </View>
      <MiniGrid color={color} />

      <Animated.View pointerEvents="none" style={[FILL, { backgroundColor: hitColor }, hitStyle]} />

      {taunt ? (
        <Animated.View
          key={taunt.id}
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(220)}
          pointerEvents="none"
          style={[styles.bubble, { borderColor: color }, glow(color, 10, 0.5)]}>
          <Txt variant="bodyBold" color={C.text} size={15} numberOfLines={2}>
            {taunt.text}
          </Txt>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: alpha(C.panel, 0.92),
    overflow: 'visible',
  },
  middle: {
    flex: 1,
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 20,
  },
  name: {
    flexShrink: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
  },
  incoming: {
    borderColor: C.yellow,
    backgroundColor: alpha(C.yellow, 0.18),
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    width: 44,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: alpha(C.text, 0.1),
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  progressValue: {
    width: 20,
    textAlign: 'right',
  },
  mini: {
    width: MINI,
    height: MINI,
    padding: 2,
    backgroundColor: alpha(C.bg, 0.8),
    borderRadius: 3,
  },
  miniRow: {
    flex: 1,
    flexDirection: 'row',
  },
  miniCell: {
    flex: 1,
    margin: 0.5,
    borderRadius: 1,
  },
  miniGapRight: {
    marginRight: 1.5,
  },
  miniGapBottom: {
    marginBottom: 1.5,
  },
  bubble: {
    position: 'absolute',
    left: 78,
    right: 8,
    top: 6,
    bottom: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: 6,
    backgroundColor: alpha(C.bg, 0.96),
  },
});
