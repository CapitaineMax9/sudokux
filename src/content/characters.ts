import type { L10n } from '@/i18n/strings';

/**
 * Les personnages de l'histoire. `system` est le narrateur / le terminal :
 * il n'a pas de portrait.
 */
export type CharacterId =
  | 'x'
  | 'echo'
  | 'mamie'
  | 'pixel'
  | 'vesper'
  | 'neuf'
  | 'un'
  | 'drone'
  | 'system';

export interface Character {
  id: CharacterId;
  name: L10n;
  role: L10n;
  /** Couleur néon du personnage (portrait, nom, bulles). */
  color: string;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  x: {
    id: 'x',
    name: { fr: 'X', en: 'X' },
    role: { fr: 'Solveur du Neuvième', en: 'Solver from the Ninth' },
    color: '#00f0ff',
  },
  echo: {
    id: 'echo',
    name: { fr: 'Écho', en: 'Echo' },
    role: { fr: "Fragment d'intelligence", en: 'Fragment of an intelligence' },
    color: '#b79bff',
  },
  mamie: {
    id: 'mamie',
    name: { fr: 'Mamie Octet', en: 'Granny Byte' },
    role: { fr: 'Patronne du Bol de Bits', en: 'Owner of the Bit Bowl' },
    color: '#ffb347',
  },
  pixel: {
    id: 'pixel',
    name: { fr: 'Pixel', en: 'Pixel' },
    role: { fr: 'Prodige de quatorze ans', en: 'Fourteen-year-old prodigy' },
    color: '#39ff88',
  },
  vesper: {
    id: 'vesper',
    name: { fr: 'Vesper', en: 'Vesper' },
    role: { fr: 'Chasseuse de Scellés', en: 'Seal hunter' },
    color: '#ff2bd6',
  },
  neuf: {
    id: 'neuf',
    name: { fr: 'Directeur Neuf', en: 'Director Nine' },
    role: { fr: 'Chiffre du District 9', en: 'Digit of District 9' },
    color: '#ff5a4d',
  },
  un: {
    id: 'un',
    name: { fr: 'Numéro Un', en: 'Number One' },
    role: { fr: 'Premier des Chiffres', en: 'First of the Digits' },
    color: '#f4f1de',
  },
  drone: {
    id: 'drone',
    name: { fr: 'Drone T-9', en: 'Drone T-9' },
    role: { fr: "Programme d'entraînement", en: 'Training program' },
    color: '#8b96c0',
  },
  system: {
    id: 'system',
    name: { fr: 'Système', en: 'System' },
    role: { fr: '', en: '' },
    color: '#8b96c0',
  },
};
