/**
 * Cœur d'une partie : types d'état, événements et opérations communes aux
 * deux camps (joueur et adversaire).
 *
 * Les fonctions de ce fichier modifient l'état qu'on leur passe. Elles ne
 * sont appelées que depuis le réducteur (`match.ts`), qui travaille sur un
 * brouillon immer : l'état vu par l'interface reste donc immuable.
 */
import { nextRandom } from './rng';
import {
  CELLS,
  boxOf,
  candidatesOf,
  obviousCells,
  topology,
  type Puzzle,
  type UnitKind,
} from './sudoku';
import {
  NEGATIVE_EFFECTS,
  POWERS,
  RULES,
  isAttack,
  type AttackId,
  type EffectId,
  type PowerId,
} from './powers';

export type Side = 'player' | 'opponent';
/** `system` = contre-mesures automatiques d'un niveau solo. */
export type AttackSource = Side | 'system';

export interface ActiveEffect {
  id: EffectId;
  startedAt: number;
  until: number;
  /** Blocs masqués (blackout uniquement). */
  boxes: number[];
  /** Cases mises en évidence (sonar uniquement). */
  cells: number[];
  /** Graine d'affichage (brouillage uniquement). */
  seed: number;
}

/** Le plateau d'un camp. */
export interface SideState {
  /** Chiffres visibles : donnés au départ ou trouvés. 0 = case vide. */
  values: number[];
  /** Notes au crayon, un masque de 9 bits par case. */
  notes: number[];
  charge: number;
  combo: number;
  bestCombo: number;
  lastCorrectAt: number;
  score: number;
  mistakes: number;
  /** Nombre de cases encore vides. */
  remaining: number;
  effects: ActiveEffect[];
  /** Saisie bloquée jusqu'à cet instant après une erreur (duel). */
  stunnedUntil: number;
  powersUsed: number;
}

export interface PendingAttack {
  id: number;
  /**
   * En ligne, numéro de cette attaque sur l'appareil de celui qui l'a
   * lancée : il sert à lui renvoyer le résultat. `null` hors ligne.
   */
  ref: number | null;
  power: AttackId;
  from: AttackSource;
  target: Side;
  launchedAt: number;
  hitAt: number;
}

/** Réglages d'un adversaire contrôlé par l'ordinateur. */
export interface BotConfig {
  id: string;
  /** Temps mini / maxi entre deux chiffres posés (rythme de départ si `pace` est défini). */
  cellMs: [number, number];
  /** Probabilité de se tromper à chaque tentative. */
  mistakeChance: number;
  powers: PowerId[];
  /** Temps mini / maxi entre deux pouvoirs. */
  powerDelayMs: [number, number];
  /** Probabilité de lever une défense (Pare-feu ou Miroir) quand une attaque arrive. */
  shieldReflex: number;
  /**
   * Rythme adaptatif : le bot cale sa vitesse sur celle du joueur.
   * `ratio` < 1 = un peu plus rapide que le joueur, > 1 = un peu plus lent ;
   * le temps par case reste borné entre `minMs` et `maxMs`.
   * `null` = rythme fixe donné par `cellMs`.
   */
  pace: { ratio: number; minMs: number; maxMs: number } | null;
  startDelayMs: number;
}

export interface AiState {
  /** Ordre dans lequel le bot compte remplir les cases. */
  order: number[];
  nextMoveAt: number;
  nextPowerAt: number;
  /** Pouvoir pour lequel il économise sa charge. */
  wanted: PowerId | null;
  /** Défense qu'il a prévu de lever, et à quel instant. */
  guard: { at: number; power: 'shield' | 'mirror' } | null;
  purgeAt: number | null;
}

export interface CountermeasureConfig {
  firstAtMs: number;
  everyMs: [number, number];
  pool: AttackId[];
}

export interface MatchConfig {
  mode: 'solo' | 'duel';
  puzzle: Puzzle;
  /** Graine des événements aléatoires de la partie (IA, attaques). */
  seed: number;
  /** Pouvoirs disponibles dans la barre du joueur. */
  powers: PowerId[];
  /** `null` = pas de limite d'erreurs. */
  maxMistakes: number | null;
  /** `null` = pas de compte à rebours. */
  timeLimitMs: number | null;
  countermeasures: CountermeasureConfig | null;
  bot: BotConfig | null;
  /**
   * Duel en ligne : l'adversaire est un autre joueur. Son plateau n'évolue
   * que par les messages reçus du réseau (voir `remote.ts`), et c'est le
   * serveur qui désigne le vainqueur.
   */
  remote: boolean;
}

export type MatchStatus = 'running' | 'paused' | 'won' | 'lost';
export type EndReason =
  | 'solved'
  | 'mistakes'
  | 'timeout'
  | 'outpaced'
  | 'abandon'
  /** En ligne : l'adversaire a quitté la partie. */
  | 'forfeit'
  /** En ligne : la connexion au serveur a été perdue. */
  | 'disconnected';

export interface MatchState {
  config: MatchConfig;
  status: MatchStatus;
  endReason: EndReason | null;
  /** Horloge de la partie en millisecondes (ne tourne pas en pause). */
  now: number;
  player: SideState;
  opponent: SideState | null;
  ai: AiState | null;
  pending: PendingAttack[];
  selected: number | null;
  notesMode: boolean;
  nextCountermeasureAt: number | null;
  /** État du générateur aléatoire. */
  rng: number;
  nextId: number;
}

export type DenyReason = 'charge' | 'noTarget' | 'active' | 'noOpponent' | 'locked';
export type BlockReason = 'frozen' | 'stunned' | 'hidden';

/** Ce qui vient de se passer : l'interface s'en sert pour les animations. */
export type MatchEvent =
  | {
      type: 'placed';
      side: Side;
      cell: number;
      digit: number;
      points: number;
      combo: number;
      revealed: boolean;
    }
  | { type: 'unitComplete'; side: Side; kind: UnitKind; index: number; cells: number[]; origin: number }
  | { type: 'mistake'; side: Side; cell: number; digit: number }
  | { type: 'inputBlocked'; reason: BlockReason }
  | { type: 'noteToggled'; cell: number }
  | { type: 'powerUsed'; side: Side; power: PowerId }
  | { type: 'powerDenied'; power: PowerId; reason: DenyReason }
  | { type: 'effectsCleared'; side: Side; effects: EffectId[] }
  | { type: 'effectEnded'; side: Side; effect: EffectId }
  | { type: 'attackLaunched'; attack: PendingAttack }
  | { type: 'attackBlocked'; attack: PendingAttack }
  /** L'attaque a rebondi sur un Miroir : elle repart vers son auteur. */
  | { type: 'attackReflected'; attack: PendingAttack }
  | {
      type: 'attackHit';
      attack: PendingAttack;
      /** Cases effacées (virus). */
      cells: number[];
      /** Blocs masqués (blackout). */
      boxes: number[];
      /** Charge volée (siphon). */
      amount: number;
    }
  /** En ligne : la grille de ce camp est terminée, on attend le verdict du serveur. */
  | { type: 'completed'; side: Side }
  | { type: 'finished'; result: 'won' | 'lost'; reason: EndReason };

/* ------------------------------------------------------------------ */
/* Accès et hasard                                                     */
/* ------------------------------------------------------------------ */

export const otherSide = (side: Side): Side => (side === 'player' ? 'opponent' : 'player');

export function sideOf(state: MatchState, side: Side): SideState {
  if (side === 'player') return state.player;
  if (!state.opponent) throw new Error("Cette partie n'a pas d'adversaire");
  return state.opponent;
}

export function findEffect(side: SideState, id: EffectId): ActiveEffect | undefined {
  return side.effects.find((effect) => effect.id === id);
}

export const hasEffect = (side: SideState, id: EffectId) => findEffect(side, id) !== undefined;

export function isCellHidden(side: SideState, cell: number): boolean {
  const blackout = findEffect(side, 'blackout');
  return blackout !== undefined && blackout.boxes.includes(boxOf(cell));
}

export function makeEffect(
  id: EffectId,
  now: number,
  until: number,
  extra: Partial<Pick<ActiveEffect, 'boxes' | 'cells' | 'seed'>> = {},
): ActiveEffect {
  return { id, startedAt: now, until, boxes: [], cells: [], seed: 0, ...extra };
}

export function rand(state: MatchState): number {
  const [value, next] = nextRandom(state.rng);
  state.rng = next;
  return value;
}

export const randBetween = (state: MatchState, min: number, max: number) =>
  min + rand(state) * (max - min);

export const randIndex = (state: MatchState, n: number) => Math.floor(rand(state) * n);

function shuffleWith<T>(state: MatchState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randIndex(state, i + 1);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Opérations                                                          */
/* ------------------------------------------------------------------ */

export function finishMatch(
  state: MatchState,
  result: 'won' | 'lost',
  reason: EndReason,
  events: MatchEvent[],
): void {
  if (state.status === 'won' || state.status === 'lost') return;
  state.status = result;
  state.endReason = reason;
  state.pending = [];
  events.push({ type: 'finished', result, reason });
}

/**
 * Pose le bon chiffre dans une case, pour l'un ou l'autre camp.
 * `revealed` = chiffre offert par un pouvoir : ni points de combo ni charge.
 */
export function placeCorrect(
  state: MatchState,
  who: Side,
  cell: number,
  events: MatchEvent[],
  revealed = false,
): void {
  const side = sideOf(state, who);
  const { puzzle } = state.config;
  const topo = topology(puzzle.variant);
  const digit = puzzle.solution[cell];

  side.values[cell] = digit;
  side.notes[cell] = 0;
  side.remaining -= 1;
  const keep = ~(1 << (digit - 1));
  for (const peer of topo.peers[cell]) side.notes[peer] &= keep;

  let points = 0;
  let gain = 0;
  if (!revealed) {
    const chained = side.combo > 0 && state.now - side.lastCorrectAt <= RULES.comboWindowMs;
    side.combo = chained ? side.combo + 1 : 1;
    side.lastCorrectAt = state.now;
    if (side.combo > side.bestCombo) side.bestCombo = side.combo;
    points = RULES.basePoints * Math.min(side.combo, RULES.maxComboMultiplier);
    gain = RULES.chargePerCell + Math.min(side.combo - 1, RULES.chargeComboBonusMax);
  }

  const completed: number[] = [];
  for (const ui of topo.unitsOf[cell]) {
    if (topo.units[ui].cells.every((c) => side.values[c] !== 0)) {
      completed.push(ui);
      points += RULES.unitBonus;
      gain += RULES.chargePerUnit;
    }
  }

  side.score += points;
  side.charge = Math.min(RULES.maxCharge, side.charge + gain);

  events.push({ type: 'placed', side: who, cell, digit, points, combo: side.combo, revealed });
  for (const ui of completed) {
    const unit = topo.units[ui];
    events.push({
      type: 'unitComplete',
      side: who,
      kind: unit.kind,
      index: unit.index,
      cells: [...unit.cells],
      origin: cell,
    });
  }

  if (side.remaining === 0) {
    if (state.config.remote) {
      // En ligne, le serveur arbitre : on signale seulement que la grille est finie.
      events.push({ type: 'completed', side: who });
    } else if (who === 'player') {
      finishMatch(state, 'won', 'solved', events);
    } else {
      finishMatch(state, 'lost', 'outpaced', events);
    }
  }
}

function addEffect(side: SideState, effect: ActiveEffect): void {
  const existing = findEffect(side, effect.id);
  if (!existing) {
    side.effects.push(effect);
    return;
  }
  existing.until = Math.max(existing.until, effect.until);
  existing.seed = effect.seed;
  if (effect.boxes.length > 0) existing.boxes = effect.boxes;
  if (effect.cells.length > 0) existing.cells = effect.cells;
}

/**
 * Tente d'utiliser un pouvoir. Renvoie `true` si la charge a été dépensée.
 * Une attaque n'agit pas tout de suite : elle part vers l'adversaire et
 * touchera sa cible après `RULES.attackTravelMs`.
 */
export function castPower(
  state: MatchState,
  who: Side,
  power: PowerId,
  events: MatchEvent[],
): boolean {
  const def = POWERS[power];
  const side = sideOf(state, who);
  const deny = (reason: DenyReason): boolean => {
    if (who === 'player') events.push({ type: 'powerDenied', power, reason });
    return false;
  };

  if (who === 'player' && !state.config.powers.includes(power)) return deny('locked');
  if (isAttack(power) && !state.opponent) return deny('noOpponent');
  if (side.charge < def.cost) return deny('charge');

  const spend = () => {
    side.charge -= def.cost;
    side.powersUsed += 1;
    events.push({ type: 'powerUsed', side: who, power });
  };
  const until = state.now + def.durationMs;

  switch (power) {
    case 'scan': {
      let target = -1;
      const selected = who === 'player' ? state.selected : null;
      if (selected !== null && side.values[selected] === 0 && !isCellHidden(side, selected)) {
        target = selected;
      } else {
        const open: number[] = [];
        const hidden: number[] = [];
        for (let i = 0; i < CELLS; i++) {
          if (side.values[i] !== 0) continue;
          (isCellHidden(side, i) ? hidden : open).push(i);
        }
        const pool = open.length > 0 ? open : hidden;
        if (pool.length === 0) return deny('noTarget');
        target = pool[randIndex(state, pool.length)];
      }
      spend();
      if (who === 'player') state.selected = target;
      placeCorrect(state, who, target, events, true);
      return true;
    }

    case 'analyse': {
      spend();
      const variant = state.config.puzzle.variant;
      for (let i = 0; i < CELLS; i++) {
        side.notes[i] = side.values[i] === 0 ? candidatesOf(side.values, i, variant) : 0;
      }
      return true;
    }

    case 'sonar': {
      // Cases déductibles tout de suite, hors des blocs plongés dans le noir.
      const cells = obviousCells(side.values, state.config.puzzle.variant).filter(
        (cell) => !isCellHidden(side, cell),
      );
      if (cells.length === 0) return deny('noTarget');
      spend();
      // Un nouveau sonar remplace l'ancien : la liste doit refléter la grille actuelle.
      side.effects = side.effects.filter((e) => e.id !== 'sonar');
      side.effects.push(makeEffect('sonar', state.now, until, { cells }));
      return true;
    }

    case 'shield':
    case 'mirror': {
      if (hasEffect(side, power)) return deny('active');
      spend();
      addEffect(side, makeEffect(power, state.now, until));
      return true;
    }

    case 'purge': {
      const cleared = side.effects.filter((e) => NEGATIVE_EFFECTS.includes(e.id)).map((e) => e.id);
      if (cleared.length === 0 && side.stunnedUntil <= state.now) return deny('noTarget');
      spend();
      side.effects = side.effects.filter((e) => !NEGATIVE_EFFECTS.includes(e.id));
      side.stunnedUntil = 0;
      events.push({ type: 'effectsCleared', side: who, effects: cleared });
      return true;
    }

    default: {
      spend();
      const attack: PendingAttack = {
        id: state.nextId++,
        ref: null,
        power,
        from: who,
        target: otherSide(who),
        launchedAt: state.now,
        hitAt: state.now + RULES.attackTravelMs,
      };
      state.pending.push(attack);
      events.push({ type: 'attackLaunched', attack: { ...attack } });
      return true;
    }
  }
}

/**
 * Applique une attaque arrivée à destination. Un Miroir la renvoie à son
 * auteur, un Pare-feu l'absorbe ; sinon elle produit son effet.
 */
export function resolveAttack(state: MatchState, incoming: PendingAttack, events: MatchEvent[]): void {
  const attack: PendingAttack = { ...incoming };
  const target = sideOf(state, attack.target);
  const now = state.now;

  const mirrorIndex = target.effects.findIndex((e) => e.id === 'mirror');
  if (mirrorIndex >= 0) {
    target.effects.splice(mirrorIndex, 1);
    events.push({ type: 'attackReflected', attack });
    if (attack.from !== 'system') {
      const back: PendingAttack = {
        id: state.nextId++,
        ref: null,
        power: attack.power,
        from: attack.target,
        target: attack.from,
        launchedAt: now,
        hitAt: now + RULES.attackTravelMs,
      };
      state.pending.push(back);
      events.push({ type: 'attackLaunched', attack: { ...back } });
    }
    return;
  }

  const shieldIndex = target.effects.findIndex((e) => e.id === 'shield');
  if (shieldIndex >= 0) {
    target.effects.splice(shieldIndex, 1);
    events.push({ type: 'attackBlocked', attack });
    return;
  }

  const until = now + POWERS[attack.power].durationMs;
  let cells: number[] = [];
  let boxes: number[] = [];
  let amount = 0;

  switch (attack.power) {
    case 'freeze':
    case 'flip':
      addEffect(target, makeEffect(attack.power, now, until));
      break;

    case 'glitch':
      addEffect(
        target,
        makeEffect('glitch', now, until, { seed: Math.floor(rand(state) * 0x7fffffff) }),
      );
      break;

    case 'blackout': {
      // On masque en priorité des blocs où il reste du travail, mais on en
      // laisse toujours au moins un visible : la cible ne doit pas être
      // totalement bloquée.
      const unfinished: number[] = [];
      const finished: number[] = [];
      for (let box = 0; box < 9; box++) {
        let hasWork = false;
        for (let i = 0; i < CELLS; i++) {
          if (boxOf(i) === box && target.values[i] === 0) {
            hasWork = true;
            break;
          }
        }
        (hasWork ? unfinished : finished).push(box);
      }
      shuffleWith(state, unfinished);
      shuffleWith(state, finished);
      const fromUnfinished = Math.min(RULES.blackoutBoxes, Math.max(0, unfinished.length - 1));
      boxes = [
        ...unfinished.slice(0, fromUnfinished),
        ...finished.slice(0, RULES.blackoutBoxes - fromUnfinished),
      ].sort((a, b) => a - b);
      addEffect(target, makeEffect('blackout', now, until, { boxes: [...boxes] }));
      if (
        attack.target === 'player' &&
        state.selected !== null &&
        boxes.includes(boxOf(state.selected))
      ) {
        state.selected = null;
      }
      break;
    }

    case 'virus': {
      const given = state.config.puzzle.puzzle;
      const found: number[] = [];
      for (let i = 0; i < CELLS; i++) if (given[i] === 0 && target.values[i] !== 0) found.push(i);
      shuffleWith(state, found);
      cells = found.slice(0, RULES.virusCells).sort((a, b) => a - b);
      for (const cell of cells) {
        target.values[cell] = 0;
        target.remaining += 1;
      }
      break;
    }

    case 'siphon': {
      amount = Math.min(RULES.siphonAmount, target.charge);
      target.charge -= amount;
      // Le voleur est crédité ici s'il joue sur cet appareil. En ligne,
      // l'attaquant distant sera crédité chez lui en recevant le résultat.
      const local = attack.from !== 'system' && !(state.config.remote && attack.from === 'opponent');
      if (local) {
        const thief = sideOf(state, attack.from as Side);
        thief.charge = Math.min(RULES.maxCharge, thief.charge + amount);
      }
      break;
    }
  }

  events.push({ type: 'attackHit', attack, cells, boxes, amount });
}
