import { memo, type ReactNode } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { CHARACTERS, type CharacterId } from '@/content/characters';

import { C } from './theme';

interface PortraitProps {
  who: CharacterId;
  size?: number;
  /** Portrait grisé (personnage pas encore rencontré). */
  dimmed?: boolean;
}

const FRAME = '14,2 86,2 98,14 98,86 86,98 14,98 2,86 2,14';

/**
 * Portraits « hologramme » des personnages, dessinés au trait dans la
 * couleur néon de chacun. Tout est vectoriel : aucune image à charger.
 */
export const Portrait = memo(function Portrait({ who, size = 96, dimmed = false }: PortraitProps) {
  const color = dimmed ? C.textMuted : CHARACTERS[who].color;
  const line = {
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  const soft = { fill: color, fillOpacity: 0.14 };
  const dark = '#05050d';
  let figure: ReactNode = null;

  switch (who) {
    case 'x':
      figure = (
        <>
          {/* Capuche */}
          <Path d="M14 100C14 58 28 22 50 12c22 10 36 46 36 88z" {...line} {...soft} />
          {/* Visage dans l'ombre */}
          <Path
            d="M32 62c0-20 8-32 18-34 10 2 18 14 18 34-5 10-11 15-18 15s-13-5-18-15z"
            {...line}
            fill={dark}
            strokeOpacity={0.6}
          />
          {/* Le X lumineux */}
          <Path d="M41 44l18 20M59 44L41 64" {...line} strokeWidth={4.5} />
          <Path d="M36 84l14 8 14-8" {...line} strokeOpacity={0.5} />
        </>
      );
      break;

    case 'echo':
      figure = (
        <>
          <Circle cx={50} cy={50} r={36} {...line} strokeOpacity={0.3} strokeDasharray="3 6" />
          <Circle cx={50} cy={50} r={26} {...line} strokeOpacity={0.6} />
          <Circle cx={50} cy={50} r={15} {...line} {...soft} fillOpacity={0.28} />
          {/* Yeux */}
          <Circle cx={44.5} cy={48} r={2.4} fill={color} />
          <Circle cx={55.5} cy={48} r={2.4} fill={color} />
          <Path d="M45 55q5 3.5 10 0" {...line} strokeWidth={1.8} />
          {/* Ondes d'écho */}
          <Path d="M80 28a34 34 0 010 44M20 28a34 34 0 000 44" {...line} strokeOpacity={0.45} />
          <Path d="M89 20a46 46 0 010 60M11 20a46 46 0 000 60" {...line} strokeOpacity={0.2} />
        </>
      );
      break;

    case 'mamie':
      figure = (
        <>
          {/* Baguettes dans le chignon */}
          <Path d="M38 4l20 22M62 4L42 26" {...line} strokeOpacity={0.7} />
          <Circle cx={50} cy={17} r={9} {...line} {...soft} fillOpacity={0.3} />
          <Circle cx={50} cy={46} r={22} {...line} {...soft} />
          <Path d="M29 42c3-17 39-17 42 0" {...line} />
          {/* Grosses lunettes rondes */}
          <Circle cx={41} cy={47} r={7.5} {...line} {...soft} fillOpacity={0.3} />
          <Circle cx={59} cy={47} r={7.5} {...line} {...soft} fillOpacity={0.3} />
          <Path d="M48.5 47h3" {...line} />
          <Path d="M43 58q7 5 14 0" {...line} />
          {/* Tablier */}
          <Path d="M14 100c2-20 16-28 36-28s34 8 36 28z" {...line} {...soft} />
          <Path d="M40 74v26M60 74v26" {...line} strokeOpacity={0.5} />
        </>
      );
      break;

    case 'pixel':
      figure = (
        <>
          <Rect x={29} y={26} width={42} height={42} rx={11} {...line} {...soft} />
          {/* Casquette de travers */}
          <Path d="M27 36c1-18 45-18 46 0z" {...line} {...soft} fillOpacity={0.35} />
          <Path d="M71 33l18 4-17 3" {...line} />
          {/* Visière en pixels */}
          <Rect x={32} y={41} width={36} height={10} rx={2} {...line} {...soft} fillOpacity={0.3} />
          <Rect x={36} y={44} width={4} height={4} fill={color} />
          <Rect x={43} y={44} width={4} height={4} fill={color} fillOpacity={0.5} />
          <Rect x={53} y={44} width={4} height={4} fill={color} fillOpacity={0.5} />
          <Rect x={60} y={44} width={4} height={4} fill={color} />
          <Path d="M42 58l4 3h8l4-3" {...line} />
          {/* Sweat à capuche */}
          <Path d="M12 100c2-18 16-26 38-26s36 8 38 26z" {...line} {...soft} />
          <Path d="M45 76v12M55 76v12" {...line} strokeOpacity={0.6} />
        </>
      );
      break;

    case 'vesper':
      figure = (
        <>
          {/* Carré de cheveux lisse */}
          <Path
            d="M25 64C20 32 34 10 50 10s30 22 25 54h-8c2-20-6-34-17-34S31 44 33 64z"
            {...line}
            {...soft}
            fillOpacity={0.3}
          />
          <Path
            d="M34 46c0-13 8-20 16-20s16 7 16 20-8 24-16 26c-8-2-16-13-16-26z"
            {...line}
            {...soft}
            fillOpacity={0.08}
          />
          {/* Visière */}
          <Polygon points="31,41 69,41 66,49 34,49" fill={color} fillOpacity={0.9} />
          <Path d="M45 60h10" {...line} />
          {/* Col d'uniforme anguleux */}
          <Path d="M6 100l14-20 20-6 10 8 10-8 20 6 14 20z" {...line} {...soft} />
          <Path d="M50 82v18" {...line} strokeOpacity={0.5} />
        </>
      );
      break;

    case 'neuf':
      figure = (
        <>
          <Circle cx={50} cy={42} r={24} {...line} {...soft} />
          {/* Cheveux gominés */}
          <Path d="M27 36c3-22 43-22 46 0-11-9-35-9-46 0z" {...line} {...soft} fillOpacity={0.4} />
          {/* Monocle et chaînette */}
          <Circle cx={60} cy={43} r={8} {...line} {...soft} fillOpacity={0.3} />
          <Path d="M66 49q6 6 5 16" {...line} strokeOpacity={0.6} strokeWidth={1.4} />
          <Path d="M36 43h9" {...line} />
          {/* Moustache */}
          <Path d="M39 55q5.5-4 11 0 5.5-4 11 0" {...line} />
          {/* Costume large */}
          <Path d="M2 100c2-22 24-30 48-30s46 8 48 30z" {...line} {...soft} />
          <Polygon points="50,70 45,78 50,98 55,78" fill={color} fillOpacity={0.85} />
          <Path d="M34 72l12 16M66 72L54 88" {...line} strokeOpacity={0.6} />
          <Circle cx={24} cy={88} r={7} {...line} fill={dark} />
          <SvgText x={24} y={92} fontSize={10} fontWeight="bold" fill={color} textAnchor="middle">
            9
          </SvgText>
        </>
      );
      break;

    case 'un':
      figure = (
        <>
          {/* Neuf points : les neuf Chiffres. Le premier brille. */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
            const angle = -Math.PI / 2 + (k * Math.PI * 2) / 9;
            return (
              <Circle
                key={k}
                cx={50 + Math.cos(angle) * 30}
                cy={32 + Math.sin(angle) * 26}
                r={k === 0 ? 3 : 1.8}
                fill={color}
                fillOpacity={k === 0 ? 1 : 0.4}
              />
            );
          })}
          <Ellipse cx={50} cy={32} rx={12} ry={15} {...line} fill={dark} />
          {/* Un visage réduit à un trait : le chiffre 1 */}
          <Line x1={50} y1={21} x2={50} y2={43} {...line} strokeWidth={3.5} />
          {/* Long manteau */}
          <Path d="M26 100l9-46c5-7 25-7 30 0l9 46z" {...line} {...soft} />
          <Path d="M50 52v48" {...line} strokeOpacity={0.5} />
        </>
      );
      break;

    case 'drone':
      figure = (
        <>
          <Path d="M18 28h24M58 28h24" {...line} />
          <Path d="M30 28l5 10M70 28l-5 10" {...line} />
          <Path d="M50 38V24" {...line} />
          <Circle cx={50} cy={22} r={2.4} fill={color} />
          <Rect x={26} y={38} width={48} height={32} rx={9} {...line} {...soft} />
          <Circle cx={50} cy={54} r={9} {...line} {...soft} fillOpacity={0.3} />
          <Circle cx={50} cy={54} r={3.4} fill={color} />
          <Path d="M36 70l-5 12M64 70l5 12" {...line} />
          <Path d="M32 46h4M64 46h4" {...line} strokeOpacity={0.6} />
        </>
      );
      break;

    case 'system':
      figure = (
        <>
          <Rect x={18} y={24} width={64} height={44} rx={4} {...line} {...soft} />
          <Path d="M28 38l8 8-8 8M42 54h14" {...line} />
          <Path d="M38 80h24M50 68v12" {...line} />
        </>
      );
      break;
  }

  const clipId = `portrait-clip-${who}`;
  const gradId = `portrait-grad-${who}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={FRAME} />
        </ClipPath>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0.03} />
        </LinearGradient>
      </Defs>
      <Polygon points={FRAME} fill={dark} />
      <Polygon points={FRAME} fill={`url(#${gradId})`} />
      <G clipPath={`url(#${clipId})`}>{figure}</G>
      <Polygon points={FRAME} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.9} />
    </Svg>
  );
});
