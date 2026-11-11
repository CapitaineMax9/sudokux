/**
 * Duel par Internet, sans serveur à soi : Firebase Realtime Database (offre
 * gratuite de Google) sert uniquement de boîte aux lettres entre les deux
 * téléphones. Comme en réseau local, c'est le téléphone de l'hôte qui arbitre.
 *
 * Organisation des données :
 *   rooms/{code}/meta  { open, at }     salon ouvert ou déjà pris
 *   rooms/{code}/guest 'here' | 'gone'  présence de l'invité
 *   rooms/{code}/c2h   messages invité → hôte
 *   rooms/{code}/h2c   messages hôte → invité
 *   queue              { code, at }     joueur qui attend une partie rapide
 *
 * Les messages sont stockés en texte JSON : Firebase supprime les listes vides.
 */
import { getApps, initializeApp } from 'firebase/app';
import {
  connectDatabaseEmulator,
  getDatabase,
  onChildAdded,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  type Database,
  type Unsubscribe,
} from 'firebase/database';

import type { HostSession } from './host';
import type { Link, LinkHandlers } from './link';
import { ROOM_ALPHABET, ROOM_CODE_LENGTH, type ServerMessage } from './protocol';

/** Une attente de partie rapide plus vieille que ça est considérée comme abandonnée. */
const QUEUE_STALE_MS = 3 * 60_000;

const env = {
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  emulator: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR,
};

/** Vrai si le projet Firebase est configuré (fichier `.env`, voir le README). */
export function internetAvailable(): boolean {
  return Boolean(env.databaseURL);
}

let database: Database | null = null;

export function firebaseDb(): Database {
  if (database) return database;
  if (!env.databaseURL) throw new Error('Firebase non configuré');
  const app =
    getApps()[0] ??
    initializeApp({
      databaseURL: env.databaseURL,
      apiKey: env.apiKey,
      projectId: env.projectId,
      appId: env.appId,
    });
  database = getDatabase(app);
  if (env.emulator) {
    const [host, port] = env.emulator.split(':');
    connectDatabaseEmulator(database, host, Number(port));
  }
  return database;
}

function randomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

const decode = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || typeof (value as { m?: unknown }).m !== 'string') return null;
  try {
    return JSON.parse((value as { m: string }).m);
  } catch {
    return null;
  }
};

export interface InternetHost {
  code: string;
  stop: () => void;
}

/** Ouvre un salon et y branche la session de l'hôte. */
export async function hostInternet(session: HostSession): Promise<InternetHost> {
  const database = firebaseDb();
  let code = '';
  for (let attempt = 0; attempt < 8 && !code; attempt++) {
    const candidate = randomCode();
    const result = await runTransaction(ref(database, `rooms/${candidate}/meta`), (current) =>
      current === null ? { open: true, at: Date.now() } : undefined,
    );
    if (result.committed) code = candidate;
  }
  if (!code) throw new Error('Aucun code de salon libre');

  const room = ref(database, `rooms/${code}`);
  // Si l'hôte disparaît (appli fermée, réseau coupé), le salon s'efface.
  await onDisconnect(room).remove();

  const listeners: Unsubscribe[] = [];
  let guest: ReturnType<HostSession['attachGuest']> = null;
  let stopped = false;
  const ensureGuest = () => {
    if (!guest && !stopped) {
      guest = session.attachGuest((message: ServerMessage) => {
        push(ref(database, `rooms/${code}/h2c`), { m: JSON.stringify(message) }).catch(() => {});
      });
    }
    return guest;
  };

  listeners.push(
    onChildAdded(ref(database, `rooms/${code}/c2h`), (snapshot) => {
      ensureGuest()?.receive(decode(snapshot.val()));
    }),
    onValue(ref(database, `rooms/${code}/guest`), (snapshot) => {
      const presence = snapshot.val();
      if (presence === 'here') ensureGuest();
      if (presence === 'gone' && guest) {
        const leaving = guest;
        guest = null;
        leaving.close();
      }
    }),
  );

  return {
    code,
    stop: () => {
      if (stopped) return;
      stopped = true;
      listeners.forEach((off) => off());
      onDisconnect(room).cancel().catch(() => {});
      remove(room).catch(() => {});
    },
  };
}

/**
 * Rejoint un salon. Renvoie `null` si le code n'existe pas ou si le salon est
 * déjà complet.
 */
export async function joinInternet(code: string, handlers: LinkHandlers): Promise<Link | null> {
  const database = firebaseDb();
  const meta = ref(database, `rooms/${code}/meta`);
  // Première passe avec la valeur en cache (souvent vide) : on renvoie null pour
  // que Firebase compare avec le serveur et rappelle la fonction si besoin.
  const result = await runTransaction(meta, (current) => {
    if (current === null) return null;
    if (current.open === true) return { ...current, open: false };
    return undefined;
  });
  if (!result.committed || result.snapshot.val() === null) return null;

  const presence = ref(database, `rooms/${code}/guest`);
  await onDisconnect(presence).set('gone');
  await set(presence, 'here');

  let closed = false;
  const listeners: Unsubscribe[] = [];
  const finish = (notify: boolean) => {
    if (closed) return;
    closed = true;
    listeners.forEach((off) => off());
    if (notify) handlers.onClose('rivalLeft');
  };

  listeners.push(
    onChildAdded(ref(database, `rooms/${code}/h2c`), (snapshot) => {
      const message = decode(snapshot.val());
      if (!closed && message && typeof message === 'object') handlers.onMessage(message as ServerMessage);
    }),
    onValue(meta, (snapshot) => {
      // Le salon a disparu : l'hôte est parti.
      if (snapshot.val() === null) finish(true);
    }),
  );
  setTimeout(() => {
    if (!closed) handlers.onOpen?.();
  }, 0);

  return {
    send: (message) => {
      if (!closed) push(ref(database, `rooms/${code}/c2h`), { m: JSON.stringify(message) }).catch(() => {});
    },
    close: () => {
      if (closed) return;
      finish(false);
      set(presence, 'gone').catch(() => {});
      onDisconnect(presence).cancel().catch(() => {});
    },
  };
}

/**
 * Partie rapide : si quelqu'un attend déjà, on prend sa place (`join`) ;
 * sinon on s'inscrit avec notre propre salon et on attend (`wait`).
 */
export async function claimQuickMatch(myCode: string): Promise<{ join: string } | { wait: true }> {
  const queue = ref(firebaseDb(), 'queue');
  let taken: string | null = null;
  const result = await runTransaction(queue, (current) => {
    taken = null;
    const now = Date.now();
    if (
      current &&
      typeof current.code === 'string' &&
      current.code !== myCode &&
      now - Number(current.at) < QUEUE_STALE_MS
    ) {
      taken = current.code;
      return null;
    }
    return { code: myCode, at: now };
  });
  if (result.committed && taken) return { join: taken };
  // On reste inscrit tant qu'on est connecté.
  await onDisconnect(queue).remove();
  return { wait: true };
}

/** Retire notre inscription à la partie rapide (si c'est toujours la nôtre). */
export async function leaveQuickMatch(myCode: string): Promise<void> {
  const queue = ref(firebaseDb(), 'queue');
  await onDisconnect(queue).cancel().catch(() => {});
  await runTransaction(queue, (current) =>
    current && current.code === myCode ? null : current,
  ).catch(() => {});
}
