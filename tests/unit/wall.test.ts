import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { createEnemy } from '../../src/entities/Enemy';
import { createTower } from '../../src/entities/Tower';
import { cellCenter, Grid } from '../../src/map/Grid';
import { buildFlowField } from '../../src/pathfinding/FlowField';
import { createEmptyCostGrid } from '../../src/pathfinding/ThreatMap';
import { attackNearestWallIfPathBlocked, enemyHasPathToBase } from '../../src/systems/WallSystem';

function makeWall(id: number, x: number, y: number) {
    const wall = createTower(id, x, y, 'wall');
    wall.baseTerrain = 'grass';
    return wall;
}

describe('wall towers', () => {
    it('damage walls when an enemy has no path to the base', () => {
        const grid = new Grid(5, 3, 'grass');
        const wall = makeWall(1, 2, 1);
        grid.setTerrain(2, 0, 'tree');
        grid.setTerrain(wall.gridX, wall.gridY, 'tree');
        grid.setTerrain(2, 2, 'tree');
        const flowField = buildFlowField(grid, { x: 4, y: 1 }, createEmptyCostGrid(grid));
        const enemyPosition = cellCenter({ x: 0, y: 1 }, GAME_CONFIG.map);
        const enemy = createEnemy(1, 'grunt', enemyPosition.x, enemyPosition.y);

        expect(enemyHasPathToBase(enemy, flowField, grid, GAME_CONFIG.map)).toBe(false);
        const result = attackNearestWallIfPathBlocked(enemy, 1, [wall], flowField, grid, GAME_CONFIG.map);

        expect(result.attacked).toBe(true);
        expect(result.destroyedWall).toBeUndefined();
        expect(wall.health).toBe(GAME_CONFIG.wall.health - enemy.baseDamage);
        expect(enemy.lastMoveSpeed).toBe(0);
    });

    it('reports destroyed walls once their health reaches zero', () => {
        const grid = new Grid(5, 3, 'grass');
        const wall = makeWall(1, 2, 1);
        grid.setTerrain(2, 0, 'tree');
        grid.setTerrain(wall.gridX, wall.gridY, 'tree');
        grid.setTerrain(2, 2, 'tree');
        const flowField = buildFlowField(grid, { x: 4, y: 1 }, createEmptyCostGrid(grid));
        const enemyPosition = cellCenter({ x: 0, y: 1 }, GAME_CONFIG.map);
        const enemy = createEnemy(1, 'tank', enemyPosition.x, enemyPosition.y);

        const result = attackNearestWallIfPathBlocked(enemy, 1, [wall], flowField, grid, GAME_CONFIG.map);

        expect(result.destroyedWall).toBe(wall);
        expect(wall.health).toBe(0);
    });

    it('does not attack walls while a path to the base exists', () => {
        const grid = new Grid(5, 3, 'grass');
        const wall = makeWall(1, 2, 0);
        grid.setTerrain(wall.gridX, wall.gridY, 'tree');
        const flowField = buildFlowField(grid, { x: 4, y: 1 }, createEmptyCostGrid(grid));
        const enemyPosition = cellCenter({ x: 0, y: 1 }, GAME_CONFIG.map);
        const enemy = createEnemy(1, 'grunt', enemyPosition.x, enemyPosition.y);

        expect(enemyHasPathToBase(enemy, flowField, grid, GAME_CONFIG.map)).toBe(true);
        const result = attackNearestWallIfPathBlocked(enemy, 1, [wall], flowField, grid, GAME_CONFIG.map);

        expect(result.attacked).toBe(false);
        expect(wall.health).toBe(GAME_CONFIG.wall.health);
    });
});
