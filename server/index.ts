/**
 * Serveur de duels en ligne de Sudoku X.
 *
 *   npm run server
 *
 * Il écoute sur le port 8787 (ou celui de la variable d'environnement PORT).
 * Toute la logique est dans `lobby.ts` ; ce fichier ne fait que le relier
 * aux connexions WebSocket.
 */
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';

import { WebSocketServer, type WebSocket } from 'ws';

import { DEFAULT_PORT } from '../src/net/protocol';
import { Lobby } from './lobby';

const PORT = Number(process.env.PORT) || DEFAULT_PORT;
/** Taille maximale d'un message : les nôtres font quelques dizaines d'octets. */
const MAX_MESSAGE_BYTES = 2048;
/** Au-delà de ce débit, la connexion est coupée (protection contre les abus). */
const MAX_MESSAGES_PER_SECOND = 40;
const HEARTBEAT_MS = 25_000;

const stamp = () => new Date().toISOString().slice(11, 19);
const lobby = new Lobby({ log: (line) => console.log(`${stamp()} ${line}`) });

const http = createServer((request, response) => {
  // Page d'état : utile pour vérifier que le serveur tourne (et pour les hébergeurs).
  const stats = lobby.stats();
  response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(
    `Sudoku X — serveur de duels\n` +
      `Joueurs connectés : ${stats.clients}\n` +
      `Duels en cours : ${stats.matches}\n`,
  );
});

const wss = new WebSocketServer({ server: http, maxPayload: MAX_MESSAGE_BYTES });
const alive = new WeakMap<WebSocket, boolean>();

wss.on('connection', (socket) => {
  alive.set(socket, true);
  let windowStart = Date.now();
  let count = 0;

  const id = lobby.connect({
    send(message) {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    },
  });

  socket.on('pong', () => alive.set(socket, true));

  socket.on('message', (data, isBinary) => {
    if (isBinary) return;
    const now = Date.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      count = 0;
    }
    if (++count > MAX_MESSAGES_PER_SECOND) {
      socket.close(1008, 'trop de messages');
      return;
    }
    let message: unknown;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }
    lobby.receive(id, message);
  });

  socket.on('close', () => lobby.disconnect(id));
  socket.on('error', () => socket.terminate());
});

// Les connexions mortes (téléphone éteint, réseau coupé) sont détectées et fermées.
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (alive.get(socket) === false) {
      socket.terminate();
      continue;
    }
    alive.set(socket, false);
    socket.ping();
  }
}, HEARTBEAT_MS);

wss.on('close', () => clearInterval(heartbeat));

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Sudoku X — serveur de duels prêt sur le port ${PORT}`);
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => `ws://${entry?.address}:${PORT}`);
  if (addresses.length > 0) {
    console.log(`Adresse sur ton réseau Wi-Fi : ${addresses.join('  ou  ')}`);
  }
  console.log('Laisse cette fenêtre ouverte pendant que vous jouez. Ctrl+C pour arrêter.');
});
