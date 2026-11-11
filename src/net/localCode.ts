/**
 * Sur un même réseau, l'invité doit connaître l'adresse de l'hôte. Plutôt que
 * de lui faire recopier « 192.168.1.23 », on la transforme en un code de sept
 * caractères faciles à lire et à dicter.
 */
import { ROOM_ALPHABET } from './protocol';

export const LOCAL_CODE_LENGTH = 7;
export const LOCAL_PORT = 8787;

export function ipToCode(ip: string): string | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const byte = Number(part);
    if (byte > 255) return null;
    value = value * 256 + byte;
  }
  if (value === 0) return null;
  let code = '';
  for (let i = 0; i < LOCAL_CODE_LENGTH; i++) {
    code = ROOM_ALPHABET[value % 32] + code;
    value = Math.floor(value / 32);
  }
  return code;
}

export function codeToIp(code: string): string | null {
  const clean = normalizeCode(code, LOCAL_CODE_LENGTH);
  if (clean.length !== LOCAL_CODE_LENGTH) return null;
  let value = 0;
  for (const letter of clean) {
    const digit = ROOM_ALPHABET.indexOf(letter);
    if (digit < 0) return null;
    value = value * 32 + digit;
  }
  if (value === 0 || value > 0xffffffff) return null;
  const bytes = [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256);
  return bytes.join('.');
}

/** Majuscules, sans espaces ni tirets, et en corrigeant O→0 et I→1… dans l'alphabet. */
export function normalizeCode(input: string, length: number): string {
  return input
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, length);
}

/** « K7M2Q9A » → « K7M-2Q9A » pour l'affichage. */
export function formatCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}
