/**
 * Effets passagers affichés par-dessus la partie : annonces, alerte
 * d'attaque, flash de couleur, particules et compte à rebours de départ.
 */
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { PowerId } from '@/engine/powers';
import { mulberry32 } from '@/engine/rng';
import { matchEvents } from '@/game/events';
import { haptics } from '@/game/haptics';
import { useMatch } from '@/game/selectors';
import { useT } from '@/i18n';
import { useMatchStore } from '@/store/match';

import { Icon, type IconName } from '../Icon';
import { C, F, FILL, POWER_COLORS, alpha, glow, textGlow } from '../theme';
import { Txt } from '../Txt';

/* ------------------------------------------------------------------ */
/* Annonces : nom du pouvoir lancé, « BLOQUÉ », raisons de refus        */
/* ------------------------------------------------------------------ */

interface Announcement {
  id: number;
  text: string;
  color: string;
  icon?: IconName;
  small?: boolean;
}

function AnnouncementView({ item }: { item: Announcement }) {
  const scale = useSharedValue(item.small ? 0.9 : 0.5);
  const opacity = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    const hold = item.small ? 900 : 650;
    scale.value = withSpring(1, { damping: 10, stiffness: 220 });
    opacity.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(hold, withTiming(0, { duration: 260 })),
    );
    lift.value = withDelay(hold, withTiming(-26, { duration: 300 }));
  }, [item.small, lift, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  if (item.small) {
    return (
      <Animated.View style={[styles.toast, { borderColor: alpha(item.color, 0.7) }, style]}>
        <Txt variant="bodyBold" color={item.color} size={15}>
          {item.text}
        </Txt>
      </Animated.View>
    );
  }
  return (
    <Animated.View
      style={[styles.announce, { borderColor: item.color }, glow(item.color, 22, 0.7), style]}>
      {item.icon ? <Icon name={item.icon} size={30} color={item.color} /> : null}
      <Txt variant="heading" color={item.color} glow={12} size={22}>
        {item.text.toUpperCase()}
      </Txt>
    </Animated.View>
  );
}

/** Affiche au centre de la grille ce que le joueur vient de déclencher. */
export const Announcer = memo(function Announcer() {
  const t = useT();
  const [item, setItem] = useState<Announcement | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const show = (announcement: Omit<Announcement, 'id'>) => {
      if (timer) clearTimeout(timer);
      setItem({ ...announcement, id: nextId.current++ });
      timer = setTimeout(() => setItem(null), 1400);
    };
    const powerName = (power: PowerId) => t(`power.${power}.name`);

    const unsubscribe = matchEvents.on((event) => {
      switch (event.type) {
        case 'powerUsed':
          if (event.side === 'player') {
            show({ text: powerName(event.power), color: POWER_COLORS[event.power], icon: event.power });
          }
          break;
        case 'powerDenied':
          haptics.warning();
          show({ text: t(`deny.${event.reason}`), color: C.orange, small: true });
          break;
        case 'attackBlocked':
          if (event.attack.target === 'player') {
            haptics.success();
            show({ text: t('game.blocked'), color: C.green, icon: 'shield' });
          } else {
            show({ text: t('game.blocked'), color: C.red, icon: 'shield' });
          }
          break;
        case 'attackReflected':
          // Renvoyée par notre Miroir (bonne nouvelle) ou par celui d'en face.
          if (event.attack.target === 'player') haptics.success();
          show({
            text: t('game.reflected'),
            color: event.attack.target === 'player' ? C.silver : C.red,
            icon: 'mirror',
          });
          break;
        case 'attackHit':
          if (event.attack.power === 'siphon' && event.amount > 0) {
            const mine = event.attack.target === 'opponent';
            show({
              text: t(mine ? 'game.stolen' : 'game.drained', { n: event.amount }),
              color: mine ? C.lime : C.red,
              icon: 'siphon',
            });
          } else if (event.attack.target === 'opponent') {
            show({ text: t('game.hit'), color: POWER_COLORS[event.attack.power], icon: event.attack.power });
          }
          break;
        default:
          break;
      }
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [t]);

  return (
    <View pointerEvents="none" style={[FILL, styles.centered]}>
      {item ? <AnnouncementView key={item.id} item={item} /> : null}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Alerte : une attaque arrive, il reste un instant pour réagir         */
/* ------------------------------------------------------------------ */

function WarningBar({ hitAt }: { hitAt: number }) {
  const width = useSharedValue(1);
  useEffect(() => {
    const now = useMatchStore.getState().match?.now ?? 0;
    width.value = 1;
    width.value = withTiming(0, { duration: Math.max(0, hitAt - now), easing: Easing.linear });
  }, [hitAt, width]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: width.value }] }));
  return (
    <View style={styles.warningTrack}>
      <Animated.View style={[styles.warningFill, style]} />
    </View>
  );
}

export const AttackWarning = memo(function AttackWarning() {
  const t = useT();
  // Texte compact « id:pouvoir:origine:impact » de la prochaine attaque reçue.
  const incoming = useMatch((match) => {
    const attack = match.pending.find((candidate) => candidate.target === 'player');
    return attack ? `${attack.id}:${attack.power}:${attack.from}:${attack.hitAt}` : '';
  }, '');
  const blink = useSharedValue(0);

  useEffect(() => {
    if (!incoming) return;
    haptics.warning();
    blink.value = 0;
    blink.value = withRepeat(withTiming(1, { duration: 180 }), -1, true);
  }, [incoming, blink]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: 0.7 + blink.value * 0.3 }));

  if (!incoming) return null;
  const [, power, from, hitAt] = incoming.split(':');
  const color = POWER_COLORS[power as PowerId];

  return (
    <Animated.View pointerEvents="none" style={[styles.warning, glow(C.red, 18, 0.7), blinkStyle]} testID="attack-warning">
      <Icon name="alert" size={22} color={C.red} />
      <View style={styles.warningText}>
        <Txt variant="label" color={C.red} size={10}>
          {from === 'system' ? t('game.countermeasure') : t('game.incoming')}
        </Txt>
        <Txt variant="heading" color={color} glow={8} size={16}>
          {t(`power.${power as PowerId}.name`).toUpperCase()}
        </Txt>
        <WarningBar hitAt={Number(hitAt)} />
      </View>
      <Icon name={power as PowerId} size={26} color={color} />
    </Animated.View>
  );
});

/* ------------------------------------------------------------------ */
/* Flash de couleur plein écran                                         */
/* ------------------------------------------------------------------ */

/**
 * Retour sensoriel des événements de la partie : un flash de couleur sur
 * tout l'écran pour les moments forts, et les vibrations correspondantes.
 */
export const FlashOverlay = memo(function FlashOverlay() {
  const [color, setColor] = useState<string>(C.red);
  const opacity = useSharedValue(0);

  useEffect(
    () =>
      matchEvents.on((event) => {
        const burst = (tint: string, strength: number, duration: number) => {
          setColor(tint);
          opacity.value = withSequence(
            withTiming(strength, { duration: 50 }),
            withTiming(0, { duration }),
          );
        };
        if (event.type === 'attackHit' && event.attack.target === 'player') {
          haptics.heavy();
          burst(POWER_COLORS[event.attack.power], 0.4, 520);
        } else if (event.type === 'mistake' && event.side === 'player') {
          haptics.error();
          burst(C.red, 0.2, 300);
        } else if (event.type === 'unitComplete' && event.side === 'player') {
          haptics.medium();
        } else if (event.type === 'placed' && event.side === 'player') {
          haptics.light();
        } else if (event.type === 'finished') {
          if (event.result === 'won') {
            haptics.success();
            burst(C.text, 0.55, 700);
          } else {
            haptics.error();
            burst(C.red, 0.45, 800);
          }
        }
      }),
    [opacity],
  );

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[FILL, { backgroundColor: color }, style]} />;
});

/* ------------------------------------------------------------------ */
/* Particules de victoire                                               */
/* ------------------------------------------------------------------ */

const PARTICLE_COLORS = [C.cyan, C.magenta, C.yellow, C.green, C.violet];

interface ParticleSpec {
  angle: number;
  distance: number;
  size: number;
  color: string;
  spin: number;
}

function Particle({ spec, progress }: { spec: ParticleSpec; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const reach = spec.distance * (1 - (1 - p) * (1 - p));
    return {
      opacity: p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3,
      transform: [
        { translateX: Math.cos(spec.angle) * reach },
        { translateY: Math.sin(spec.angle) * reach + 90 * p * p },
        { rotate: `${spec.spin * p}rad` },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.particle,
        { width: spec.size, height: spec.size, backgroundColor: spec.color },
        glow(spec.color, 6, 0.9),
        style,
      ]}
    />
  );
}

/** Gerbe de confettis néon qui jaillit du centre. */
export const ParticleBurst = memo(function ParticleBurst({
  count = 36,
  seed = 7,
  radius = 220,
}: {
  count?: number;
  seed?: number;
  radius?: number;
}) {
  const progress = useSharedValue(0);
  const specs = useMemo<ParticleSpec[]>(() => {
    const rng = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + rng() * 0.5,
      distance: radius * (0.45 + rng() * 0.55),
      size: 5 + Math.floor(rng() * 8),
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      spin: (rng() - 0.5) * 12,
    }));
  }, [count, radius, seed]);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) });
  }, [progress]);

  return (
    <View pointerEvents="none" style={[FILL, styles.centered]}>
      {specs.map((spec, i) => (
        <Particle key={i} spec={spec} progress={progress} />
      ))}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Compte à rebours de départ                                           */
/* ------------------------------------------------------------------ */

function CountStep({ text, color }: { text: string; color: string }) {
  const scale = useSharedValue(2.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(360, withTiming(0.25, { duration: 180 })),
    );
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.Text
      maxFontSizeMultiplier={1}
      style={[styles.count, { color }, textGlow(color, 26), style]}>
      {text}
    </Animated.Text>
  );
}

interface StartCountdownProps {
  onDone: () => void;
  /** Contenu affiché au-dessus du décompte (par ex. l'affiche du duel). */
  children?: ReactNode;
}

export function StartCountdown({ onDone, children }: StartCountdownProps) {
  const t = useT();
  const [step, setStep] = useState(3);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (step < 0) {
      done.current();
      return;
    }
    haptics.tap();
    const timer = setTimeout(() => setStep((value) => value - 1), step === 0 ? 520 : 680);
    return () => clearTimeout(timer);
  }, [step]);

  if (step < 0) return null;
  return (
    <View style={[FILL, styles.cover]} testID="countdown">
      {children}
      <Txt variant="label" color={C.textDim} size={11}>
        {t('game.connecting')}
      </Txt>
      <View style={styles.countBox}>
        <CountStep
          key={step}
          text={step === 0 ? t('game.go') : String(step)}
          color={step === 0 ? C.magenta : C.cyan}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  announce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: alpha(C.bg, 0.9),
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: alpha(C.bg, 0.92),
  },
  warning: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: C.red,
    borderRadius: 6,
    backgroundColor: alpha('#1a0410', 0.95),
  },
  warningText: {
    flex: 1,
    gap: 3,
  },
  warningTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: alpha(C.red, 0.2),
    overflow: 'hidden',
  },
  warningFill: {
    width: '100%',
    height: 4,
    backgroundColor: C.red,
    transformOrigin: 'left',
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
  },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: alpha(C.bg, 0.97),
  },
  countBox: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontFamily: F.display,
    fontSize: 84,
    letterSpacing: 4,
  },
});
