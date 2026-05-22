import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/core/SeededRandom';
import { getUpgradeQuestionDifficulty } from '../../src/entities/Tower';
import { VocabQuestionSystem } from '../../src/systems/VocabQuestionSystem';
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
    it('uses the required upgrade difficulty progression', () => {
        expect(getUpgradeQuestionDifficulty(2)).toBe('easy');
        expect(getUpgradeQuestionDifficulty(3)).toBe('medium');
        expect(getUpgradeQuestionDifficulty(4)).toBe('hard');
        expect(getUpgradeQuestionDifficulty(5)).toBe('veryHard');
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
});