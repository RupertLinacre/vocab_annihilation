import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { createProjectile } from '../../src/entities/Projectile';
import { cellCenter, Grid } from '../../src/map/Grid';
import { ProjectileSystem } from '../../src/systems/ProjectileSystem';

describe('projectile tree collisions', () => {
    it('bounces bullet projectiles off tree cells', () => {
        const grid = new Grid(5, 3, 'grass');
        grid.setTerrain(2, 1, 'tree');
        const start = cellCenter({ x: 1, y: 1 }, GAME_CONFIG.map);
        const projectile = createProjectile(1, 'bullet', start.x, start.y, 420, 0, 10, 4, 1000);

        const result = new ProjectileSystem().update(100, [projectile], [], grid, GAME_CONFIG.map);

        expect(result.projectiles).toHaveLength(1);
        expect(result.projectiles[0].vx).toBe(-420);
        expect(result.projectiles[0].x).toBeLessThan(GAME_CONFIG.map.originX + 2 * GAME_CONFIG.map.cellSize);
    });

    it('bounces cluster fragments off tree cells', () => {
        const grid = new Grid(5, 3, 'grass');
        grid.setTerrain(2, 1, 'tree');
        const start = cellCenter({ x: 1, y: 1 }, GAME_CONFIG.map);
        const projectile = createProjectile(1, 'fragment', start.x, start.y, 260, 0, 7, 3.2, 620);

        const result = new ProjectileSystem().update(170, [projectile], [], grid, GAME_CONFIG.map);

        expect(result.projectiles).toHaveLength(1);
        expect(result.projectiles[0].vx).toBe(-260);
        expect(result.projectiles[0].x).toBeLessThan(GAME_CONFIG.map.originX + 2 * GAME_CONFIG.map.cellSize);
    });

    it('keeps missiles and cluster shells blocked by tree cells', () => {
        const grid = new Grid(5, 3, 'grass');
        grid.setTerrain(2, 1, 'tree');
        const start = cellCenter({ x: 1, y: 1 }, GAME_CONFIG.map);
        const missile = createProjectile(1, 'missile', start.x, start.y, 420, 0, 10, 6, 1000);
        const clusterShell = createProjectile(2, 'cluster', start.x, start.y, 420, 0, 10, 8, 1000);

        const result = new ProjectileSystem().update(100, [missile, clusterShell], [], grid, GAME_CONFIG.map);

        expect(result.projectiles).toHaveLength(0);
    });

    it('keeps delayed missiles inactive until their launch delay has elapsed', () => {
        const grid = new Grid(5, 3, 'grass');
        const start = cellCenter({ x: 1, y: 1 }, GAME_CONFIG.map);
        const missile = createProjectile(1, 'missile', start.x, start.y, 100, 0, 10, 6, 1000);
        missile.launchDelayMs = 50;

        const waiting = new ProjectileSystem().update(30, [missile], [], grid, GAME_CONFIG.map);

        expect(waiting.projectiles).toHaveLength(1);
        expect(waiting.projectiles[0].x).toBe(start.x);
        expect(waiting.projectiles[0].lifeMs).toBe(1000);
        expect(waiting.projectiles[0].launchDelayMs).toBe(20);

        const launched = new ProjectileSystem().update(30, waiting.projectiles, [], grid, GAME_CONFIG.map);

        expect(launched.projectiles).toHaveLength(1);
        expect(launched.projectiles[0].x).toBeCloseTo(start.x + 1);
        expect(launched.projectiles[0].lifeMs).toBe(990);
        expect(launched.projectiles[0].launchDelayMs).toBe(0);
    });
});
