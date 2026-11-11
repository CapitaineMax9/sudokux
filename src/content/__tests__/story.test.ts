import { BOTS, BOT_ORDER } from '../bots';
import { CHARACTERS } from '../characters';
import { ALL_LEVELS, CHAPTERS, getLevel, nextLevelId, unlockMissionOf } from '../story';
import { POWERS, POWER_ORDER, isAttack } from '../../engine/powers';
import { countSolutions, generatePuzzle, DIFFICULTY_SPECS } from '../../engine/sudoku';

describe("contenu de l'histoire", () => {
  it('donne un identifiant unique à chaque mission, numérotée dans l’ordre', () => {
    expect(new Set(ALL_LEVELS.map((level) => level.id)).size).toBe(ALL_LEVELS.length);
    for (const chapter of CHAPTERS) {
      chapter.levels.forEach((level, index) => {
        expect(level.number).toBe(index + 1);
        expect(level.id).toBe(`${chapter.id}m${index + 1}`);
        expect(getLevel(level.id)).toBe(level);
      });
    }
    expect(nextLevelId('c1m8')).toBe('c2m1');
    expect(nextLevelId('c2m8')).toBeNull();
  });

  it.each(ALL_LEVELS.map((level) => [level.id, level] as const))(
    'génère une grille valide pour %s',
    (_id, level) => {
      const puzzle = generatePuzzle({ seed: level.seed, ...level.puzzle });
      expect(countSolutions(puzzle.puzzle, level.puzzle.variant, 2)).toBe(1);
      expect(puzzle.level).toBe(DIFFICULTY_SPECS[level.puzzle.difficulty].level);
    },
  );

  it('écrit chaque texte dans les deux langues', () => {
    for (const level of ALL_LEVELS) {
      for (const text of [level.title, level.brief]) {
        expect(text.fr.trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
      expect(level.intro.length).toBeGreaterThan(0);
      expect(level.outro.length).toBeGreaterThan(0);
      for (const line of [...level.intro, ...level.outro]) {
        expect(CHARACTERS[line.who]).toBeDefined();
        expect(line.text.fr.trim()).not.toBe('');
        expect(line.text.en.trim()).not.toBe('');
      }
    }
  });

  it('relie chaque duel à un adversaire existant', () => {
    for (const level of ALL_LEVELS) {
      if (level.kind === 'solo') {
        expect(level.botId).toBeNull();
      } else {
        const bot = BOTS[level.botId as string];
        expect(bot).toBeDefined();
        expect(level.puzzle).toEqual(bot.puzzle);
        expect(level.maxMistakes).toBeNull();
      }
    }
  });

  it('débloque chaque pouvoir une seule fois, avant qu’une mission en ait besoin', () => {
    const rewards = ALL_LEVELS.map((level) => level.reward).filter((reward) => reward !== null);
    expect(new Set(rewards).size).toBe(rewards.length);
    expect([...rewards].sort()).toEqual([...POWER_ORDER].sort());
    for (const power of POWER_ORDER) expect(unlockMissionOf(power)).not.toBeNull();
    // Le tout premier duel arrive après le déblocage d'au moins une attaque.
    const firstDuel = ALL_LEVELS.findIndex((level) => level.kind !== 'solo');
    const before = ALL_LEVELS.slice(0, firstDuel).map((level) => level.reward);
    expect(before.some((power) => power !== null && isAttack(power))).toBe(true);
  });

  it('ne donne aux bots que des pouvoirs connus', () => {
    for (const bot of Object.values(BOTS)) {
      for (const power of bot.config.powers) expect(POWERS[power]).toBeDefined();
      expect(CHARACTERS[bot.character]).toBeDefined();
      for (const lines of Object.values(bot.taunts)) {
        for (const line of lines) {
          expect(line.fr.trim()).not.toBe('');
          expect(line.en.trim()).not.toBe('');
        }
      }
    }
    for (const id of BOT_ORDER) expect(BOTS[id]).toBeDefined();
  });
});
