/**
 * Sauvegarde en ligne, par Firebase.
 *
 * Chaque joueur a un code secret de 12 caractères. Sa progression est
 * enregistrée sous `saves/{code}` : quiconque connaît le code peut la lire,
 * d'où l'importance de ne pas le partager. Taper ce code sur un autre
 * appareil y rapatrie la progression ; ensuite, les deux restent synchronisés.
 *
 * À chaque synchronisation, on fusionne (voir `cloudMerge.ts`) : on ne perd
 * jamais rien, même en jouant hors ligne sur deux appareils.
 */
import { get, ref, runTransaction } from 'firebase/database';
import { create } from 'zustand';

import { mergeProgress, pickSynced, sameProgress, sanitize, type SyncedProgress } from '@/store/cloudMerge';
import { useProgress } from '@/store/progress';

import { firebaseDb, internetAvailable } from './internet';
import { normalizeCode } from './localCode';
import { ROOM_ALPHABET } from './protocol';

export const SAVE_CODE_LENGTH = 12;
/** Délai entre une modification et son envoi (on regroupe les changements). */
const UPLOAD_DELAY_MS = 2500;
const FORMAT_VERSION = 1;

export type CloudStatus = 'off' | 'syncing' | 'synced' | 'offline';

interface CloudState {
  status: CloudStatus;
  lastSyncAt: number | null;
}

export const useCloud = create<CloudState>()(() => ({
  status: internetAvailable() ? 'syncing' : 'off',
  lastSyncAt: null,
}));

function newCode(): string {
  let code = '';
  for (let i = 0; i < SAVE_CODE_LENGTH; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

/** « ABCD2345EFGH » → « ABCD-2345-EFGH ». */
export function formatSaveCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}

function decode(value: unknown): SyncedProgress | null {
  if (!value || typeof value !== 'object') return null;
  const text = (value as { d?: unknown }).d;
  if (typeof text !== 'string') return null;
  try {
    return sanitize(JSON.parse(text));
  } catch {
    return null;
  }
}

const encode = (data: SyncedProgress) => ({ v: FORMAT_VERSION, d: JSON.stringify(data), at: Date.now() });

/**
 * Fusionne la progression locale avec celle du cloud, des deux côtés.
 * La transaction garantit qu'on n'écrase pas une sauvegarde faite au même
 * moment depuis un autre appareil.
 */
async function syncWith(code: string): Promise<void> {
  const local = pickSynced(useProgress.getState());
  let merged = local;
  const result = await runTransaction(ref(firebaseDb(), `saves/${code}`), (current) => {
    const remote = decode(current);
    merged = remote ? mergeProgress(local, remote) : local;
    if (remote && sameProgress(merged, remote)) return undefined; // rien de nouveau à écrire
    return encode(merged);
  });
  // Transaction abandonnée = le cloud contenait déjà tout : on relit sa valeur.
  const stored = decode(result.snapshot.val());
  const final = stored ? mergeProgress(merged, stored) : merged;
  const state = useProgress.getState();
  if (!sameProgress(final, pickSynced(state))) state.applySynced(final);
}

let running: Promise<void> | null = null;
let again = false;

/** Lance une synchronisation (une seule à la fois ; la suivante est regroupée). */
export function syncNow(): Promise<void> {
  if (!internetAvailable()) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      let code = useProgress.getState().cloudKey;
      if (!code) {
        code = newCode();
        useProgress.getState().setCloudKey(code);
      }
      useCloud.setState({ status: 'syncing' });
      try {
        await syncWith(code);
        useCloud.setState({ status: 'synced', lastSyncAt: Date.now() });
      } catch {
        useCloud.setState({ status: 'offline' });
        again = false;
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

export type LinkResult = 'linked' | 'notFound' | 'badCode' | 'offline';

/** Rattache cet appareil à une sauvegarde existante, à partir de son code. */
export async function linkSaveCode(input: string): Promise<LinkResult> {
  const code = normalizeCode(input, SAVE_CODE_LENGTH);
  if (code.length !== SAVE_CODE_LENGTH || [...code].some((c) => !ROOM_ALPHABET.includes(c))) {
    return 'badCode';
  }
  try {
    const snapshot = await get(ref(firebaseDb(), `saves/${code}`));
    if (!decode(snapshot.val())) return 'notFound';
  } catch {
    return 'offline';
  }
  useProgress.getState().setCloudKey(code);
  await syncNow();
  return useCloud.getState().status === 'synced' ? 'linked' : 'offline';
}

let started = false;

/** À appeler une fois au démarrage, après le chargement de la sauvegarde locale. */
export function startCloudSync(): void {
  if (started || !internetAvailable()) return;
  started = true;
  syncNow();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let previous = pickSynced(useProgress.getState());
  useProgress.subscribe((state) => {
    const next = pickSynced(state);
    const changed = (Object.keys(next) as (keyof SyncedProgress)[]).some((key) => next[key] !== previous[key]);
    previous = next;
    if (!changed && state.cloudKey) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => syncNow(), UPLOAD_DELAY_MS);
  });
}
