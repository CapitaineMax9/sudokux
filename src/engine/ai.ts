/**
 * Adversaire contrôlé par l'ordinateur.
 *
 * Le bot ne « triche » pas sur les règles : il remplit sa propre copie de la
 * grille à son rythme, gagne de la charge comme le joueur, subit les mêmes
 * effets et passe par le même système d'attaques. Un adversaire en ligne
 * pourra donc le remplacer sans changer le reste du moteur.
 */
import { CELLS, logicSolve } from './sudoku';
import { POWERS, RULES, isAttack, type PowerId } from './powers';
import {
  hasEffect,
  isCellHidden,
  placeCorrect,
  rand,
  randBetween,
  randIndex,
  castPower,
  type AiState,
  type MatchEvent,
  type MatchState,
  type PendingAttack,
} from './matchCore';

/** Jamais dans l'avenir prévisible : sert à désactiver une échéance. */
const NEVER = Number.MAX_SAFE_INTEGER;

/** Poids du rythme de départ du bot face aux mesures du joueur (en cases). */
const PACE_PRIOR = 2.5;

export function createAi(state: MatchState): AiState | null {
  const { bot, puzzle } = state.config;
  if (!bot) return null;

  // Le bot suit l'ordre de déduction d'un humain ; les cases que la logique
  // simple ne trouve pas sont gardées pour la fin.
  const order = logicSolve(puzzle.puzzle, puzzle.variant).order;
  const planned = new Set(order);
  for (let i = 0; i < CELLS; i++) {
    if (puzzle.puzzle[i] === 0 && !planned.has(i)) order.push(i);
  }

  return {
    order,
    nextMoveAt: bot.startDelayMs,
    nextPowerAt: bot.startDelayMs + randBetween(state, bot.powerDelayMs[0], bot.powerDelayMs[1]),
    wanted: null,
    guard: null,
    purgeAt: null,
  };
}

/** Fait vivre le bot jusqu'à l'instant `state.now`. */
export function aiStep(state: MatchState, events: MatchEvent[]): void {
  const bot = state.config.bot;
  const ai = state.ai;
  const me = state.opponent;
  if (!bot || !ai || !me || state.status !== 'running') return;
  const now = state.now;

  // Réflexes programmés à l'avance.
  if (ai.guard !== null && now >= ai.guard.at) {
    const defense = ai.guard.power;
    ai.guard = null;
    castPower(state, 'opponent', defense, events);
  }
  if (ai.purgeAt !== null && now >= ai.purgeAt) {
    ai.purgeAt = null;
    castPower(state, 'opponent', 'purge', events);
  }

  // Gelé ou sonné : il ne peut rien poser. On repousse son prochain coup
  // tic après tic (et non d'un bloc), pour qu'une purge le libère aussitôt.
  const blocked = hasEffect(me, 'freeze') || me.stunnedUntil > now;
  if (blocked) {
    ai.nextMoveAt = Math.max(ai.nextMoveAt, now + 150);
  } else if (now >= ai.nextMoveAt) {
    const glitched = hasEffect(me, 'glitch');
    let interval = randBetween(state, bot.cellMs[0], bot.cellMs[1]);
    if (bot.pace) {
      // Temps moyen par case du joueur jusqu'ici. Au début, on n'a presque
      // aucune mesure : on part du rythme propre du bot (PACE_PRIOR cases
      // fictives), que les vraies cases du joueur remplacent peu à peu.
      const mean = (bot.cellMs[0] + bot.cellMs[1]) / 2;
      const total = CELLS - state.config.puzzle.clues;
      const placed = Math.max(0, total - state.player.remaining);
      const playerPace = (mean * PACE_PRIOR + now) / (PACE_PRIOR + placed);
      const target = Math.max(
        bot.pace.minMs,
        Math.min(bot.pace.maxMs, playerPace * bot.pace.ratio),
      );
      interval = target * (interval / mean);
    }
    // Grille brouillée ou retournée : il hésite et se trompe davantage.
    const dizzy = hasEffect(me, 'flip');
    if (glitched) interval *= 1.7;
    if (dizzy) interval *= 1.5;
    const slip = bot.mistakeChance + (glitched ? 0.25 : 0) + (dizzy ? 0.15 : 0);
    const cell = ai.order.find((c) => me.values[c] === 0 && !isCellHidden(me, c));

    if (cell === undefined) {
      // Tout ce qui lui reste est masqué : il patiente.
      ai.nextMoveAt = now + 400;
    } else if (rand(state) < slip) {
      const right = state.config.puzzle.solution[cell];
      const wrong = ((right - 1 + 1 + randIndex(state, 8)) % 9) + 1;
      me.mistakes += 1;
      me.combo = 0;
      me.stunnedUntil = now + RULES.mistakeStunMs;
      events.push({ type: 'mistake', side: 'opponent', cell, digit: wrong });
      ai.nextMoveAt = now + interval;
    } else {
      placeCorrect(state, 'opponent', cell, events);
      ai.nextMoveAt = now + interval;
      if (state.status !== 'running') return;
    }
  }

  // Dépense de charge : il choisit un pouvoir, puis économise pour lui.
  if (now >= ai.nextPowerAt) {
    if (ai.wanted === null) {
      const options = bot.powers.filter((p) => isAttack(p) || p === 'scan');
      if (options.length === 0) {
        ai.nextPowerAt = NEVER;
        return;
      }
      ai.wanted = options[randIndex(state, options.length)];
    }
    if (me.charge >= POWERS[ai.wanted].cost) {
      const power: PowerId = ai.wanted;
      ai.wanted = null;
      ai.nextPowerAt = now + randBetween(state, bot.powerDelayMs[0], bot.powerDelayMs[1]);
      castPower(state, 'opponent', power, events);
    }
  }
}

/** Une attaque part vers le bot : il tentera peut-être de lever une défense. */
export function aiOnAttackLaunched(state: MatchState, attack: PendingAttack): void {
  const bot = state.config.bot;
  const ai = state.ai;
  const me = state.opponent;
  if (!bot || !ai || !me || attack.target !== 'opponent') return;
  // Déjà protégé, ou déjà en train de réagir : inutile d'en faire plus.
  if (hasEffect(me, 'shield') || hasEffect(me, 'mirror') || ai.guard !== null) return;
  // Il préfère le Miroir (qui renvoie l'attaque) s'il peut se l'offrir.
  const defense = (['mirror', 'shield'] as const).find(
    (power) => bot.powers.includes(power) && me.charge >= POWERS[power].cost,
  );
  if (!defense) return;
  if (rand(state) < bot.shieldReflex) {
    ai.guard = {
      at: state.now + randBetween(state, 350, RULES.attackTravelMs - 250),
      power: defense,
    };
  }
}

/** Une attaque vient de toucher le bot : il tentera peut-être une purge. */
export function aiOnAttackHit(state: MatchState, attack: PendingAttack): void {
  const bot = state.config.bot;
  const ai = state.ai;
  if (!bot || !ai || attack.target !== 'opponent') return;
  if (!bot.powers.includes('purge') || attack.power === 'virus') return;
  if (rand(state) < 0.75) ai.purgeAt = state.now + randBetween(state, 700, 1800);
}
