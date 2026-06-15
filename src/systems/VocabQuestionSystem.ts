import type { RawVocabDifficulty, WordEntry } from '../../gameTypes';
import { ALL_VOCAB } from '../../vocab';
import { SeededRandom } from '../core/SeededRandom';
import type { NormalizedVocabEntry, TowerDifficulty, VocabQuestion } from '../types';

const DIFFICULTY_ORDER: TowerDifficulty[] = ['easy', 'medium', 'hard', 'veryHard'];

const CHILD_BASE_VOCAB_DIFFICULTIES = ['reception', 'year1', 'year2', 'year3', 'year4', 'year5'] as const;
const ADULT_BASE_VOCAB_DIFFICULTIES = [
    'adultLevel1',
    'adultLevel2',
    'adultLevel3',
    'adultLevel4',
    'adultLevel5',
] as const;
const CUSTOM_BASE_VOCAB_DIFFICULTIES = ['rupert'] as const;

export const BASE_VOCAB_DIFFICULTIES = [...CHILD_BASE_VOCAB_DIFFICULTIES, ...ADULT_BASE_VOCAB_DIFFICULTIES, ...CUSTOM_BASE_VOCAB_DIFFICULTIES] as const;

export type BaseVocabDifficulty = (typeof BASE_VOCAB_DIFFICULTIES)[number];

const RAW_DIFFICULTY_ORDER: RawVocabDifficulty[] = [
    'reception',
    'year1',
    'year2',
    'year3',
    'year4',
    'year5',
    'year6',
    'year6Plus',
    'year6PlusPlus',
    'adultLevel1',
    'adultLevel2',
    'adultLevel3',
    'adultLevel4',
    'adultLevel5',
    'rupert',
];

export const RAW_VOCAB_DIFFICULTY_LABELS: Record<RawVocabDifficulty, string> = {
    reception: 'Reception',
    year1: 'Year 1',
    year2: 'Year 2',
    year3: 'Year 3',
    year4: 'Year 4',
    year5: 'Year 5',
    year6: 'Year 6',
    year6Plus: 'Year 6+',
    year6PlusPlus: 'Year 6++',
    adultLevel1: 'Adult Level 1',
    adultLevel2: 'Adult Level 2',
    adultLevel3: 'Adult Level 3',
    adultLevel4: 'Adult Level 4',
    adultLevel5: 'Adult Level 5',
    rupert: 'Rupert',
};

export const BASE_VOCAB_DIFFICULTY_LABELS: Record<BaseVocabDifficulty, string> = {
    reception: 'Reception',
    year1: 'Year 1',
    year2: 'Year 2',
    year3: 'Year 3',
    year4: 'Year 4',
    year5: 'Year 5',
    adultLevel1: 'Adult Level 1',
    adultLevel2: 'Adult Level 2',
    adultLevel3: 'Adult Level 3',
    adultLevel4: 'Adult Level 4',
    adultLevel5: 'Adult Level 5',
    rupert: 'Rupert',
};

const TOWER_DIFFICULTY_OFFSETS: Record<TowerDifficulty, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
    veryHard: 3,
};

function isAdultVocabDifficulty(difficulty: RawVocabDifficulty): boolean {
    return difficulty.startsWith('adultLevel');
}

function vocabFamily(difficulty: RawVocabDifficulty): 'adult' | 'child' | 'custom' {
    if (isAdultVocabDifficulty(difficulty)) {
        return 'adult';
    }
    if (difficulty === 'rupert') {
        return 'custom';
    }
    return 'child';
}

export function normalizeBaseVocabDifficulty(value: string): BaseVocabDifficulty | undefined {
    if (BASE_VOCAB_DIFFICULTIES.includes(value as BaseVocabDifficulty)) {
        return value as BaseVocabDifficulty;
    }

    const match = /^adultLevel(\d+)$/.exec(value);
    if (!match) {
        return undefined;
    }

    const adultLevel = Number(match[1]);
    if (!Number.isInteger(adultLevel) || adultLevel < 1 || adultLevel > 10) {
        return undefined;
    }

    const combinedLevel = Math.ceil(adultLevel / 2);
    return `adultLevel${combinedLevel}` as BaseVocabDifficulty;
}

function difficultyRank(difficulty: RawVocabDifficulty): number {
    return RAW_DIFFICULTY_ORDER.indexOf(difficulty);
}

function clampDifficultyRank(rank: number): number {
    return Math.max(0, Math.min(rank, RAW_DIFFICULTY_ORDER.length - 1));
}

export function mapTowerDifficultyToRawDifficulty(difficulty: TowerDifficulty, baseDifficulty: BaseVocabDifficulty = 'reception'): RawVocabDifficulty {
    if (baseDifficulty === 'rupert') {
        return 'rupert';
    }

    const baseRank = difficultyRank(baseDifficulty);
    const maxDifficulty = isAdultVocabDifficulty(baseDifficulty) ? 'adultLevel5' : 'year6PlusPlus';
    const maxRank = difficultyRank(maxDifficulty);
    const rawRank = Math.min(clampDifficultyRank(baseRank + TOWER_DIFFICULTY_OFFSETS[difficulty]), maxRank);
    return RAW_DIFFICULTY_ORDER[rawRank];
}

export function mapRawDifficultyToTowerDifficulty(
    difficulty: RawVocabDifficulty,
    baseDifficulty: BaseVocabDifficulty = 'reception',
): TowerDifficulty {
    if (baseDifficulty === 'rupert') {
        return 'easy';
    }

    const rawRank = difficultyRank(difficulty);
    const baseRank = difficultyRank(baseDifficulty);
    const relativeIndex = Math.max(0, rawRank - baseRank);
    if (relativeIndex <= 0) {
        return 'easy';
    }
    if (relativeIndex === 1) {
        return 'medium';
    }
    if (relativeIndex === 2) {
        return 'hard';
    }
    return 'veryHard';
}

export function normalizeVocab(
    entries: readonly WordEntry[] = ALL_VOCAB,
    baseDifficulty: BaseVocabDifficulty = 'reception',
): NormalizedVocabEntry[] {
    const baseFamily = vocabFamily(baseDifficulty);
    return entries
        .filter((entry) => vocabFamily(entry.difficulty) === baseFamily)
        .map((entry) => ({
            word: entry.word,
            definition: entry.definition,
            example: entry.example,
            difficulty: mapRawDifficultyToTowerDifficulty(entry.difficulty, baseDifficulty),
            label: entry.difficulty === 'rupert' ? RAW_VOCAB_DIFFICULTY_LABELS[entry.difficulty] : undefined,
        }));
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createWholeWordPattern(word: string): RegExp {
    return new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
}

export function blankWordInExample(example: string, word: string): string {
    return example.replace(createWholeWordPattern(word), 'xxxx');
}

function adjacentDifficulties(difficulty: TowerDifficulty): TowerDifficulty[] {
    const index = DIFFICULTY_ORDER.indexOf(difficulty);
    return DIFFICULTY_ORDER
        .map((candidate, candidateIndex) => ({ candidate, distance: Math.abs(candidateIndex - index) }))
        .sort((a, b) => a.distance - b.distance)
        .map(({ candidate }) => candidate);
}

function availableDifficultyFor(
    entries: readonly NormalizedVocabEntry[],
    requestedDifficulty: TowerDifficulty,
): TowerDifficulty {
    const availableDifficulties = new Set(entries.map((entry) => entry.difficulty));
    const requestedIndex = DIFFICULTY_ORDER.indexOf(requestedDifficulty);
    const hardestAvailableAtOrBelowRequest = [...DIFFICULTY_ORDER]
        .reverse()
        .find((candidate) => availableDifficulties.has(candidate) && DIFFICULTY_ORDER.indexOf(candidate) <= requestedIndex);
    if (hardestAvailableAtOrBelowRequest) {
        return hardestAvailableAtOrBelowRequest;
    }
    const easiestAvailableAboveRequest = DIFFICULTY_ORDER.find((candidate) => availableDifficulties.has(candidate));
    if (easiestAvailableAboveRequest) {
        return easiestAvailableAboveRequest;
    }
    throw new Error('Cannot create a vocabulary question without any vocabulary entries');
}

export class VocabQuestionSystem {
    private entries: NormalizedVocabEntry[];
    private lastQuestionWord: string | undefined;

    constructor(
        private readonly rng: SeededRandom,
        entries: readonly NormalizedVocabEntry[] = normalizeVocab(),
    ) {
        this.entries = [...entries];
    }

    setEntries(entries: readonly NormalizedVocabEntry[]): void {
        this.entries = [...entries];
        this.lastQuestionWord = undefined;
    }

    createQuestion(difficulty: TowerDifficulty): VocabQuestion {
        const availableDifficulty = availableDifficultyFor(this.entries, difficulty);
        const pool = this.entries.filter((entry) => entry.difficulty === availableDifficulty);
        const candidates = pool.filter((entry) => entry.word !== this.lastQuestionWord);
        const correct = this.rng.choice(candidates.length > 0 ? candidates : pool);
        const distractors = this.pickDistractors(correct, availableDifficulty);
        const choices = this.rng.shuffle([correct.word, ...distractors.map((entry) => entry.word)]);
        this.lastQuestionWord = correct.word;
        return {
            id: `${availableDifficulty}:${correct.word}:${Math.floor(this.rng.next() * 1000000)}`,
            difficulty: availableDifficulty,
            label: correct.label,
            definition: correct.definition,
            example: correct.example,
            correctWord: correct.word,
            choices,
        };
    }

    private pickDistractors(correct: NormalizedVocabEntry, difficulty: TowerDifficulty): NormalizedVocabEntry[] {
        const selected: NormalizedVocabEntry[] = [];
        const selectedWords = new Set<string>([correct.word]);
        for (const candidateDifficulty of adjacentDifficulties(difficulty)) {
            const pool = this.rng.shuffle(this.entries.filter((entry) => entry.difficulty === candidateDifficulty && !selectedWords.has(entry.word)));
            for (const entry of pool) {
                selected.push(entry);
                selectedWords.add(entry.word);
                if (selected.length === 2) {
                    return selected;
                }
            }
        }
        return selected;
    }
}
