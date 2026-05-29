import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/core/SeededRandom';
import { canUpgradeTower, createTower, getMaxTowerLevel, getUpgradeQuestionDifficulty, upgradeTower } from '../../src/entities/Tower';
import { blankWordInExample, mapRawDifficultyToTowerDifficulty, mapTowerDifficultyToRawDifficulty, normalizeVocab, VocabQuestionSystem } from '../../src/systems/VocabQuestionSystem';
import type { NormalizedVocabEntry } from '../../src/types';

const entries: NormalizedVocabEntry[] = [
    { word: 'vast', definition: 'very large', example: 'The hall was vast enough for every class.', difficulty: 'easy' },
    { word: 'small', definition: 'not large', example: 'The small cup fit in my hand.', difficulty: 'easy' },
    { word: 'rapid', definition: 'fast', example: 'The river was rapid after the rain.', difficulty: 'medium' },
    { word: 'ancient', definition: 'very old', example: 'We saw an ancient coin in the museum.', difficulty: 'medium' },
    { word: 'obscure', definition: 'hard to understand', example: 'The obscure clue made us think carefully.', difficulty: 'hard' },
    { word: 'quixotic', definition: 'wildly idealistic', example: 'Her quixotic plan was kind but unlikely.', difficulty: 'veryHard' },
];

describe('vocabulary questions and upgrades', () => {
    it('uses the required upgrade difficulty progression for each tower type', () => {
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 2)).toBe('easy');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 3)).toBe('easy');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 4)).toBe('medium');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 6)).toBe('hard');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 8)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 16)).toBe('veryHard');

        expect(getUpgradeQuestionDifficulty({ type: 'spray' }, 2)).toBe('medium');
        expect(getUpgradeQuestionDifficulty({ type: 'spray' }, 5)).toBe('hard');
        expect(getUpgradeQuestionDifficulty({ type: 'spray' }, 8)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'spray' }, 16)).toBe('veryHard');

        expect(getUpgradeQuestionDifficulty({ type: 'missile' }, 2)).toBe('hard');
        expect(getUpgradeQuestionDifficulty({ type: 'missile' }, 5)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'missile' }, 16)).toBe('veryHard');

        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 2)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 8)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 16)).toBe('veryHard');
    });

    it('allows combat towers to upgrade through level 16', () => {
        const combatTowerTypes = ['easy', 'spray', 'missile', 'cluster'] as const;

        for (const towerType of combatTowerTypes) {
            const tower = createTower(1, 0, 0, towerType);

            while (canUpgradeTower(tower)) {
                expect(upgradeTower(tower)).toBe(true);
            }

            expect(getMaxTowerLevel(towerType)).toBe(16);
            expect(tower.level).toBe(16);
            expect(canUpgradeTower(tower)).toBe(false);
            expect(upgradeTower(tower)).toBe(false);
        }
    });

    it('generates three unique answer choices with adjacent fallback distractors', () => {
        const system = new VocabQuestionSystem(new SeededRandom(42), entries);
        const question = system.createQuestion('veryHard');
        expect(question.choices).toHaveLength(3);
        expect(new Set(question.choices).size).toBe(3);
        expect(question.choices).toContain(question.correctWord);
        expect(question.example).toContain(question.correctWord);
    });

    it('avoids immediately repeating a question when alternatives exist', () => {
        const system = new VocabQuestionSystem(new SeededRandom(7), entries);
        const first = system.createQuestion('easy');
        const second = system.createQuestion('easy');
        expect(second.correctWord).not.toBe(first.correctWord);
    });

    it('can shift tower vocab bands from the selected base difficulty', () => {
        expect(mapTowerDifficultyToRawDifficulty('easy', 'reception')).toBe('reception');
        expect(mapTowerDifficultyToRawDifficulty('medium', 'reception')).toBe('year1');
        expect(mapTowerDifficultyToRawDifficulty('hard', 'reception')).toBe('year2');
        expect(mapTowerDifficultyToRawDifficulty('veryHard', 'reception')).toBe('year3');

        expect(mapTowerDifficultyToRawDifficulty('easy', 'year1')).toBe('year1');
        expect(mapTowerDifficultyToRawDifficulty('medium', 'year1')).toBe('year2');
        expect(mapTowerDifficultyToRawDifficulty('hard', 'year1')).toBe('year3');
        expect(mapTowerDifficultyToRawDifficulty('veryHard', 'year1')).toBe('year4');
    });

    it('normalizes raw vocab against the chosen base difficulty', () => {
        const normalized = normalizeVocab([
            { word: 'alpha', definition: 'first', example: 'The alpha team lined up first.', difficulty: 'year1', synonyms: [], antonyms: [] },
            { word: 'beta', definition: 'second', example: 'The beta card came next.', difficulty: 'year2', synonyms: [], antonyms: [] },
            { word: 'gamma', definition: 'third', example: 'The gamma label was on the third box.', difficulty: 'year4', synonyms: [], antonyms: [] },
            { word: 'delta', definition: 'fourth', example: 'The delta kite flew over the field.', difficulty: 'year6PlusPlus', synonyms: [], antonyms: [] },
        ], 'year1');

        expect(normalized.map((entry) => entry.difficulty)).toEqual(['easy', 'medium', 'veryHard', 'veryHard']);
        expect(normalized[0].example).toBe('The alpha team lined up first.');
        expect(mapRawDifficultyToTowerDifficulty('reception', 'year1')).toBe('easy');
        expect(mapRawDifficultyToTowerDifficulty('year2', 'year1')).toBe('medium');
        expect(mapRawDifficultyToTowerDifficulty('year3', 'year1')).toBe('hard');
        expect(mapRawDifficultyToTowerDifficulty('year4', 'year1')).toBe('veryHard');
    });

    it('uses source definitions and masks whole-word examples', () => {
        const normalized = normalizeVocab([
            { word: 'after', definition: 'custom after definition', example: 'We played after lunch.', difficulty: 'reception', synonyms: [], antonyms: [] },
            { word: 'slither', definition: 'custom slither definition', example: 'The snail will slither along the path.', difficulty: 'year3', synonyms: [], antonyms: [] },
        ]);

        expect(normalized[0].definition).toBe('custom after definition');
        expect(normalized[0].example).toBe('We played after lunch.');
        expect(normalized[1].definition).toBe('custom slither definition');
        expect(normalized[1].example).toBe('The snail will slither along the path.');
        expect(blankWordInExample('The goodness chart was good.', 'good')).toBe('The goodness chart was xxxx.');
    });
});