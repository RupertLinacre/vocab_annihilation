import { GAME_CONFIG } from '../config/gameConfig';
import { SeededRandom } from '../core/SeededRandom';
import { createEnemy } from '../entities/Enemy';
import { calculateTotalTowerDamagePerSecond } from '../entities/Tower';
import { cellCenter } from '../map/Grid';
import type { EnemyState, EnemyType, GridPoint, MapGeometry, TowerState } from '../types';

const INITIAL_SPAWN_DELAY_MS = 2800;
const MIN_SPAWN_INTERVAL_MS = 430;
const MAX_SPAWN_INTERVAL_MS = 5200;

export interface SpawnPressure {
    totalTowerDps: number;
    baseSpawnRatePerSecond: number;
    towerSpawnRateBonusPerSecond: number;
    spawnRatePerSecond: number;
    intervalMs: number;
    enemyPressure: number;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function calculateSpawnPressure(elapsedSeconds: number, totalTowerDps: number): SpawnPressure {
    const safeElapsedSeconds = Math.max(0, elapsedSeconds);
    const safeTowerDps = Math.max(0, totalTowerDps);
    const earlyTimeRamp = 0.42 * (1 - Math.exp(-safeElapsedSeconds / 38));
    const longTimeRamp = safeElapsedSeconds * 0.0022;
    const baseSpawnRatePerSecond = 0.22 + earlyTimeRamp + longTimeRamp;
    const towerReadiness = 1 - Math.exp(-safeElapsedSeconds / 12);
    const towerSpawnRateBonusPerSecond = towerReadiness * Math.min(1.05, safeTowerDps / (safeTowerDps + 220) * 0.76 + safeTowerDps * 0.00034);
    const spawnRatePerSecond = baseSpawnRatePerSecond + towerSpawnRateBonusPerSecond;
    const intervalMs = clamp(1000 / spawnRatePerSecond, MIN_SPAWN_INTERVAL_MS, MAX_SPAWN_INTERVAL_MS);
    const enemyPressure = safeElapsedSeconds / 60 + safeTowerDps / 120;
    return { totalTowerDps: safeTowerDps, baseSpawnRatePerSecond, towerSpawnRateBonusPerSecond, spawnRatePerSecond, intervalMs, enemyPressure };
}

export class EnemySpawner {
    private elapsedSeconds = 0;
    private spawnTimerMs = INITIAL_SPAWN_DELAY_MS;
    private nextEnemyId = 1;
    private currentTowerDps = 0;

    constructor(private readonly spawns: readonly GridPoint[], private readonly geometry: MapGeometry, private readonly rng: SeededRandom) { }

    update(deltaMs: number, towers: readonly Pick<TowerState, 'type' | 'level'>[] = []): EnemyState[] {
        this.elapsedSeconds += deltaMs / 1000;
        this.currentTowerDps = calculateTotalTowerDamagePerSecond(towers);
        this.spawnTimerMs -= deltaMs;
        const spawned: EnemyState[] = [];
        const pressure = calculateSpawnPressure(this.elapsedSeconds, this.currentTowerDps);
        while (this.spawnTimerMs <= 0) {
            this.spawnTimerMs += pressure.intervalMs * (0.78 + this.rng.next() * 0.45);
            spawned.push(this.createScaledEnemy());
        }
        return spawned;
    }

    private createScaledEnemy(): EnemyState {
        const spawn = this.rng.choice(this.spawns);
        const center = cellCenter(spawn, this.geometry);
        const type = this.chooseEnemyType();
        const towerHealthPressure = Math.min(0.24, this.currentTowerDps / (this.currentTowerDps + 480) * 0.28);
        const healthScale = 1 + this.elapsedSeconds / 180 + Math.floor(this.elapsedSeconds / 110) * 0.1 + towerHealthPressure;
        const jitter = GAME_CONFIG.map.cellSize * 0.18;
        return createEnemy(
            this.nextEnemyId++,
            type,
            center.x + (this.rng.next() - 0.5) * jitter,
            center.y + (this.rng.next() - 0.5) * jitter,
            healthScale,
        );
    }

    private chooseEnemyType(): EnemyType {
        const pressure = calculateSpawnPressure(this.elapsedSeconds, this.currentTowerDps);
        if (this.elapsedSeconds < 24) {
            return 'scout';
        }
        const scoutWeight = clamp(0.82 - pressure.enemyPressure * 0.14, 0.2, 0.82);
        const gruntWeight = clamp(0.2 + pressure.enemyPressure * 0.15, 0.18, 0.62);
        const tankWeight = this.elapsedSeconds < 55 ? 0 : clamp((pressure.enemyPressure - 0.9) * 0.16, 0, 0.48);
        if (Math.floor(this.elapsedSeconds) % 95 === 0 && this.elapsedSeconds > 55 && this.rng.chance(0.14)) {
            return 'tank';
        }
        return this.rng.weightedChoice(['scout', 'grunt', 'tank'], [scoutWeight, gruntWeight, tankWeight]);
    }
}
