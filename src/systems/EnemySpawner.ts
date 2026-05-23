import { GAME_CONFIG } from '../config/gameConfig';
import { SeededRandom } from '../core/SeededRandom';
import { createEnemy } from '../entities/Enemy';
import { cellCenter } from '../map/Grid';
import type { EnemyState, EnemyType, GridPoint, MapGeometry } from '../types';

export class EnemySpawner {
    private elapsedSeconds = 0;
    private spawnTimerMs = 0;
    private nextEnemyId = 1;

    constructor(private readonly spawns: readonly GridPoint[], private readonly geometry: MapGeometry, private readonly rng: SeededRandom) { }

    update(deltaMs: number): EnemyState[] {
        this.elapsedSeconds += deltaMs / 1000;
        this.spawnTimerMs -= deltaMs;
        const spawned: EnemyState[] = [];
        const interval = Math.max(390, 1450 - this.elapsedSeconds * 14);
        while (this.spawnTimerMs <= 0) {
            this.spawnTimerMs += interval * (0.78 + this.rng.next() * 0.45);
            spawned.push(this.createScaledEnemy());
        }
        return spawned;
    }

    private createScaledEnemy(): EnemyState {
        const spawn = this.rng.choice(this.spawns);
        const center = cellCenter(spawn, this.geometry);
        const type = this.chooseEnemyType();
        const healthScale = 1 + this.elapsedSeconds / 120 + Math.floor(this.elapsedSeconds / 90) * 0.12;
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
        const minute = this.elapsedSeconds / 60;
        const scoutWeight = Math.max(0.18, 0.62 - minute * 0.1);
        const gruntWeight = 0.32 + Math.min(0.24, minute * 0.06);
        const tankWeight = Math.min(0.48, Math.max(0.04, minute * 0.12));
        if (Math.floor(this.elapsedSeconds) % 95 === 0 && this.elapsedSeconds > 45 && this.rng.chance(0.16)) {
            return 'tank';
        }
        return this.rng.weightedChoice(['scout', 'grunt', 'tank'], [scoutWeight, gruntWeight, tankWeight]);
    }
}