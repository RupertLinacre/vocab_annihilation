import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { buildFlowField } from '../../src/pathfinding/FlowField';
import { calculateTowerThreatCosts, createEmptyCostGrid } from '../../src/pathfinding/ThreatMap';
import { Grid } from '../../src/map/Grid';
import type { TowerState } from '../../src/types';

describe('threat maps and flow fields', () => {
    it('applies tower threat only through clear line of sight', () => {
        const grid = new Grid(6, 3, 'grass');
        grid.setTerrain(2, 1, 'tree');
        const tower: TowerState = { id: 1, gridX: 1, gridY: 1, type: 'easy', level: 5, cooldownMs: 0 };
        const threat = calculateTowerThreatCosts(grid, [tower], GAME_CONFIG.map);
        expect(threat[1][3]).toBe(0);
        expect(threat[0][1]).toBeGreaterThan(0);
    });

    it('builds a reverse flow field with finite costs and preferred directions', () => {
        const grid = new Grid(6, 3, 'grass');
        grid.setTerrain(2, 1, 'tarmac');
        grid.setTerrain(3, 1, 'tarmac');
        const base = { x: 5, y: 1 };
        const field = buildFlowField(grid, base, createEmptyCostGrid(grid));
        expect(field.costToBase[1][0]).toBeLessThan(Number.POSITIVE_INFINITY);
        expect(field.direction[1][0].x).toBeGreaterThan(0);
    });

    it('keeps blocked cells unreachable in the cost field', () => {
        const grid = new Grid(4, 3, 'grass');
        grid.setTerrain(1, 1, 'tree');
        const field = buildFlowField(grid, { x: 3, y: 1 }, createEmptyCostGrid(grid));
        expect(field.costToBase[1][1]).toBe(Number.POSITIVE_INFINITY);
    });
});