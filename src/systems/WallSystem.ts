import { GAME_CONFIG } from '../config/gameConfig';
import { isWallTower } from '../entities/Tower';
import { cellCenter, Grid, worldToGrid } from '../map/Grid';
import type { FlowField } from '../pathfinding/FlowField';
import type { EnemyState, MapGeometry, TowerState } from '../types';

export interface WallAttackResult {
    attacked: boolean;
    destroyedWall?: TowerState;
}

export function enemyHasPathToBase(enemy: EnemyState, flowField: FlowField, grid: Grid, geometry: MapGeometry): boolean {
    const cell = worldToGrid({ x: enemy.x, y: enemy.y }, grid, geometry);
    return !cell || Number.isFinite(flowField.costToBase[cell.y][cell.x]);
}

export function findNearestWallTower(enemy: EnemyState, towers: readonly TowerState[], geometry: MapGeometry): TowerState | undefined {
    let nearestWall: TowerState | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const tower of towers) {
        if (!isWallTower(tower)) {
            continue;
        }
        const center = cellCenter({ x: tower.gridX, y: tower.gridY }, geometry);
        const distance = Math.hypot(center.x - enemy.x, center.y - enemy.y);
        if (distance < nearestDistance) {
            nearestWall = tower;
            nearestDistance = distance;
        }
    }
    return nearestWall;
}

export function attackNearestWallIfPathBlocked(enemy: EnemyState, dtSeconds: number, towers: readonly TowerState[], flowField: FlowField, grid: Grid, geometry: MapGeometry): WallAttackResult {
    if (enemyHasPathToBase(enemy, flowField, grid, geometry)) {
        return { attacked: false };
    }

    const wall = findNearestWallTower(enemy, towers, geometry);
    if (!wall) {
        return { attacked: false };
    }

    enemy.vx = 0;
    enemy.vy = 0;
    enemy.lastMoveSpeed = 0;
    enemy.isStuck = true;
    enemy.stalledSeconds = 0;
    wall.maxHealth = wall.maxHealth ?? GAME_CONFIG.wall.health;
    wall.health = Math.max(0, (wall.health ?? GAME_CONFIG.wall.health) - enemy.baseDamage * dtSeconds);

    return wall.health <= 0
        ? { attacked: true, destroyedWall: wall }
        : { attacked: true };
}
