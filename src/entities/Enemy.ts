import { ENEMY_STATS, GAME_CONFIG } from '../config/gameConfig';
import type { EnemyState, EnemyType, MapGeometry } from '../types';
import type { FlowField } from '../pathfinding/FlowField';
import { sampleFlowDirection } from '../pathfinding/FlowField';
import { cellCenter, Grid, worldToGrid } from '../map/Grid';

export function createEnemy(id: number, type: EnemyType, x: number, y: number, healthScale = 1): EnemyState {
    const stats = ENEMY_STATS[type];
    return {
        id,
        type,
        x,
        y,
        vx: 0,
        vy: 0,
        health: stats.health * healthScale,
        maxHealth: stats.health * healthScale,
        speed: stats.speed,
        radius: stats.radius,
        baseDamage: stats.baseDamage,
    };
}

export function updateEnemy(enemy: EnemyState, dtSeconds: number, flowField: FlowField, grid: Grid, geometry: MapGeometry, enemies: readonly EnemyState[]): boolean {
    const desired = sampleFlowDirection(flowField, grid, { x: enemy.x, y: enemy.y }, geometry);
    const cell = worldToGrid({ x: enemy.x, y: enemy.y }, grid, geometry);
    const terrain = cell ? grid.getTerrain(cell.x, cell.y) : 'grass';
    const speedMultiplier = GAME_CONFIG.terrainSpeedMultiplier[terrain];
    const desiredSpeed = enemy.speed * speedMultiplier;
    enemy.vx += (desired.x * desiredSpeed - enemy.vx) * Math.min(1, dtSeconds * 4.2);
    enemy.vy += (desired.y * desiredSpeed - enemy.vy) * Math.min(1, dtSeconds * 4.2);

    let separationX = 0;
    let separationY = 0;
    for (const other of enemies) {
        if (other.id === enemy.id || other.health <= 0) {
            continue;
        }
        const dx = enemy.x - other.x;
        const dy = enemy.y - other.y;
        const distance = Math.hypot(dx, dy);
        const minimum = (enemy.radius + other.radius) * 1.04;
        if (distance > 0.001 && distance < minimum) {
            const push = (minimum - distance) / minimum;
            separationX += (dx / distance) * push * enemy.speed * 0.56;
            separationY += (dy / distance) * push * enemy.speed * 0.56;
        }
    }

    const previousX = enemy.x;
    const previousY = enemy.y;
    enemy.x += (enemy.vx + separationX) * dtSeconds;
    enemy.y += (enemy.vy + separationY) * dtSeconds;

    const newCell = worldToGrid({ x: enemy.x, y: enemy.y }, grid, geometry);
    if (newCell && grid.isBlocked(newCell.x, newCell.y)) {
        enemy.x = previousX;
        enemy.y = previousY;
        enemy.vx *= -0.18;
        enemy.vy *= -0.18;
    }

    const baseCenter = cellCenter(flowField.base, geometry);
    return Math.hypot(enemy.x - baseCenter.x, enemy.y - baseCenter.y) < geometry.cellSize * 0.58;
}