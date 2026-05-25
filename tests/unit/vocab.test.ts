import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/core/SeededRandom';
import { canUpgradeTower, createTower, getUpgradeQuestionDifficulty, upgradeTower } from '../../src/entities/Tower';
import { mapRawDifficultyToTowerDifficulty, mapTowerDifficultyToRawDifficulty, normalizeVocab, VocabQuestionSystem } from '../../src/systems/VocabQuestionSystem';
import type { NormalizedVocabEntry } from '../../src/types';

const entries: NormalizedVocabEntry[] = [
    { word: 'vast', definition: 'very large', difficulty: 'easy' },
    { word: 'small', definition: 'not large', difficulty: 'easy' },
    { word: 'rapid', definition: 'fast', difficulty: 'medium' },
    { word: 'ancient', definition: 'very old', difficulty: 'medium' },
    { word: 'obscure', definition: 'hard to understand', difficulty: 'hard' },
    { word: 'quixotic', definition: 'wildly idealistic', difficulty: 'veryHard' },
];

describe('vocabulary questions and upgrades', () => {
    it('uses the required upgrade difficulty progression for each tower type', () => {
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 2)).toBe('easy');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 3)).toBe('easy');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 4)).toBe('medium');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 6)).toBe('hard');
        expect(getUpgradeQuestionDifficulty({ type: 'easy' }, 8)).toBe('veryHard');

        expect(getUpgradeQuestionDifficulty({ type: 'spray' }, 2)).toBe('medium');
        expect(getUpgradeQuestionDifficulty({ type: 'spray' }, 5)).toBe('hard');
        expect(getUpgradeQuestionDifficulty({ type: 'spray' }, 8)).toBe('veryHard');

        expect(getUpgradeQuestionDifficulty({ type: 'missile' }, 2)).toBe('hard');
        expect(getUpgradeQuestionDifficulty({ type: 'missile' }, 5)).toBe('veryHard');

        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 2)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 8)).toBe('veryHard');
    });

    it('allows towers to upgrade through level 8', () => {
        const tower = createTower(1, 0, 0, 'easy');

        while (canUpgradeTower(tower)) {
            expect(upgradeTower(tower)).toBe(true);
        }

        expect(tower.level).toBe(8);
        expect(canUpgradeTower(tower)).toBe(false);
        expect(upgradeTower(tower)).toBe(false);
    });

    it('generates three unique answer choices with adjacent fallback distractors', () => {
        const system = new VocabQuestionSystem(new SeededRandom(42), entries);
        const question = system.createQuestion('veryHard');
        expect(question.choices).toHaveLength(3);
        expect(new Set(question.choices).size).toBe(3);
        expect(question.choices).toContain(question.correctWord);
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
            { word: 'alpha', definition: 'first', difficulty: 'year1', synonyms: [], antonyms: [] },
            { word: 'beta', definition: 'second', difficulty: 'year2', synonyms: [], antonyms: [] },
            { word: 'gamma', definition: 'third', difficulty: 'year4', synonyms: [], antonyms: [] },
            { word: 'delta', definition: 'fourth', difficulty: 'year6PlusPlus', synonyms: [], antonyms: [] },
        ], 'year1');

        expect(normalized.map((entry) => entry.difficulty)).toEqual(['easy', 'medium', 'veryHard', 'veryHard']);
        expect(mapRawDifficultyToTowerDifficulty('reception', 'year1')).toBe('easy');
        expect(mapRawDifficultyToTowerDifficulty('year2', 'year1')).toBe('medium');
        expect(mapRawDifficultyToTowerDifficulty('year3', 'year1')).toBe('hard');
        expect(mapRawDifficultyToTowerDifficulty('year4', 'year1')).toBe('veryHard');
    });
});