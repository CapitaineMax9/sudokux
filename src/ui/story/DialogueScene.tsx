import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CHARACTERS } from '@/content/characters';
import type { StoryLine } from '@/content/story';
import { haptics } from '@/game/haptics';
import { useL, useT } from '@/i18n';

import { Panel } from '../Panel';
import { Portrait } from '../Portrait';
import { C, alpha, glow } from '../theme';
import { Txt } from '../Txt';

/** Caractères révélés à chaque tic de la machine à écrire. */
const CHARS_PER_TICK = 2;
const TICK_MS = 22;

interface DialogueSceneProps {
  lines: StoryLine[];
  onDone: () => void;
}

/**
 * Scène de dialogue façon roman visuel : portrait du personnage qui parle,
 * texte qui s'écrit lettre à lettre. Un appui termine la phrase en cours,
 * l'appui suivant passe à la réplique d'après.
 */
export function DialogueScene({ lines, onDone }: DialogueSceneProps) {
  const t = useT();
  const l = useL();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const blink = useSharedValue(0);

  const line = lines[index];
  const text = line ? l(line.text) : '';
  const complete = shown >= text.length;

  useEffect(() => {
    blink.value = withRepeat(withTiming(1, { duration: 520 }), -1, true);
  }, [blink]);

  useEffect(() => {
    if (complete) return;
    const timer = setInterval(() => {
      setShown((count) => Math.min(text.length, count + CHARS_PER_TICK));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [complete, text.length, index]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: 0.35 + blink.value * 0.65 }));

  if (!line) return null;

  const advance = () => {
    haptics.tap();
    if (!complete) {
      setShown(text.length);
    } else if (index + 1 < lines.length) {
      setIndex(index + 1);
      setShown(0);
    } else {
      onDone();
    }
  };

  const character = CHARACTERS[line.who];
  const narrator = line.who === 'system';
  const color = character.color;

  return (
    <Pressable
      style={styles.root}
      onPress={advance}
      testID="dialogue"
      accessibilityLabel={t('common.tapToContinue')}>
      <View style={styles.header}>
        <Txt variant="num" color={C.textMuted} size={14}>
          {index + 1} / {lines.length}
        </Txt>
        <Pressable
          testID="dialogue-skip"
          hitSlop={12}
          onPress={() => {
            haptics.tap();
            onDone();
          }}
          style={styles.skip}>
          <Txt variant="label" color={C.textDim} size={10}>
            {t('common.skip')} »
          </Txt>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {narrator ? null : (
          <Animated.View
            key={`${line.who}-${index}`}
            entering={FadeInDown.duration(220)}
            style={styles.speaker}>
            <View style={[styles.portrait, glow(color, 26, 0.35)]}>
              <Portrait who={line.who} size={176} />
            </View>
            <Txt variant="heading" color={color} glow={10} size={20} style={styles.name}>
              {l(character.name).toUpperCase()}
            </Txt>
            <Txt variant="small" color={C.textDim}>
              {l(character.role)}
            </Txt>
          </Animated.View>
        )}
      </View>

      <Animated.View key={index} entering={FadeIn.duration(160)}>
        <Panel color={color} style={narrator ? styles.narratorBox : styles.box}>
          {narrator ? (
            <Txt variant="mono" color={C.cyan} glow={6} size={14} center style={styles.narratorText}>
              {text.slice(0, shown)}
            </Txt>
          ) : (
            <Txt variant="body" color={C.text} size={19} style={styles.text}>
              {text.slice(0, shown)}
            </Txt>
          )}
        </Panel>
      </Animated.View>

      <Animated.View style={[styles.hint, complete ? blinkStyle : styles.hidden]}>
        <Txt variant="label" color={C.textDim} size={10}>
          ▼ {t('common.tapToContinue')}
        </Txt>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  skip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: alpha(C.textDim, 0.4),
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speaker: {
    alignItems: 'center',
  },
  portrait: {
    borderRadius: 26,
  },
  name: {
    marginTop: 16,
  },
  box: {
    minHeight: 150,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  narratorBox: {
    minHeight: 150,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: alpha(C.black, 0.6),
  },
  text: {
    lineHeight: 26,
  },
  narratorText: {
    lineHeight: 24,
  },
  hint: {
    alignItems: 'center',
    marginTop: 12,
    height: 14,
  },
  hidden: {
    opacity: 0,
  },
});
