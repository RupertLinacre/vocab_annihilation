import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { createEnemy } from '../../src/entities/Enemy';
import { selectTowerTarget } from '../../src/entities/Tower';
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
});