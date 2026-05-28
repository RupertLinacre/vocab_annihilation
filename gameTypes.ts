export type RawVocabDifficulty =
    | 'reception'
    | 'year1'
    | 'year2'
    | 'year3'
    | 'year4'
    | 'year5'
    | 'year6'
    | 'year6Plus'
    | 'year6PlusPlus';

export interface WordEntry {
    word: string;
    definition: string;
    example: string;
    difficulty: RawVocabDifficulty;
    synonyms: string[];
    antonyms: string[];
}