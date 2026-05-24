import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { createEnemy } from '../../src/entities/Enemy';
import { calculateTotalTowerDamagePerSecond, calculateTowerDamagePerSecond, selectTowerTarget } from '../../src/entities/Tower';
import { cellCenter, Grid } from '../../src/map/Grid';
import { buildFlowField } from '../../src/pathfinding/FlowField';
import { createEmptyCostGrid } from '../../src/pathfinding/ThreatMap';
import type { TowerState } from '../../src/types';

describe('tower target selection', () => {
    it('targets the enemy closest to the base among valid enemies', () => {
        const grid = new Grid(6, 3, 'grass');
        const base = { x: 5, y: 1 };
        const flow = buildFlowField(grid, base, createEmptyCostGrid(grid));
        const tower: TowerState = { id: 1, gridX: 1, gridY: 1, type: 'easy', level: 5, cooldownMs: 0 };
        const nearTower = createEnemy(1, 'grunt', cellCenter({ x: 2, y: 1 }, GAME_CONFIG.map).x, cellCenter({ x: 2, y: 1 }, GAME_CONFIG.map).y);
        const nearBase = createEnemy(2, 'grunt', cellCenter({ x: 4, y: 1 }, GAME_CONFIG.map).x, cellCenter({ x: 4, y: 1 }, GAME_CONFIG.map).y);
        expect(selectTowerTarget(tower, [nearTower, nearBase], grid, GAME_CONFIG.map, flow)?.id).toBe(2);
    });

    it('ignores enemies hidden behind tree-blocked line of sight', () => {
        const grid = new Grid(6, 3, 'grass');
        grid.setTerrain(3, 1, 'tree');
        const base = { x: 5, y: 1 };
        const flow = buildFlowField(grid, base, createEmptyCostGrid(grid));
        const tower: TowerState = { id: 1, gridX: 1, gridY: 1, type: 'easy', level: 5, cooldownMs: 0 };
        const visible = createEnemy(1, 'grunt', cellCenter({ x: 2, y: 1 }, GAME_CONFIG.map).x, cellCenter({ x: 2, y: 1 }, GAME_CONFIG.map).y);
        const hidden = createEnemy(2, 'grunt', cellCenter({ x: 4, y: 1 }, GAME_CONFIG.map).x, cellCenter({ x: 4, y: 1 }, GAME_CONFIG.map).y);
        expect(selectTowerTarget(tower, [visible, hidden], grid, GAME_CONFIG.map, flow)?.id).toBe(1);
    });

    it('calculates total theoretical tower damage per second from full volleys', () => {
        const easy: TowerState = { id: 1, gridX: 1, gridY: 1, type: 'easy', level: 1, cooldownMs: 0 };
        const spray: TowerState = { id: 2, gridX: 2, gridY: 1, type: 'spray', level: 1, cooldownMs: 0 };
        const cluster: TowerState = { id: 3, gridX: 3, gridY: 1, type: 'cluster', level: 1, cooldownMs: 0 };

        expect(calculateTowerDamagePerSecond(easy)).toBeCloseTo(13 / 0.66);
        expect(calculateTowerDamagePerSecond(spray)).toBeCloseTo(24 / 1);
        expect(calculateTowerDamagePerSecond(cluster)).toBeCloseTo(49 / 1.6);
        expect(calculateTotalTowerDamagePerSecond([easy, spray, cluster])).toBeCloseTo(13 / 0.66 + 24 + 49 / 1.6);
    });
});
