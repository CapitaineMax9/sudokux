/**
 * Duel sans serveur, de bout en bout : un hôte et un invité reliés par de
 * vraies connexions TCP (le module `net` de Node remplace celui du téléphone).
 */
import net from 'node:net';

import { generatePuzzle } from '../../engine/sudoku';
import { HostSession } from '../host';
import type { Link } from '../link';
import { codeToIp, formatCode, ipToCode, normalizeCode } from '../localCode';
import { PROTOCOL_VERSION, type ServerMessage } from '../protocol';
import { hostTcp, joinTcp, type NetLike, type TcpHost } from '../tcp';

const tcp = net as unknown as NetLike;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(check: () => boolean, ms = 3000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('délai dépassé');
    await wait(10);
  }
}

describe('code de connexion locale', () => {
  it('fait l’aller-retour adresse → code → adresse', () => {
    for (const ip of ['192.168.1.23', '10.0.0.2', '172.20.10.1', '192.168.43.1', '255.255.255.255']) {
      const code = ipToCode(ip) as string;
      expect(code).toHaveLength(7);
      expect(codeToIp(code)).toBe(ip);
      expect(codeToIp(formatCode(code).toLowerCase())).toBe(ip);
    }
  });

  it('refuse les adresses et codes invalides', () => {
    for (const ip of ['', '0.0.0.0', '1.2.3', '300.1.1.1', 'a.b.c.d', '::1']) expect(ipToCode(ip)).toBeNull();
    for (const code of ['', 'ABC', 'AAAAAAA', '!!!!!!!']) expect(codeToIp(code)).toBeNull();
  });

  it('corrige les confusions de lecture', () => {
    expect(normalizeCode('k7m-2q9 a', 7)).toBe('K7M2Q9A');
    expect(normalizeCode('o1i0', 4)).toBe('0110');
  });
});

describe('duel sur le réseau local', () => {
  let port = 39000 + Math.floor(Math.random() * 1000);
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.();
  });

  async function setup() {
    port += 1;
    const hostInbox: ServerMessage[] = [];
    const guestInbox: ServerMessage[] = [];
    let guestLeft = false;
    let guestClosed: string | null = null;
    const session = new HostSession(
      { onMessage: (m) => hostInbox.push(m), onClose: () => {} },
      { onGuestLeft: () => (guestLeft = true), startInMs: 0 },
    );
    const server: TcpHost = await hostTcp(tcp, port, session);
    cleanups.push(() => {
      server.stop();
      session.close();
    });
    session.link.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Hôte' });
    session.link.send({ t: 'queue' });

    let opened = false;
    const guest: Link = joinTcp(tcp, '127.0.0.1', port, {
      onOpen: () => (opened = true),
      onMessage: (m) => guestInbox.push(m),
      onClose: (reason) => (guestClosed = reason),
    });
    cleanups.push(() => guest.close());
    await until(() => opened);
    guest.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Invitée é' });
    guest.send({ t: 'queue' });
    await until(() => hostInbox.some((m) => m.t === 'matched') && guestInbox.some((m) => m.t === 'matched'));
    return {
      session,
      server,
      guest,
      hostInbox,
      guestInbox,
      state: () => ({ guestLeft, guestClosed }),
    };
  }

  it('met en relation l’hôte et l’invité avec la même grille', async () => {
    const { hostInbox, guestInbox } = await setup();
    const forHost = hostInbox.find((m) => m.t === 'matched');
    const forGuest = guestInbox.find((m) => m.t === 'matched');
    expect(forHost).toMatchObject({ opponent: 'Invitée é' });
    expect(forGuest).toMatchObject({ opponent: 'Hôte' });
    if (forHost?.t !== 'matched' || forGuest?.t !== 'matched') throw new Error();
    expect(forHost.seed).toBe(forGuest.seed);
  });

  it('relaie les coups dans les deux sens et désigne le vainqueur', async () => {
    const { session, guest, hostInbox, guestInbox } = await setup();
    const matched = hostInbox.find((m) => m.t === 'matched');
    if (matched?.t !== 'matched') throw new Error();
    const puzzle = generatePuzzle({ seed: matched.seed, ...matched.puzzle });
    const empties = puzzle.puzzle.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);

    session.link.send({ t: 'placed', cell: empties[0], digit: puzzle.solution[empties[0]] });
    session.link.send({ t: 'attack', ref: 3, power: 'freeze' });
    await until(() => guestInbox.some((m) => m.t === 'attack'));
    expect(guestInbox).toContainEqual({ t: 'placed', cell: empties[0] });

    guest.send({ t: 'resolved', ref: 3, outcome: 'blocked', cells: [], boxes: [], amount: 0 });
    await until(() => hostInbox.some((m) => m.t === 'resolved'));

    for (const cell of empties) guest.send({ t: 'placed', cell, digit: puzzle.solution[cell] });
    guest.send({ t: 'finished' });
    await until(() => guestInbox.some((m) => m.t === 'over') && hostInbox.some((m) => m.t === 'over'));
    expect(guestInbox.find((m) => m.t === 'over')).toEqual({ t: 'over', won: true, reason: 'solved' });
    expect(hostInbox.find((m) => m.t === 'over')).toEqual({ t: 'over', won: false, reason: 'solved' });
  });

  it('refuse un troisième téléphone', async () => {
    await setup();
    let closed: string | null = null;
    const intruder = joinTcp(tcp, '127.0.0.1', port, {
      onMessage: () => {},
      onClose: (reason) => (closed = reason),
    });
    cleanups.push(() => intruder.close());
    await until(() => closed !== null);
  });

  it('donne la victoire à l’hôte si l’invité s’en va en plein duel', async () => {
    const { guest, hostInbox, state } = await setup();
    guest.close();
    await until(() => hostInbox.some((m) => m.t === 'over'));
    expect(hostInbox.find((m) => m.t === 'over')).toEqual({ t: 'over', won: true, reason: 'forfeit' });
    expect(state().guestLeft).toBe(true);
  });

  it('prévient l’invité quand l’hôte ferme', async () => {
    const { server, session, state } = await setup();
    server.stop();
    session.close();
    await until(() => state().guestClosed !== null);
    expect(state().guestClosed).toBe('rivalLeft');
  });

  it('signale une adresse injoignable', async () => {
    let closed: string | null = null;
    const link = joinTcp(tcp, '127.0.0.1', 1, { onMessage: () => {}, onClose: (r) => (closed = r) });
    cleanups.push(() => link.close());
    await until(() => closed !== null);
    expect(closed).toBe('unreachable');
  });
});
