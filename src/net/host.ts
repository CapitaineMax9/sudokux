/**
 * Il n'y a pas de serveur : c'est le téléphone de l'hôte qui arbitre le duel.
 * Il fait tourner le même `Lobby` que celui d'un serveur, avec deux joueurs :
 * lui-même (directement, sans réseau) et un invité (par le réseau).
 */
import { Lobby } from './lobby';
import type { GuestPort, Link, LinkHandlers } from './link';
import type { ServerMessage } from './protocol';

export interface HostOptions {
  /** L'invité est parti (connexion fermée). */
  onGuestLeft?: () => void;
  /** L'invité vient d'arriver. */
  onGuestJoined?: () => void;
  startInMs?: number;
}

export class HostSession {
  readonly link: Link;
  private readonly lobby: Lobby;
  private readonly selfId: string;
  private guestId: string | null = null;
  private closed = false;

  constructor(
    handlers: LinkHandlers,
    private readonly options: HostOptions = {},
  ) {
    this.lobby = new Lobby({ startInMs: options.startInMs ?? 4000 });
    // Les réponses à l'hôte sont livrées juste après, jamais pendant le
    // traitement d'un message : cela évite les réactions en cascade.
    this.selfId = this.lobby.connect({
      send: (message: ServerMessage) => {
        setTimeout(() => {
          if (!this.closed) handlers.onMessage(message);
        }, 0);
      },
    });
    this.link = {
      send: (message) => {
        if (!this.closed) this.lobby.receive(this.selfId, message);
      },
      close: () => this.close(),
    };
  }

  get hasGuest(): boolean {
    return this.guestId !== null;
  }

  /** Branche l'invité. Renvoie `null` si la place est déjà prise. */
  attachGuest(send: (message: ServerMessage) => void): GuestPort | null {
    if (this.closed || this.guestId !== null) return null;
    const id = this.lobby.connect({ send });
    this.guestId = id;
    this.options.onGuestJoined?.();
    return {
      receive: (raw) => {
        if (this.guestId === id) this.lobby.receive(id, raw);
      },
      close: () => {
        if (this.guestId !== id) return;
        this.guestId = null;
        // Si un duel était en cours, l'invité le perd par forfait.
        this.lobby.disconnect(id);
        if (!this.closed) this.options.onGuestLeft?.();
      },
    };
  }

  close(): void {
    if (this.closed) return;
    if (this.guestId !== null) this.lobby.disconnect(this.guestId);
    this.guestId = null;
    this.lobby.disconnect(this.selfId);
    this.closed = true;
  }
}
