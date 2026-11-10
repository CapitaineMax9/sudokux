import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { haptics } from '@/game/haptics';

import { Backdrop } from './Backdrop';
import { Icon } from './Icon';
import { C, MAX_WIDTH, alpha } from './theme';
import { Txt } from './Txt';

interface ScreenProps {
  children: ReactNode;
  /** Titre affiché dans la barre du haut. Sans titre ni retour, pas de barre. */
  title?: string;
  onBack?: () => void;
  /** Contenu à droite de la barre du haut. */
  right?: ReactNode;
  scroll?: boolean;
  /** Couleur de la lueur de fond. */
  tint?: string;
  padded?: boolean;
}

/** Gabarit commun des écrans : fond animé, marges sûres et barre de titre. */
export function Screen({
  children,
  title,
  onBack,
  right,
  scroll = false,
  tint,
  padded = true,
}: ScreenProps) {
  const header =
    title !== undefined || onBack ? (
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              onBack();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            testID="back"
            style={styles.back}>
            <Icon name="back" size={22} color={C.cyan} />
          </Pressable>
        ) : (
          <View style={styles.backSpace} />
        )}
        <Txt variant="heading" color={C.text} glow={8} numberOfLines={1} style={styles.title}>
          {title ? title.toUpperCase() : ''}
        </Txt>
        <View style={styles.right}>{right}</View>
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <Backdrop tint={tint} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.column}>
          {header}
          {scroll ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scroll, padded ? styles.padded : null]}
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.flex, padded ? styles.padded : null]}>{children}</View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 16,
  },
  scroll: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
    gap: 8,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: alpha(C.cyan, 0.35),
    backgroundColor: alpha(C.cyan, 0.06),
  },
  backSpace: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
