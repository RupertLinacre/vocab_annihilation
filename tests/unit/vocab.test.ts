import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/core/SeededRandom';
import { canUpgradeTower, createTower, getMaxTowerLevel, getUpgradeQuestionDifficulty, upgradeTower } from '../../src/entities/Tower';
import { blankWordInExample, mapRawDifficultyToTowerDifficulty, mapTowerDifficultyToRawDifficulty, normalizeBaseVocabDifficulty, normalizeVocab, VocabQuestionSystem } from '../../src/systems/VocabQuestionSystem';
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

        expect(getUpgradeQuestionDifficulty({ type: 'flamethrower' }, 2)).toBe('hard');
        expect(getUpgradeQuestionDifficulty({ type: 'flamethrower' }, 5)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'flamethrower' }, 16)).toBe('veryHard');

        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 2)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 8)).toBe('veryHard');
        expect(getUpgradeQuestionDifficulty({ type: 'cluster' }, 16)).toBe('veryHard');
    });

    it('allows combat towers to upgrade through level 16', () => {
        const combatTowerTypes = ['easy', 'spray', 'missile', 'flamethrower', 'cluster'] as const;

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

        expect(mapTowerDifficultyToRawDifficulty('easy', 'adultLevel1')).toBe('adultLevel1');
        expect(mapTowerDifficultyToRawDifficulty('medium', 'adultLevel1')).toBe('adultLevel2');
        expect(mapTowerDifficultyToRawDifficulty('hard', 'adultLevel1')).toBe('adultLevel3');
        expect(mapTowerDifficultyToRawDifficulty('veryHard', 'adultLevel1')).toBe('adultLevel4');
        expect(mapTowerDifficultyToRawDifficulty('veryHard', 'adultLevel4')).toBe('adultLevel5');
        expect(mapTowerDifficultyToRawDifficulty('veryHard', 'adultLevel5')).toBe('adultLevel5');

        expect(mapTowerDifficultyToRawDifficulty('easy', 'rupert')).toBe('rupert');
        expect(mapTowerDifficultyToRawDifficulty('medium', 'rupert')).toBe('rupert');
        expect(mapTowerDifficultyToRawDifficulty('hard', 'rupert')).toBe('rupert');
        expect(mapTowerDifficultyToRawDifficulty('veryHard', 'rupert')).toBe('rupert');
    });

    it('normalizes old adult base levels into five combined adult levels', () => {
        expect(normalizeBaseVocabDifficulty('adultLevel1')).toBe('adultLevel1');
        expect(normalizeBaseVocabDifficulty('adultLevel2')).toBe('adultLevel2');
        expect(normalizeBaseVocabDifficulty('adultLevel3')).toBe('adultLevel3');
        expect(normalizeBaseVocabDifficulty('adultLevel6')).toBe('adultLevel3');
        expect(normalizeBaseVocabDifficulty('adultLevel9')).toBe('adultLevel5');
        expect(normalizeBaseVocabDifficulty('adultLevel10')).toBe('adultLevel5');
        expect(normalizeBaseVocabDifficulty('rupert')).toBe('rupert');
        expect(normalizeBaseVocabDifficulty('year3')).toBe('year3');
        expect(normalizeBaseVocabDifficulty('not-real')).toBeUndefined();
    });

    it('normalizes raw vocab against the chosen base difficulty', () => {
        const normalized = normalizeVocab([
            { word: 'alpha', definition: 'first', example: 'The alpha team lined up first.', difficulty: 'year1', synonyms: [], antonyms: [] },
            { word: 'beta', definition: 'second', example: 'The beta card came next.', difficulty: 'year2', synonyms: [], antonyms: [] },
            { word: 'gamma', definition: 'third', example: 'The gamma label was on the third box.', difficulty: 'year4', synonyms: [], antonyms: [] },
            { word: 'delta', definition: 'fourth', example: 'The delta kite flew over the field.', difficulty: 'year6PlusPlus', synonyms: [], antonyms: [] },
            { word: 'epsilon', definition: 'fifth', example: 'The epsilon note came last.', difficulty: 'adultLevel1', synonyms: [], antonyms: [] },
        ], 'year1');

        expect(normalized.map((entry) => entry.difficulty)).toEqual(['easy', 'medium', 'veryHard', 'veryHard']);
        expect(normalized[0].example).toBe('The alpha team lined up first.');
        expect(mapRawDifficultyToTowerDifficulty('reception', 'year1')).toBe('easy');
        expect(mapRawDifficultyToTowerDifficulty('year2', 'year1')).toBe('medium');
        expect(mapRawDifficultyToTowerDifficulty('year3', 'year1')).toBe('hard');
        expect(mapRawDifficultyToTowerDifficulty('year4', 'year1')).toBe('veryHard');

        const adultNormalized = normalizeVocab([
            { word: 'alpha', definition: 'first', example: 'The alpha team lined up first.', difficulty: 'year1', synonyms: [], antonyms: [] },
            { word: 'paraphrase', definition: 'restate an idea', example: 'Please paraphrase the memo in plain terms.', difficulty: 'adultLevel1', synonyms: [], antonyms: [] },
            { word: 'ostensible', definition: 'appearing to be true', example: 'The ostensible reason hid the real motive.', difficulty: 'adultLevel2', synonyms: [], antonyms: [] },
            { word: 'cogent', definition: 'clear and convincing', example: 'The cogent report changed the vote.', difficulty: 'adultLevel3', synonyms: [], antonyms: [] },
        ], 'adultLevel1');

        expect(adultNormalized.map((entry) => entry.word)).toEqual(['paraphrase', 'ostensible', 'cogent']);
        expect(adultNormalized.map((entry) => entry.difficulty)).toEqual(['easy', 'medium', 'hard']);
        expect(mapRawDifficultyToTowerDifficulty('adultLevel2', 'adultLevel1')).toBe('medium');
        expect(mapRawDifficultyToTowerDifficulty('adultLevel4', 'adultLevel3')).toBe('medium');
        expect(mapRawDifficultyToTowerDifficulty('adultLevel5', 'adultLevel3')).toBe('hard');

        const rupertNormalized = normalizeVocab([
            { word: 'alpha', definition: 'first', example: 'The alpha team lined up first.', difficulty: 'year1', synonyms: [], antonyms: [] },
            { word: 'regal', definition: 'royal', example: 'The regal robe was purple.', difficulty: 'rupert', synonyms: [], antonyms: [] },
            { word: 'morose', definition: 'gloomy', example: 'The morose child sighed.', difficulty: 'rupert', synonyms: [], antonyms: [] },
            { word: 'paraphrase', definition: 'restate an idea', example: 'Please paraphrase the memo in plain terms.', difficulty: 'adultLevel1', synonyms: [], antonyms: [] },
        ], 'rupert');

        expect(rupertNormalized.map((entry) => entry.word)).toEqual(['regal', 'morose']);
        expect(rupertNormalized.map((entry) => entry.difficulty)).toEqual(['easy', 'easy']);
        expect(mapRawDifficultyToTowerDifficulty('rupert', 'rupert')).toBe('easy');
    });

    it('uses the hardest available question when the requested tower difficulty has no entries', () => {
        const adultHardestBaseEntries = normalizeVocab([
            { word: 'diffident', definition: 'shy or lacking confidence', example: 'The diffident speaker spoke softly.', difficulty: 'adultLevel5', synonyms: [], antonyms: [] },
            { word: 'specious', definition: 'seeming true but actually false', example: 'The specious excuse fooled nobody.', difficulty: 'adultLevel5', synonyms: [], antonyms: [] },
        ], 'adultLevel5');
        const system = new VocabQuestionSystem(new SeededRandom(12), adultHardestBaseEntries);
        const question = system.createQuestion('veryHard');

        expect(question.difficulty).toBe('easy');
        expect(['diffident', 'specious']).toContain(question.correctWord);
    });

    it('can answer very hard tower questions from a legacy hardest adult base difficulty', () => {
        const legacyBaseDifficulty = normalizeBaseVocabDifficulty('adultLevel9');
        expect(legacyBaseDifficulty).toBe('adultLevel5');
        const adultHardestBaseEntries = normalizeVocab([
            { word: 'diffident', definition: 'shy or lacking confidence', example: 'The diffident speaker spoke softly.', difficulty: 'adultLevel5', synonyms: [], antonyms: [] },
            { word: 'specious', definition: 'seeming true but actually false', example: 'The specious excuse fooled nobody.', difficulty: 'adultLevel5', synonyms: [], antonyms: [] },
            { word: 'probity', definition: 'honesty and strong morals', example: 'Her probity reassured the panel.', difficulty: 'adultLevel5', synonyms: [], antonyms: [] },
        ], legacyBaseDifficulty!);
        const system = new VocabQuestionSystem(new SeededRandom(13), adultHardestBaseEntries);
        const question = system.createQuestion('veryHard');

        expect(question.difficulty).toBe('easy');
        expect(question.choices).toContain(question.correctWord);
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

    it('loads Rupert words from the generated vocabulary source', () => {
        const rupertEntries = normalizeVocab(undefined, 'rupert');
        const rupertWords = rupertEntries.map((entry) => entry.word);

        expect(rupertWords).toEqual([
            'abruptly',
            'acquaintances',
            'amplify',
            'antidote',
            'assiduous',
            'behemoth',
            'betrayal',
            'bionic',
            'callow',
            'charisma',
            'comeuppance',
            'concoction',
            'conundrum',
            'despondency',
            'disquiet',
            'enlightened',
            'entranced',
            'flagitious',
            'hostile',
            'irresponsible',
            'ivory',
            'juvenile',
            'linger',
            'morose',
            'obsidian',
            'precariously',
            'prophecy',
            'protagonist',
            'ramshackle',
            'regal',
            'serenade',
            'sinister',
            'subterfuge',
            'tenacity',
            'unlimited',
            'unspeakable',
        ]);
        expect(new Set(rupertEntries.map((entry) => entry.label))).toEqual(new Set(['Rupert']));

        const system = new VocabQuestionSystem(new SeededRandom(21), rupertEntries);
        expect(system.createQuestion('veryHard').label).toBe('Rupert');
    });
});
