import type { RawVocabDifficulty, WordEntry } from '../../gameTypes';
import { SIMPLE_WIKTIONARY_DEFINITIONS } from '../../simpleWiktionaryDefinitions';
import { ALL_VOCAB } from '../../vocab';
import { SeededRandom } from '../core/SeededRandom';
import type { NormalizedVocabEntry, TowerDifficulty, VocabQuestion } from '../types';

const DIFFICULTY_ORDER: TowerDifficulty[] = ['easy', 'medium', 'hard', 'veryHard'];

export const BASE_VOCAB_DIFFICULTIES = ['reception', 'year1', 'year2', 'year3', 'year4', 'year5'] as const;

export type BaseVocabDifficulty = (typeof BASE_VOCAB_DIFFICULTIES)[number];

const RAW_DIFFICULTY_ORDER: RawVocabDifficulty[] = ['reception', 'year1', 'year2', 'year3', 'year4', 'year5', 'year6', 'year6Plus', 'year6PlusPlus'];

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
};

const TOWER_DIFFICULTY_OFFSETS: Record<TowerDifficulty, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
    veryHard: 3,
};

function clampDifficultyIndex(index: number): number {
    return Math.max(0, Math.min(index, RAW_DIFFICULTY_ORDER.length - 1));
}

export function mapTowerDifficultyToRawDifficulty(difficulty: TowerDifficulty, baseDifficulty: BaseVocabDifficulty = 'reception'): RawVocabDifficulty {
    const baseIndex = RAW_DIFFICULTY_ORDER.indexOf(baseDifficulty);
    const rawIndex = clampDifficultyIndex(baseIndex + TOWER_DIFFICULTY_OFFSETS[difficulty]);
    return RAW_DIFFICULTY_ORDER[rawIndex];
}

export function mapRawDifficultyToTowerDifficulty(
    difficulty: RawVocabDifficulty,
    baseDifficulty: BaseVocabDifficulty = 'reception',
): TowerDifficulty {
    const rawIndex = RAW_DIFFICULTY_ORDER.indexOf(difficulty);
    const baseIndex = RAW_DIFFICULTY_ORDER.indexOf(baseDifficulty);
    const relativeIndex = clampDifficultyIndex(rawIndex - baseIndex);
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
    return entries.map((entry) => ({
        word: entry.word,
        definition: SIMPLE_WIKTIONARY_DEFINITIONS[entry.word.toLowerCase()] ?? entry.definition,
        difficulty: mapRawDifficultyToTowerDifficulty(entry.difficulty, baseDifficulty),
    }));
}

function adjacentDifficulties(difficulty: TowerDifficulty): TowerDifficulty[] {
    const index = DIFFICULTY_ORDER.indexOf(difficulty);
    return DIFFICULTY_ORDER
        .map((candidate, candidateIndex) => ({ candidate, distance: Math.abs(candidateIndex - index) }))
        .sort((a, b) => a.distance - b.distance)
        .map(({ candidate }) => candidate);
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
        const pool = this.entries.filter((entry) => entry.difficulty === difficulty);
        const candidates = pool.filter((entry) => entry.word !== this.lastQuestionWord);
        const correct = this.rng.choice(candidates.length > 0 ? candidates : pool);
        const distractors = this.pickDistractors(correct, difficulty);
        const choices = this.rng.shuffle([correct.word, ...distractors.map((entry) => entry.word)]);
        this.lastQuestionWord = correct.word;
        return {
            id: `${difficulty}:${correct.word}:${Math.floor(this.rng.next() * 1000000)}`,
            difficulty,
            definition: correct.definition,
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