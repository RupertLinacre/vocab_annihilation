import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(rootDir, 'vocab_definitions');
const outputPath = path.join(rootDir, 'src', 'generated', 'vocab.ts');
const checkOnly = process.argv.includes('--check');

const REQUIRED_KEYS = ['word', 'definition', 'example', 'synonyms', 'antonyms'];
const DIFFICULTIES = [
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
const DIFFICULTY_SET = new Set(DIFFICULTIES);
const DIFFICULTY_DIRECTORIES = {
    reception: 'reception',
    year1: 'year_1',
    year2: 'year_2',
    year3: 'year_3',
    year4: 'year_4',
    year5: 'year_5',
    year6: 'year_6',
    year6Plus: 'year_6_plus',
    year6PlusPlus: 'year_6_plus_plus',
    adultLevel1: 'adult_level_1',
    adultLevel2: 'adult_level_2',
    adultLevel3: 'adult_level_3',
    adultLevel4: 'adult_level_4',
    adultLevel5: 'adult_level_5',
    rupert: 'rupert',
};
const DIRECTORY_DIFFICULTIES = Object.fromEntries(
    Object.entries(DIFFICULTY_DIRECTORIES).map(([difficulty, directory]) => [directory, difficulty]),
);

function slug(word) {
    return word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseDefinitionFile(relativePath) {
    const fileName = path.basename(relativePath);
    const match = /^(.+)\.ts$/.exec(fileName);
    if (!match) {
        throw new Error(`${relativePath}: expected a name like word.ts`);
    }

    const source = fs.readFileSync(path.join(sourceDir, relativePath), 'utf8');
    const exportMatches = source.match(/\bexport\s+default\b/g) ?? [];
    if (exportMatches.length !== 1) {
        throw new Error(`${relativePath}: expected exactly one default export`);
    }

    const expression = source.replace(/^\s*export\s+default\s*/, '').replace(/;\s*$/, '');
    const entry = vm.runInNewContext(`(${expression})`);
    for (const key of REQUIRED_KEYS) {
        if (!(key in entry)) {
            throw new Error(`${relativePath}: missing ${key}`);
        }
    }
    if ('difficulty' in entry) {
        throw new Error(`${relativePath}: source files should not declare difficulty; infer it from the folder name`);
    }
    if (match[1] !== slug(entry.word)) {
        throw new Error(`${relativePath}: slug does not match word ${entry.word}`);
    }

    const actualDirectory = path.dirname(relativePath);
    const inferredDifficulty = DIRECTORY_DIFFICULTIES[actualDirectory];
    if (!inferredDifficulty || !DIFFICULTY_SET.has(inferredDifficulty)) {
        throw new Error(`${relativePath}: unknown difficulty directory ${actualDirectory}`);
    }
    if (!String(entry.definition).trim()) {
        throw new Error(`${relativePath}: blank definition`);
    }
    if (!String(entry.example).trim()) {
        throw new Error(`${relativePath}: blank example`);
    }
    if (!Array.isArray(entry.synonyms)) {
        throw new Error(`${relativePath}: synonyms must be an array`);
    }
    if (!Array.isArray(entry.antonyms)) {
        throw new Error(`${relativePath}: antonyms must be an array`);
    }

    return {
        ...entry,
        difficulty: inferredDifficulty,
    };
}

function listDefinitionFiles(currentDir, relativeDir = '') {
    return fs.readdirSync(currentDir, { withFileTypes: true })
        .flatMap((entry) => {
            const relativePath = path.join(relativeDir, entry.name);
            const absolutePath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                return listDefinitionFiles(absolutePath, relativePath);
            }

            return entry.name.endsWith('.ts') ? [relativePath] : [];
        });
}

function fileSortKey(relativePath) {
    const directory = path.dirname(relativePath);
    const difficulty = DIRECTORY_DIFFICULTIES[directory];
    const difficultyIndex = DIFFICULTIES.indexOf(difficulty);
    if (difficultyIndex === -1) {
        throw new Error(`${relativePath}: unknown difficulty directory ${directory}`);
    }

    return [difficultyIndex, path.basename(relativePath)];
}

function formatArray(values) {
    return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;
}

function formatEntry(entry) {
    return [
        '    vocabEntry({',
        `        word: ${JSON.stringify(entry.word)},`,
        `        difficulty: ${JSON.stringify(entry.difficulty)},`,
        `        definition: ${JSON.stringify(entry.definition)},`,
        `        example: ${JSON.stringify(entry.example)},`,
        `        synonyms: ${formatArray(entry.synonyms)},`,
        `        antonyms: ${formatArray(entry.antonyms)},`,
        '    }),',
    ].join('\n');
}

const files = listDefinitionFiles(sourceDir)
    .sort((left, right) => {
        const [leftDifficultyIndex, leftFileName] = fileSortKey(left);
        const [rightDifficultyIndex, rightFileName] = fileSortKey(right);

        if (leftDifficultyIndex !== rightDifficultyIndex) {
            return leftDifficultyIndex - rightDifficultyIndex;
        }

        return leftFileName.localeCompare(rightFileName);
    });

if (files.length === 0) {
    throw new Error(`No vocabulary definition files found in ${sourceDir}`);
}

const entries = files.map((fileName) => parseDefinitionFile(fileName));
const output = `${[
    "import type { WordEntry } from '../../gameTypes';",
    '',
    '// This file is generated by scripts/build-vocab.mjs from vocab_definitions/.',
    '// Do not edit by hand.',
    'const vocabEntry = (entry: WordEntry): WordEntry => entry;',
    '',
    'export const ALL_VOCAB: WordEntry[] = [',
    entries.map(formatEntry).join('\n'),
    '];',
    '',
].join('\n')}`;

if (!checkOnly) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output);
}

console.log(`${checkOnly ? 'Checked' : 'Generated'} ${entries.length} vocabulary entries from ${files.length} files.`);
