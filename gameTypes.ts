export type RawVocabDifficulty =
    | 'reception'
    | 'year1'
    | 'year2'
    | 'year3'
    | 'year4'
    | 'year5'
    | 'year6'
    | 'year6Plus'
    | 'year6PlusPlus'
    | 'adultLevel1'
    | 'adultLevel2'
    | 'adultLevel3'
    | 'adultLevel4'
    | 'adultLevel5'
    | 'adultLevel6'
    | 'adultLevel7'
    | 'adultLevel8'
    | 'adultLevel9'
    | 'adultLevel10';

export interface WordEntry {
    word: string;
    definition: string;
    example: string;
    difficulty: RawVocabDifficulty;
    synonyms: string[];
    antonyms: string[];
}