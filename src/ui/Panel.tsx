import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, alpha } from './theme';

interface PanelProps {
  children?: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** Petites équerres lumineuses dans les coins. */
  corners?: boolean;
  padded?: boolean;
}

/** Panneau d'interface : fond sombre, liseré néon et équerres dans les coins. */
export function Panel({ children, color = C.cyan, style, corners = true, padded = true }: PanelProps) {
  return (
    <View
      style={[
        styles.panel,
        { borderColor: alpha(color, 0.3) },
        padded ? styles.padded : null,
        style,
      ]}>
      {children}
      {corners ? (
        <>
          <View pointerEvents="none" style={[styles.corner, styles.tl, { borderColor: color }]} />
          <View pointerEvents="none" style={[styles.corner, styles.tr, { borderColor: color }]} />
          <View pointerEvents="none" style={[styles.corner, styles.bl, { borderColor: color }]} />
          <View pointerEvents="none" style={[styles.corner, styles.br, { borderColor: color }]} />
        </>
      ) : null}
    </View>
  );
}

const CORNER = 10;

const styles = StyleSheet.create({
  panel: {
    backgroundColor: alpha(C.panel, 0.92),
    borderWidth: 1,
    borderRadius: 4,
  },
  padded: {
    padding: 14,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  tl: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
});
