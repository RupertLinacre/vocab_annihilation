import type { EnemyType, TerrainType, TowerDifficulty, TowerType } from '../types';

export const GAME_CONFIG = {
    canvasWidth: 1280,
    canvasHeight: 800,
    map: {
        cols: 24,
        rows: 14,
        cellSize: 42,
        originX: 136,
        originY: 18,
    },
    baseHealth: 100,
    terrainCosts: {
        grass: 1.15,
        tarmac: 0.72,
        tree: Number.POSITIVE_INFINITY,
    } satisfies Record<TerrainType, number>,
    terrainSpeedMultiplier: {
        grass: 0.92,
        tarmac: 1.22,
        tree: 0,
    } satisfies Record<TerrainType, number>,
    threatWeight: 5.2,
    maxTowerThreatCost: 18,
    enemyStuck: {
        meaningfulProgressPixels: 8,
        stuckAfterSeconds: 2.5,
        panicSeconds: 3.25,
    },
    mapGenerationAttempts: 50,
    uiPanelHeight: 188,
};
export const TOWER_DIFFICULTY_TO_TYPE: Record<TowerDifficulty, TowerType> = {
    easy: 'easy',
    medium: 'spray',
    hard: 'missile',
    veryHard: 'cluster',
};

export const TOWER_LABELS: Record<TowerType, string> = {
    easy: 'Easy Bullet Tower',
    spray: 'Medium Spray Tower',
    missile: 'Hard Missile Tower',
    cluster: 'Very Hard Cluster Tower',
};

export const DIFFICULTY_LABELS: Record<TowerDifficulty, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    veryHard: 'Very Hard',
};

export interface TowerLevelStats {
    range: number;
    cooldownMs: number;
    damage: number;
    bulletSpeed?: number;
    pelletCount?: number;
    spreadRadians?: number;
    missileCount?: number;
    missileSpeed?: number;
    missileTurnRate?: number;
    explosionRadius?: number;
    fragmentCount?: number;
    fragmentDamage?: number;
    threat: number;
}

export const TOWER_STATS: Record<TowerType, TowerLevelStats[]> = {
    easy: [
        { range: 150, cooldownMs: 660, damage: 13, bulletSpeed: 420, threat: 3.6 },
        { range: 168, cooldownMs: 540, damage: 15, bulletSpeed: 430, threat: 4.4 },
        { range: 186, cooldownMs: 440, damage: 17, bulletSpeed: 440, threat: 5.2 },
        { range: 205, cooldownMs: 360, damage: 20, bulletSpeed: 450, threat: 6.1 },
        { range: 225, cooldownMs: 290, damage: 24, bulletSpeed: 465, threat: 7.1 },
    ],
    spray: [
        { range: 138, cooldownMs: 980, damage: 7, bulletSpeed: 390, pelletCount: 3, spreadRadians: 0.42, threat: 4.0 },
        { range: 158, cooldownMs: 910, damage: 8, bulletSpeed: 400, pelletCount: 4, spreadRadians: 0.48, threat: 4.8 },
        { range: 178, cooldownMs: 830, damage: 9, bulletSpeed: 410, pelletCount: 5, spreadRadians: 0.54, threat: 5.8 },
        { range: 198, cooldownMs: 760, damage: 10, bulletSpeed: 425, pelletCount: 6, spreadRadians: 0.6, threat: 6.7 },
        { range: 220, cooldownMs: 680, damage: 12, bulletSpeed: 440, pelletCount: 7, spreadRadians: 0.66, threat: 7.8 },
    ],
    missile: [
        { range: 180, cooldownMs: 1320, damage: 25, missileCount: 1, missileSpeed: 165, missileTurnRate: 2.0, threat: 5.0 },
        { range: 202, cooldownMs: 1210, damage: 31, missileCount: 1, missileSpeed: 185, missileTurnRate: 2.25, threat: 6.2 },
        { range: 226, cooldownMs: 1110, damage: 36, missileCount: 2, missileSpeed: 205, missileTurnRate: 2.55, threat: 7.5 },
        { range: 252, cooldownMs: 1010, damage: 43, missileCount: 2, missileSpeed: 230, missileTurnRate: 2.85, threat: 9.0 },
        { range: 282, cooldownMs: 920, damage: 50, missileCount: 3, missileSpeed: 255, missileTurnRate: 3.15, threat: 10.7 },
    ],
    cluster: [
        { range: 170, cooldownMs: 1920, damage: 19, bulletSpeed: 260, explosionRadius: 54, fragmentCount: 5, fragmentDamage: 6, threat: 5.6 },
        { range: 195, cooldownMs: 1780, damage: 24, bulletSpeed: 275, explosionRadius: 64, fragmentCount: 6, fragmentDamage: 8, threat: 7.0 },
        { range: 220, cooldownMs: 1640, damage: 29, bulletSpeed: 292, explosionRadius: 74, fragmentCount: 8, fragmentDamage: 9, threat: 8.6 },
        { range: 246, cooldownMs: 1500, damage: 35, bulletSpeed: 310, explosionRadius: 86, fragmentCount: 9, fragmentDamage: 11, threat: 10.4 },
        { range: 274, cooldownMs: 1360, damage: 42, bulletSpeed: 330, explosionRadius: 98, fragmentCount: 12, fragmentDamage: 13, threat: 12.5 },
    ],
};

export interface EnemyStats {
    health: number;
    speed: number;
    radius: number;
    baseDamage: number;
}

export const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
    scout: { health: 34, speed: 88, radius: 10, baseDamage: 2 },
    grunt: { health: 72, speed: 61, radius: 13, baseDamage: 5 },
    tank: { health: 180, speed: 38, radius: 17, baseDamage: 12 },
};

export const ENEMY_COLORS: Record<EnemyType, number> = {
    scout: 0xffd166,
    grunt: 0xef476f,
    tank: 0x8ecae6,
};

export const TOWER_COLORS: Record<TowerType, number> = {
    easy: 0x2ec4b6,
    spray: 0xff9f1c,
    missile: 0xbde0fe,
    cluster: 0xf15bb5,
};