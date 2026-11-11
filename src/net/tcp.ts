/**
 * Duel sur un même réseau (Wi-Fi ou partage de connexion), sans Internet :
 * l'hôte ouvre une petite connexion TCP sur son téléphone et l'invité s'y
 * branche directement. Les messages sont du JSON, un par ligne.
 *
 * Ce fichier ne dépend que d'une interface « à la Node.js » : dans l'app, on
 * lui passe `react-native-tcp-socket` ; dans les tests, le module `net` de Node.
 */
import type { HostSession } from './host';
import type { Link, LinkHandlers } from './link';

export interface NetSocket {
  write(data: string): unknown;
  setEncoding?(encoding: 'utf8'): unknown;
  on(event: 'data', listener: (data: unknown) => void): unknown;
  on(event: 'close' | 'error' | 'connect', listener: (arg?: unknown) => void): unknown;
  destroy(): unknown;
}

export interface NetServer {
  listen(options: { port: number; host: string }, callback?: () => void): unknown;
  on(event: 'error', listener: (error: unknown) => void): unknown;
  close(): unknown;
}

export interface NetLike {
  createServer(listener: (socket: NetSocket) => void): NetServer;
  createConnection(options: { host: string; port: number }, callback?: () => void): NetSocket;
}

/** Un message trop long est forcément anormal : on coupe la connexion. */
const MAX_LINE = 8192;
const CONNECT_TIMEOUT_MS = 8000;

/** Découpe un flux de texte en lignes, en gardant les morceaux incomplets. */
function lineReader(onLine: (line: string) => void, onOverflow: () => void) {
  let buffer = '';
  return (chunk: unknown) => {
    buffer += typeof chunk === 'string' ? chunk : String(chunk);
    let index = buffer.indexOf('\n');
    while (index >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line) onLine(line);
      index = buffer.indexOf('\n');
    }
    if (buffer.length > MAX_LINE) onOverflow();
  };
}

function parse(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export interface TcpHost {
  stop: () => void;
}

/** Ouvre la porte de l'hôte. Un seul invité à la fois ; les suivants sont refusés. */
export function hostTcp(net: NetLike, port: number, session: HostSession): Promise<TcpHost> {
  return new Promise((resolve, reject) => {
    const sockets = new Set<NetSocket>();
    const server = net.createServer((socket) => {
      const guest = session.attachGuest((message) => {
        socket.write(`${JSON.stringify(message)}\n`);
      });
      if (!guest) {
        socket.destroy();
        return;
      }
      sockets.add(socket);
      socket.setEncoding?.('utf8');
      let gone = false;
      const leave = () => {
        if (gone) return;
        gone = true;
        sockets.delete(socket);
        guest.close();
      };
      socket.on(
        'data',
        lineReader(
          (line) => guest.receive(parse(line)),
          () => socket.destroy(),
        ),
      );
      socket.on('close', leave);
      socket.on('error', leave);
    });
    let listening = false;
    server.on('error', (error) => {
      if (!listening) reject(error);
    });
    server.listen({ port, host: '0.0.0.0' }, () => {
      listening = true;
      resolve({
        stop: () => {
          for (const socket of sockets) socket.destroy();
          sockets.clear();
          server.close();
        },
      });
    });
  });
}

/** Rejoint l'hôte à son adresse sur le réseau local. */
export function joinTcp(net: NetLike, host: string, port: number, handlers: LinkHandlers): Link {
  let open = false;
  let finished = false;
  const finish = (reason: 'lost' | 'unreachable' | 'rivalLeft') => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    handlers.onClose(reason);
  };
  const socket = net.createConnection({ host, port }, () => {
    open = true;
    clearTimeout(timer);
    handlers.onOpen?.();
  });
  const timer = setTimeout(() => {
    socket.destroy();
    finish('unreachable');
  }, CONNECT_TIMEOUT_MS);
  socket.setEncoding?.('utf8');
  socket.on(
    'data',
    lineReader(
      (line) => {
        const message = parse(line);
        if (message && typeof message === 'object') handlers.onMessage(message as never);
      },
      () => socket.destroy(),
    ),
  );
  // Fermeture propre : c'est l'hôte qui est parti. Une erreur réseau : c'est la connexion.
  socket.on('close', () => finish(open ? 'rivalLeft' : 'unreachable'));
  socket.on('error', () => finish(open ? 'lost' : 'unreachable'));

  return {
    send: (message) => {
      if (open && !finished) socket.write(`${JSON.stringify(message)}\n`);
    },
    close: () => {
      finished = true;
      clearTimeout(timer);
      socket.destroy();
    },
  };
}
