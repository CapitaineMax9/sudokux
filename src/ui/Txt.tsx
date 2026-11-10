import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { C, F, textGlow } from './theme';

export type TxtVariant =
  | 'display'
  | 'heading'
  | 'title'
  | 'label'
  | 'body'
  | 'bodyBold'
  | 'small'
  | 'mono';

export interface TxtProps extends TextProps {
  variant?: TxtVariant;
  color?: string;
  /** Halo néon de la couleur du texte. Un nombre règle son rayon. */
  glow?: boolean | number;
  center?: boolean;
  size?: number;
}

/** Texte du jeu : applique la police, la couleur et le halo néon. */
export function Txt({
  variant = 'body',
  color,
  glow,
  center,
  size,
  style,
  ...rest
}: TxtProps) {
  const tint = color ?? (variant === 'small' ? C.textDim : C.text);
  const tall = variant === 'body' || variant === 'bodyBold' || variant === 'small';
  const extra: TextStyle = {
    color: tint,
    ...(center ? { textAlign: 'center' } : null),
    ...(size ? { fontSize: size } : null),
    ...(size && tall ? { lineHeight: Math.round(size * 1.3) } : null),
  };
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      {...rest}
      style={[
        styles[variant],
        extra,
        glow ? textGlow(tint, typeof glow === 'number' ? glow : 10) : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: F.display, fontSize: 34, letterSpacing: 2 },
  heading: { fontFamily: F.heading, fontSize: 18, letterSpacing: 1.5 },
  title: { fontFamily: F.heading, fontSize: 14, letterSpacing: 1.2 },
  label: { fontFamily: F.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  body: { fontFamily: F.body, fontSize: 17, lineHeight: 22 },
  bodyBold: { fontFamily: F.bodyBold, fontSize: 17, lineHeight: 22 },
  small: { fontFamily: F.bodySemi, fontSize: 14, lineHeight: 18 },
  mono: { fontFamily: F.mono, fontSize: 14, letterSpacing: 1 },
});
