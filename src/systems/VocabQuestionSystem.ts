import type { RawVocabDifficulty, WordEntry } from '../../gameTypes';
import { ALL_VOCAB } from '../../vocab';
import { SeededRandom } from '../core/SeededRandom';
import type { NormalizedVocabEntry, TowerDifficulty, VocabQuestion } from '../types';

const DIFFICULTY_ORDER: TowerDifficulty[] = ['easy', 'medium', 'hard', 'veryHard'];

export function mapRawDifficultyToTowerDifficulty(difficulty: RawVocabDifficulty): TowerDifficulty {
    if (difficulty === 'reception' || difficulty === 'year1' || difficulty === 'year2') {
        return 'easy';
    }
    if (difficulty === 'year3' || difficulty === 'year4') {
        return 'medium';
    }
    if (difficulty === 'year5' || difficulty === 'year6') {
        return 'hard';
    }
    return 'veryHard';
}

export function normalizeVocab(entries: readonly WordEntry[] = ALL_VOCAB): NormalizedVocabEntry[] {
    return entries.map((entry) => ({
        word: entry.word,
        definition: entry.definition,
        difficulty: mapRawDifficultyToTowerDifficulty(entry.difficulty),
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
    private readonly entries: NormalizedVocabEntry[];
    private lastQuestionWord: string | undefined;

    constructor(private readonly rng: SeededRandom, entries: readonly NormalizedVocabEntry[] = normalizeVocab()) {
        this.entries = [...entries];
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