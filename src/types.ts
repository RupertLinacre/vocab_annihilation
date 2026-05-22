export type TerrainType = 'tree' | 'grass' | 'tarmac';

export type TowerDifficulty = 'easy' | 'medium' | 'hard' | 'veryHard';

export type TowerType = 'easy' | 'spray' | 'missile' | 'cluster';

export type EnemyType = 'scout' | 'grunt' | 'tank';

export type ProjectileType = 'bullet' | 'missile' | 'cluster' | 'fragment';

export interface GridPoint {
    x: number;
    y: number;
}

export interface Vec2 {
    x: number;
    y: number;
}

export interface MapGeometry {
    originX: number;
    originY: number;
    cellSize: number;
}

export interface TowerState {
    id: number;
    gridX: number;
    gridY: number;
    type: TowerType;
    level: number;
    cooldownMs: number;
}

export interface EnemyState {
    id: number;
    type: EnemyType;
    x: number;
    y: number;
    vx: number;
    vy: number;
    health: number;
    maxHealth: number;
    speed: number;
    radius: number;
    baseDamage: number;
}

export interface ProjectileState {
    id: number;
    type: ProjectileType;
    x: number;
    y: number;
    previousX: number;
    previousY: number;
    vx: number;
    vy: number;
    damage: number;
    radius: number;
    lifeMs: number;
    targetId?: number;
    turnRate?: number;
    speed?: number;
    explosionRadius?: number;
    fragmentCount?: number;
    fragmentDamage?: number;
}

export interface NormalizedVocabEntry {
    word: string;
    definition: string;
    difficulty: TowerDifficulty;
}

export interface VocabQuestion {
    id: string;
    difficulty: TowerDifficulty;
    definition: string;
    correctWord: string;
    choices: string[];
}