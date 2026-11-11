/**
 * Tous les textes d'interface, en français et en anglais côte à côte pour
 * qu'ils restent synchronisés. Les dialogues de l'histoire sont dans
 * `src/content/story.ts`.
 */
export type Lang = 'fr' | 'en';

export interface L10n {
  fr: string;
  en: string;
}

export const STRINGS = {
  'app.tagline': {
    fr: 'Neuf chiffres font la loi.\nTu es le dixième.',
    en: 'Nine digits make the law.\nYou are the tenth.',
  },

  'common.back': { fr: 'Retour', en: 'Back' },
  'common.continue': { fr: 'Continuer', en: 'Continue' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.confirm': { fr: 'Confirmer', en: 'Confirm' },
  'common.locked': { fr: 'Verrouillé', en: 'Locked' },
  'common.soon': { fr: 'Bientôt', en: 'Soon' },
  'common.new': { fr: 'NOUVEAU', en: 'NEW' },
  'common.skip': { fr: 'Passer', en: 'Skip' },
  'common.tapToContinue': { fr: 'Touche pour continuer', en: 'Tap to continue' },

  'home.story': { fr: 'Histoire', en: 'Story' },
  'home.storySub': { fr: 'Chapitre 1 · Le Neuvième', en: 'Chapter 1 · The Ninth' },
  'home.duel': { fr: 'Duel', en: 'Duel' },
  'home.duelSub': { fr: 'Affronte un adversaire en temps réel', en: 'Face an opponent in real time' },
  'home.free': { fr: 'Partie libre', en: 'Free play' },
  'home.freeSub': { fr: 'Une grille, ton rythme', en: 'One grid, your pace' },
  'home.powers': { fr: 'Pouvoirs', en: 'Powers' },
  'home.settings': { fr: 'Réglages', en: 'Settings' },
  'home.rank': { fr: 'Rang', en: 'Rank' },

  'rank.0': { fr: 'Novice', en: 'Rookie' },
  'rank.1': { fr: 'Bidouilleur', en: 'Tinkerer' },
  'rank.2': { fr: 'Décrypteur', en: 'Decoder' },
  'rank.3': { fr: 'Briseur de Scellés', en: 'Seal Breaker' },
  'rank.4': { fr: 'Fantôme de la Trame', en: 'Lattice Ghost' },
  'rank.5': { fr: 'Maître des Neuf', en: 'Master of Nine' },
  'rank.6': { fr: "Légende d'Ennéa", en: 'Legend of Ennea' },

  'story.title': { fr: 'Histoire', en: 'Story' },
  'story.chapter': { fr: 'Chapitre {n}', en: 'Chapter {n}' },
  'story.mission': { fr: 'Mission {n}', en: 'Mission {n}' },
  'story.start': { fr: 'Lancer la mission', en: 'Start mission' },
  'story.replay': { fr: 'Rejouer la mission', en: 'Replay mission' },
  'story.reward': { fr: 'Récompense', en: 'Reward' },
  'story.rewardOwned': { fr: 'Déjà obtenu', en: 'Already owned' },
  'story.lockedHint': { fr: 'Termine la mission précédente', en: 'Finish the previous mission' },
  'story.upcoming': { fr: 'À venir', en: 'Coming next' },
  'story.kind.solo': { fr: 'Scellé', en: 'Seal' },
  'story.kind.duel': { fr: 'Duel', en: 'Duel' },
  'story.kind.boss': { fr: 'Boss', en: 'Boss' },
  'story.chapterDone': { fr: 'Chapitre terminé', en: 'Chapter complete' },

  'mod.timer': { fr: 'Compte à rebours : {time}', en: 'Countdown: {time}' },
  'mod.mistakes': { fr: '{n} erreurs autorisées', en: '{n} mistakes allowed' },
  'mod.counter': { fr: 'Le Scellé contre-attaque', en: 'The Seal fights back' },
  'mod.xvariant': { fr: 'Scellé-X : les diagonales comptent', en: 'X-Seal: diagonals count' },
  'mod.opponent': { fr: 'Adversaire : {name}', en: 'Opponent: {name}' },

  'game.notes': { fr: 'Notes', en: 'Notes' },
  'game.erase': { fr: 'Gomme', en: 'Erase' },
  'game.paused': { fr: 'PAUSE', en: 'PAUSED' },
  'game.quitTitle': { fr: 'ABANDONNER ?', en: 'GIVE UP?' },
  'game.resume': { fr: 'Reprendre', en: 'Resume' },
  'game.restart': { fr: 'Recommencer', en: 'Restart' },
  'game.quit': { fr: 'Abandonner', en: 'Give up' },
  'game.score': { fr: 'SCORE', en: 'SCORE' },
  'game.combo': { fr: 'COMBO', en: 'COMBO' },
  'game.charge': { fr: 'CHARGE', en: 'CHARGE' },
  'game.errors': { fr: 'ERREURS', en: 'MISTAKES' },
  'game.cellsLeft': { fr: '{n} cases', en: '{n} cells' },
  'game.you': { fr: 'TOI', en: 'YOU' },
  'game.frozen': { fr: 'GELÉ', en: 'FROZEN' },
  'game.stunned': { fr: 'ERREUR', en: 'MISTAKE' },
  'game.noSignal': { fr: 'SIGNAL PERDU', en: 'NO SIGNAL' },
  'game.incoming': { fr: 'ATTAQUE ENTRANTE', en: 'INCOMING ATTACK' },
  'game.countermeasure': { fr: 'CONTRE-MESURE', en: 'COUNTERMEASURE' },
  'game.blocked': { fr: 'BLOQUÉ', en: 'BLOCKED' },
  'game.reflected': { fr: 'RENVOYÉ', en: 'REFLECTED' },
  'game.stolen': { fr: '+{n} CHARGE', en: '+{n} CHARGE' },
  'game.drained': { fr: '−{n} CHARGE', en: '−{n} CHARGE' },
  'game.hit': { fr: 'TOUCHÉ', en: 'HIT' },
  'game.loading': { fr: 'Génération du Scellé…', en: 'Generating the Seal…' },
  'game.connecting': { fr: 'CONNEXION AU SCELLÉ', en: 'CONNECTING TO SEAL' },
  'game.go': { fr: 'HACK !', en: 'HACK!' },
  'game.xseal': { fr: 'SCELLÉ-X', en: 'X-SEAL' },

  'deny.charge': { fr: 'Charge insuffisante', en: 'Not enough charge' },
  'deny.noTarget': { fr: 'Aucun effet à annuler', en: 'Nothing to cleanse' },
  'deny.active': { fr: 'Déjà actif', en: 'Already active' },
  'deny.noOpponent': { fr: 'Réservé aux duels', en: 'Duels only' },
  'deny.locked': { fr: 'Pouvoir non équipé', en: 'Power not equipped' },

  'result.winSolo': { fr: 'SCELLÉ BRISÉ', en: 'SEAL BROKEN' },
  'result.winDuel': { fr: 'VICTOIRE', en: 'VICTORY' },
  'result.lose': { fr: 'ACCÈS REFUSÉ', en: 'ACCESS DENIED' },
  'reason.mistakes': {
    fr: "Trop d'erreurs : le Scellé s'est verrouillé.",
    en: 'Too many mistakes: the Seal locked itself.',
  },
  'reason.timeout': { fr: 'Temps écoulé : tu as été tracé.', en: 'Time is up: you were traced.' },
  'reason.outpaced': { fr: '{name} a fini avant toi.', en: '{name} finished before you.' },
  'reason.abandon': { fr: 'Connexion interrompue.', en: 'Connection dropped.' },
  'reason.disconnected': { fr: 'Connexion au serveur perdue.', en: 'Lost connection to the server.' },
  'reason.forfeit': { fr: '{name} a quitté le duel.', en: '{name} left the duel.' },
  'online.title': { fr: 'En ligne', en: 'Online' },
  'online.name': { fr: 'Ton pseudo', en: 'Your name' },
  'online.connecting': { fr: 'Connexion au serveur…', en: 'Connecting to server…' },
  'online.connected': { fr: 'Connecté au serveur', en: 'Connected to server' },
  'online.unreachable': {
    fr: 'Serveur introuvable. Lance « npm run server » sur ton ordinateur, puis réessaie.',
    en: 'Server not found. Run "npm run server" on your computer, then try again.',
  },
  'online.lost': { fr: 'Connexion perdue.', en: 'Connection lost.' },
  'online.badVersion': {
    fr: "Le jeu et le serveur n'ont pas la même version. Mets les deux à jour.",
    en: 'Game and server versions differ. Update both.',
  },
  'online.retry': { fr: 'Réessayer', en: 'Try again' },
  'online.quick': { fr: 'Partie rapide', en: 'Quick match' },
  'online.quickSub': { fr: 'Affronte le premier joueur disponible', en: 'Face the first available player' },
  'online.searching': { fr: "Recherche d'un adversaire…", en: 'Looking for an opponent…' },
  'online.create': { fr: 'Créer un salon', en: 'Create a room' },
  'online.createSub': { fr: 'Pour jouer avec un ami', en: 'To play with a friend' },
  'online.roomCode': { fr: 'Code du salon', en: 'Room code' },
  'online.roomHint': {
    fr: 'Donne ce code à ton ami. Le duel démarre dès qu\'il le saisit.',
    en: 'Give this code to your friend. The duel starts as soon as they enter it.',
  },
  'online.join': { fr: 'Rejoindre', en: 'Join' },
  'online.joinTitle': { fr: 'Rejoindre un salon', en: 'Join a room' },
  'online.roomNotFound': { fr: 'Aucun salon avec ce code.', en: 'No room with this code.' },
  'online.found': { fr: 'Adversaire trouvé !', en: 'Opponent found!' },
  'online.server': { fr: 'Serveur : {url}', en: 'Server: {url}' },
  'result.time': { fr: 'Temps', en: 'Time' },
  'result.mistakes': { fr: 'Erreurs', en: 'Mistakes' },
  'result.bestCombo': { fr: 'Meilleur combo', en: 'Best combo' },
  'result.score': { fr: 'Score', en: 'Score' },
  'result.speedBonus': { fr: 'Bonus de rapidité', en: 'Speed bonus' },
  'result.leadBonus': { fr: "Bonus d'avance", en: 'Lead bonus' },
  'result.flawless': { fr: 'Bonus sans faute', en: 'Flawless bonus' },
  'result.total': { fr: 'Total', en: 'Total' },
  'result.xp': { fr: '+{n} XP', en: '+{n} XP' },
  'result.rankUp': { fr: 'NOUVEAU RANG', en: 'RANK UP' },
  'result.unlocked': { fr: 'NOUVEAU POUVOIR', en: 'NEW POWER' },
  'result.next': { fr: 'Mission suivante', en: 'Next mission' },
  'result.retry': { fr: 'Réessayer', en: 'Try again' },
  'result.replay': { fr: 'Rejouer', en: 'Play again' },
  'result.menu': { fr: 'Menu', en: 'Menu' },
  'result.backToStory': { fr: "Retour à l'histoire", en: 'Back to story' },
  'star.finish': { fr: 'Briser le Scellé', en: 'Break the Seal' },
  'star.careful': { fr: 'Une erreur au plus', en: 'One mistake at most' },
  'star.fast': { fr: 'En moins de {time}', en: 'In under {time}' },
  'star.win': { fr: 'Gagner le duel', en: 'Win the duel' },
  'star.lead4': { fr: "4 cases d'avance", en: '4 cells ahead' },
  'star.lead8': { fr: "8 cases d'avance", en: '8 cells ahead' },

  'free.title': { fr: 'Partie libre', en: 'Free play' },
  'free.pick': { fr: 'Choisis une difficulté', en: 'Pick a difficulty' },
  'free.variant': { fr: 'Type de Scellé', en: 'Seal type' },
  'free.best': { fr: 'Record : {time}', en: 'Best: {time}' },
  'free.noBest': { fr: 'Pas encore de record', en: 'No record yet' },
  'variant.classic': { fr: 'Classique', en: 'Classic' },
  'variant.x': { fr: 'Scellé-X', en: 'X-Seal' },
  'variant.xHint': {
    fr: 'Les deux grandes diagonales doivent aussi contenir chaque chiffre une seule fois.',
    en: 'Both long diagonals must also hold each digit exactly once.',
  },
  'difficulty.easy': { fr: 'Facile', en: 'Easy' },
  'difficulty.medium': { fr: 'Moyen', en: 'Medium' },
  'difficulty.hard': { fr: 'Difficile', en: 'Hard' },
  'difficulty.expert': { fr: 'Expert', en: 'Expert' },
  'difficulty.easy.desc': { fr: 'Pour se détendre', en: 'To unwind' },
  'difficulty.medium.desc': { fr: 'Moins de chiffres au départ', en: 'Fewer starting digits' },
  'difficulty.hard.desc': { fr: 'Demande des paires et des blocs', en: 'Calls for pairs and blocks' },
  'difficulty.expert.desc': { fr: 'Techniques avancées requises', en: 'Advanced techniques required' },

  'duel.title': { fr: 'Duel', en: 'Duel' },
  'duel.pick': { fr: 'Choisis ton adversaire', en: 'Pick your opponent' },
  'duel.rules': {
    fr: 'Même Scellé pour les deux. Le premier qui le termine gagne.',
    en: 'Same Seal for both. First to finish wins.',
  },
  'duel.online': { fr: 'Duel en ligne', en: 'Online duel' },
  'duel.onlineSoon': {
    fr: 'Affronte un vrai joueur',
    en: 'Face a real player',
  },
  'duel.loadout': { fr: 'Ton équipement', en: 'Your loadout' },
  'duel.loadoutEmpty': {
    fr: "Aucun pouvoir pour l'instant : avance dans l'histoire.",
    en: 'No powers yet: play the story.',
  },
  'duel.edit': { fr: 'Modifier', en: 'Edit' },
  'duel.lockedBy': { fr: "Bats-le d'abord dans l'histoire", en: 'Beat them in the story first' },
  'duel.record': { fr: '{w} V · {l} D', en: '{w} W · {l} L' },
  'duel.tier.0': { fr: 'Entraînement', en: 'Training' },
  'duel.tier.1': { fr: 'Facile', en: 'Easy' },
  'duel.tier.2': { fr: 'Difficile', en: 'Hard' },
  'duel.tier.3': { fr: 'Boss', en: 'Boss' },

  'powers.title': { fr: 'Pouvoirs', en: 'Powers' },
  'powers.loadout': { fr: 'Équipement de duel', en: 'Duel loadout' },
  'powers.hint': {
    fr: "Touche un pouvoir pour l'équiper ou le retirer. Tu en emportes quatre en duel.",
    en: 'Tap a power to equip or remove it. You take four into a duel.',
  },
  'powers.cost': { fr: 'Coût', en: 'Cost' },
  'powers.unlockAt': { fr: 'Chap. {c}\nMission {n}', en: 'Ch. {c}\nMission {n}' },
  'powers.duelOnly': { fr: 'Duel\nseulement', en: 'Duel\nonly' },
  'powers.mode.duel': { fr: 'Duel', en: 'Duel' },
  'powers.mode.solo': { fr: 'Solo', en: 'Solo' },
  'powers.loadoutSolo': { fr: 'Équipement solo', en: 'Solo loadout' },
  'powers.hintSolo': {
    fr: "Touche un pouvoir pour l'équiper ou le retirer. Les attaques ne servent qu'en duel.",
    en: 'Tap a power to equip or remove it. Attacks only work in duels.',
  },
  'powers.equipped': { fr: 'Équipé', en: 'Equipped' },
  'powers.full': { fr: 'Équipement plein : retire un pouvoir.', en: 'Loadout full: remove a power.' },
  'powers.emptySlot': { fr: 'Libre', en: 'Empty' },
  'kind.support': { fr: 'Soutien', en: 'Support' },
  'kind.defense': { fr: 'Défense', en: 'Defense' },
  'kind.attack': { fr: 'Attaque', en: 'Attack' },

  'power.scan.name': { fr: 'Scan', en: 'Scan' },
  'power.scan.desc': {
    fr: "Révèle le chiffre de la case sélectionnée (ou d'une case au hasard).",
    en: 'Reveals the digit of the selected cell (or a random one).',
  },
  'power.analyse.name': { fr: 'Analyse', en: 'Analysis' },
  'power.analyse.desc': {
    fr: 'Écrit automatiquement toutes les notes possibles dans la grille.',
    en: 'Automatically writes every possible note across the grid.',
  },
  'power.shield.name': { fr: 'Pare-feu', en: 'Firewall' },
  'power.shield.desc': {
    fr: 'Bloque la prochaine attaque reçue. Dure 15 secondes.',
    en: 'Blocks the next incoming attack. Lasts 15 seconds.',
  },
  'power.purge.name': { fr: 'Purge', en: 'Purge' },
  'power.purge.desc': {
    fr: 'Annule tout de suite les effets que tu subis.',
    en: 'Instantly clears the effects you are suffering.',
  },
  'power.freeze.name': { fr: 'Gel', en: 'Freeze' },
  'power.freeze.desc': {
    fr: "L'adversaire ne peut plus rien poser pendant 4 secondes.",
    en: 'Your opponent cannot place anything for 4 seconds.',
  },
  'power.glitch.name': { fr: 'Brouillage', en: 'Scramble' },
  'power.glitch.desc': {
    fr: 'Brouille la grille et mélange le clavier adverse pendant 8 secondes.',
    en: "Garbles the grid and shuffles your opponent's keypad for 8 seconds.",
  },
  'power.blackout.name': { fr: 'Blackout', en: 'Blackout' },
  'power.blackout.desc': {
    fr: 'Plonge trois blocs de la grille adverse dans le noir pendant 9 secondes.',
    en: "Plunges three blocks of your opponent's grid into darkness for 9 seconds.",
  },
  'power.virus.name': { fr: 'Virus', en: 'Virus' },
  'power.virus.desc': {
    fr: "Efface deux chiffres déjà trouvés par l'adversaire.",
    en: 'Erases two digits your opponent already found.',
  },
  'power.sonar.name': { fr: 'Sonar', en: 'Sonar' },
  'power.sonar.desc': {
    fr: 'Fait briller pendant 10 secondes les cases que tu peux déduire tout de suite.',
    en: 'For 10 seconds, lights up the cells you can work out right now.',
  },
  'power.siphon.name': { fr: 'Siphon', en: 'Siphon' },
  'power.siphon.desc': {
    fr: "Vole jusqu'à 30 points de charge à l'adversaire.",
    en: 'Steals up to 30 charge from your opponent.',
  },
  'power.mirror.name': { fr: 'Miroir', en: 'Mirror' },
  'power.mirror.desc': {
    fr: "Renvoie la prochaine attaque reçue à celui qui l'a lancée. Dure 12 secondes.",
    en: 'Sends the next incoming attack back to whoever cast it. Lasts 12 seconds.',
  },
  'power.flip.name': { fr: 'Vertige', en: 'Vertigo' },
  'power.flip.desc': {
    fr: 'Retourne la grille adverse tête en bas pendant 8 secondes. Les 6 et les 9 se ressemblent beaucoup…',
    en: "Turns your opponent's grid upside down for 8 seconds. Sixes and nines look a lot alike…",
  },

  'settings.title': { fr: 'Réglages', en: 'Settings' },
  'settings.language': { fr: 'Langue', en: 'Language' },
  'settings.haptics': { fr: 'Vibrations', en: 'Haptics' },
  'settings.hapticsHint': {
    fr: 'Retour tactile sur les actions de jeu',
    en: 'Tactile feedback on game actions',
  },
  'settings.reset': { fr: 'Effacer la progression', en: 'Erase progress' },
  'settings.resetConfirm': {
    fr: 'Tout effacer ? Missions, pouvoirs et records seront perdus.',
    en: 'Erase everything? Missions, powers and records will be lost.',
  },
  'settings.resetYes': { fr: 'Tout effacer', en: 'Erase all' },
  'settings.version': { fr: 'Version {v} · prototype', en: 'Version {v} · prototype' },
  'settings.on': { fr: 'Activées', en: 'On' },
  'settings.off': { fr: 'Désactivées', en: 'Off' },
} as const satisfies Record<string, L10n>;

export type StringKey = keyof typeof STRINGS;

export type Params = Record<string, string | number>;

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function translate(lang: Lang, key: StringKey, params?: Params): string {
  return fill(STRINGS[key][lang], params);
}

export function localize(lang: Lang, text: L10n, params?: Params): string {
  return fill(text[lang], params);
}

/** 754000 ms -> « 12:34 ». */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** 12345 -> « 12 345 » (espace insécable fine). */
export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
