import { memo, type ReactNode } from 'react';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

import type { PowerId } from '@/engine/powers';

export type IconName =
  | PowerId
  | 'back'
  | 'pause'
  | 'play'
  | 'pencil'
  | 'erase'
  | 'lock'
  | 'star'
  | 'settings'
  | 'duel'
  | 'story'
  | 'grid'
  | 'bolt'
  | 'clock'
  | 'close'
  | 'check'
  | 'alert'
  | 'globe'
  | 'retry'
  | 'home';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Pictogrammes au trait, dessinés dans une grille de 24 × 24. */
export const Icon = memo(function Icon({
  name,
  size = 24,
  color = '#ffffff',
  strokeWidth = 1.8,
}: IconProps) {
  const line = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  let body: ReactNode;

  switch (name) {
    case 'scan':
      body = (
        <>
          <Circle cx={12} cy={12} r={6} {...line} />
          <Path d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5" {...line} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
        </>
      );
      break;
    case 'analyse':
      body = (
        <>
          <Circle cx={10.5} cy={10.5} r={6} {...line} />
          <Path d="M15 15l5.5 5.5" {...line} />
          <Circle cx={8.2} cy={10.5} r={1} fill={color} />
          <Circle cx={10.5} cy={10.5} r={1} fill={color} />
          <Circle cx={12.8} cy={10.5} r={1} fill={color} />
        </>
      );
      break;
    case 'shield':
      body = (
        <>
          <Path
            d="M12 3l7 3v5.5c0 4.5-3 7.7-7 9.5-4-1.8-7-5-7-9.5V6z"
            {...line}
          />
          <Path d="M9 12l2.2 2.2L15 10" {...line} />
        </>
      );
      break;
    case 'purge':
      body = (
        <>
          <Path
            d="M12 3l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-1.8z"
            {...line}
          />
          <Path d="M19 4v3M17.5 5.5h3" {...line} />
        </>
      );
      break;
    case 'freeze':
      body = (
        <>
          <Path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" {...line} />
          <Path d="M9.5 4.5L12 6.8l2.5-2.3M9.5 19.5l2.5-2.3 2.5 2.3" {...line} />
        </>
      );
      break;
    case 'glitch':
      body = (
        <Path
          d="M3 7h9M14.5 7H21M7 12h14M3 12h1.5M3 17h6.5M12 17h6"
          {...line}
          strokeWidth={strokeWidth * 1.25}
        />
      );
      break;
    case 'blackout':
      body = (
        <>
          <Path
            d="M2.5 12C5 7.5 8.5 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-6 6.5-9.5 6.5S5 16.5 2.5 12z"
            {...line}
          />
          <Circle cx={12} cy={12} r={2.6} {...line} />
          <Path d="M4 4l16 16" {...line} />
        </>
      );
      break;
    case 'virus':
      body = (
        <>
          <Circle cx={12} cy={12} r={4.5} {...line} />
          <Path
            d="M16.5 12H20M15.2 15.2l2.5 2.5M12 16.5V20M8.8 15.2l-2.5 2.5M7.5 12H4M8.8 8.8L6.3 6.3M12 7.5V4M15.2 8.8l2.5-2.5"
            {...line}
          />
          <Circle cx={12} cy={12} r={1.4} fill={color} />
        </>
      );
      break;
    case 'back':
      body = <Path d="M15 5l-7 7 7 7" {...line} />;
      break;
    case 'pause':
      body = (
        <>
          <Rect x={6.5} y={5} width={3.6} height={14} rx={1} fill={color} />
          <Rect x={13.9} y={5} width={3.6} height={14} rx={1} fill={color} />
        </>
      );
      break;
    case 'play':
      body = <Polygon points="8,5 19,12 8,19" fill={color} />;
      break;
    case 'pencil':
      body = (
        <>
          <Path d="M4 20l1-4L16 5l3 3L8 19z" {...line} />
          <Path d="M14 7l3 3" {...line} />
        </>
      );
      break;
    case 'erase':
      body = (
        <>
          <Path d="M9 6h11v12H9l-6-6z" {...line} />
          <Path d="M12.5 9.5l4.5 5M17 9.5l-4.5 5" {...line} />
        </>
      );
      break;
    case 'lock':
      body = (
        <>
          <Rect x={6} y={11} width={12} height={9} rx={1.5} {...line} />
          <Path d="M8.5 11V8a3.5 3.5 0 017 0v3" {...line} />
        </>
      );
      break;
    case 'star':
      body = (
        <Polygon
          points="12,2.8 14.7,8.9 21.3,9.6 16.4,14.1 17.8,20.6 12,17.2 6.2,20.6 7.6,14.1 2.7,9.6 9.3,8.9"
          fill={color}
        />
      );
      break;
    case 'settings':
      body = (
        <>
          <Path d="M4 7h16M4 12h16M4 17h16" {...line} />
          <Circle cx={9} cy={7} r={2.2} fill="#05050d" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={15} cy={12} r={2.2} fill="#05050d" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={8} cy={17} r={2.2} fill="#05050d" stroke={color} strokeWidth={strokeWidth} />
        </>
      );
      break;
    case 'duel':
      body = (
        <>
          <Path d="M4.5 4.5l12 12M19.5 4.5l-12 12" {...line} />
          <Path d="M13.5 18.5l5-5M10.5 18.5l-5-5M18 18l2 2M6 18l-2 2" {...line} />
        </>
      );
      break;
    case 'story':
      body = (
        <>
          <Path d="M12 7c-1.5-1.3-3.6-2-8-2v13c4.4 0 6.5.7 8 2 1.5-1.3 3.6-2 8-2V5c-4.4 0-6.5.7-8 2z" {...line} />
          <Path d="M12 7v13" {...line} />
        </>
      );
      break;
    case 'grid':
      body = (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={1.5} {...line} />
          <Path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" {...line} />
        </>
      );
      break;
    case 'bolt':
      body = <Path d="M13 3L5 13.5h6L10 21l9-11h-6z" {...line} />;
      break;
    case 'clock':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.5} {...line} />
          <Path d="M12 7.5V12l3 2" {...line} />
        </>
      );
      break;
    case 'close':
      body = <Path d="M6 6l12 12M18 6L6 18" {...line} />;
      break;
    case 'check':
      body = <Path d="M5 12.5l4.5 4.5L19 7.5" {...line} />;
      break;
    case 'alert':
      body = (
        <>
          <Path d="M12 4l9 16H3z" {...line} />
          <Line x1={12} y1={10} x2={12} y2={14.5} {...line} />
          <Circle cx={12} cy={17.2} r={1} fill={color} />
        </>
      );
      break;
    case 'globe':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.5} {...line} />
          <Path d="M3.5 12h17M12 3.5c-3 2.5-3 14.5 0 17M12 3.5c3 2.5 3 14.5 0 17" {...line} />
        </>
      );
      break;
    case 'retry':
      body = (
        <>
          <Path d="M19 12a7 7 0 11-2.05-4.95" {...line} />
          <Path d="M19.5 4v4.5H15" {...line} />
        </>
      );
      break;
    case 'home':
      body = <Path d="M4 11l8-7 8 7v9h-5.5v-5.5h-5V20H4z" {...line} />;
      break;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
});
