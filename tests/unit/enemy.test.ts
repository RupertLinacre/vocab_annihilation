import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { createEnemy, updateEnemy } from '../../src/entities/Enemy';
import { cellCenter, Grid } from '../../src/map/Grid';
import { buildFlowField } from '../../src/pathfinding/FlowField';
import { createEmptyCostGrid } from '../../src/pathfinding/ThreatMap';

describe('enemy base interaction', () => {
    it('damages the base when entering any square in the 3x3 base footprint', () => {
        const grid = new Grid(8, 5, 'grass');
        const base = { x: 6, y: 2 };
        const flowField = buildFlowField(grid, base, createEmptyCostGrid(grid));
        const topLeftBaseCell = cellCenter({ x: 5, y: 1 }, GAME_CONFIG.map);
        const enemy = createEnemy(1, 'scout', topLeftBaseCell.x, topLeftBaseCell.y);

        expect(updateEnemy(enemy, 0, flowField, grid, GAME_CONFIG.map, [enemy])).toBe(true);
    });
});