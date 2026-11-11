/**
 * Un lien vers une partie en ligne, quel que soit le transport (réseau local
 * ou Internet). Le joueur envoie des `ClientMessage` et reçoit des
 * `ServerMessage`, exactement comme s'il parlait à un serveur.
 */
import type { ClientMessage, ServerMessage } from './protocol';

/** `rivalLeft` : l'autre a fermé la connexion ; `lost` : c'est notre réseau qui a lâché. */
export type CloseReason = 'lost' | 'unreachable' | 'rivalLeft';

export interface LinkHandlers {
  /** Le lien est prêt : on peut envoyer des messages. */
  onOpen?: () => void;
  onMessage: (message: ServerMessage) => void;
  onClose: (reason: CloseReason) => void;
}

export interface Link {
  send: (message: ClientMessage) => void;
  close: () => void;
}

/** Côté hôte : la porte d'entrée réservée à l'unique invité. */
export interface GuestPort {
  receive: (raw: unknown) => void;
  close: () => void;
}
