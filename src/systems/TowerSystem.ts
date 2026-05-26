import type { EnemyState, MapGeometry, ProjectileState, TowerState } from '../types';
import { getTowerStats } from '../pathfinding/ThreatMap';
import { isWallTower, selectTowerTarget } from '../entities/Tower';
import { cellCenter, Grid, worldToGrid } from '../map/Grid';
import type { FlowField } from '../pathfinding/FlowField';
import { createProjectile } from '../entities/Projectile';

export interface TowerUpdateResult {
    projectiles: ProjectileState[];
    shotsFired: number;
    kills: number;
    explosions: { x: number; y: number; radius: number; lifeMs: number }[];
    hurtSounds: number;
    deathSounds: number;
    detonatedTowerIds: number[];
}

function normalize(dx: number, dy: number): { x: number; y: number } {
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
}

function applyDamage(enemy: EnemyState, damage: number): boolean {
    const wasAlive = enemy.health > 0;
    enemy.health -= damage;
    enemy.hurtFlashMs = 120;
    return wasAlive && enemy.health <= 0;
}

function applyKnockback(enemy: EnemyState, originX: number, originY: number, distance: number, grid: Grid, geometry: MapGeometry): void {
    if (distance <= 0 || enemy.health <= 0) {
        return;
    }

    let direction = normalize(enemy.x - originX, enemy.y - originY);
    if (Math.abs(direction.x) < 0.001 && Math.abs(direction.y) < 0.001) {
        direction = normalize(enemy.vx, enemy.vy);
    }
    if (Math.abs(direction.x) < 0.001 && Math.abs(direction.y) < 0.001) {
        direction = { x: 1, y: 0 };
    }

    const stepSize = Math.max(5, geometry.cellSize * 0.16);
    let remaining = distance;
    while (remaining > 0.001) {
        const step = Math.min(stepSize, remaining);
        const candidate = { x: enemy.x + direction.x * step, y: enemy.y + direction.y * step };
        const cell = worldToGrid(candidate, grid, geometry);
        if (!cell || grid.isBlocked(cell.x, cell.y)) {
            break;
        }
        enemy.x = candidate.x;
        enemy.y = candidate.y;
        remaining -= step;
    }

    enemy.vx *= 0.28;
    enemy.vy *= 0.28;
    enemy.lastProgressDistance = Number.POSITIVE_INFINITY;
    enemy.stalledSeconds = 0;
}

export class TowerSystem {
    private nextProjectileId = 1;

    update(deltaMs: number, towers: TowerState[], enemies: EnemyState[], grid: Grid, geometry: MapGeometry, flowField: FlowField): TowerUpdateResult {
        const projectiles: ProjectileState[] = [];
        const explosions: { x: number; y: number; radius: number; lifeMs: number }[] = [];
        const detonatedTowerIds: number[] = [];
        let shotsFired = 0;
        let kills = 0;
        let hurtSounds = 0;
        let deathSounds = 0;
        for (const tower of towers) {
            if (isWallTower(tower)) {
                continue;
            }
            if (tower.type === 'mine') {
                const result = this.tryDetonateMine(tower, enemies, grid, geometry);
                if (!result) {
                    continue;
                }
                detonatedTowerIds.push(tower.id);
                explosions.push(result.explosion);
                kills += result.kills;
                hurtSounds += result.hurtSounds;
                deathSounds += result.deathSounds;
                continue;
            }
            tower.cooldownMs -= deltaMs;
            if (tower.cooldownMs > 0) {
                continue;
            }
            const target = selectTowerTarget(tower, enemies, grid, geometry, flowField);
            if (!target) {
                continue;
            }
            const stats = getTowerStats(tower);
            const center = cellCenter({ x: tower.gridX, y: tower.gridY }, geometry);
            const targetDirection = normalize(target.x - center.x, target.y - center.y);
            if (tower.type === 'easy') {
                const speed = stats.bulletSpeed ?? 420;
                projectiles.push(createProjectile(this.nextProjectileId++, 'bullet', center.x, center.y, targetDirection.x * speed, targetDirection.y * speed, stats.damage, 4, 1600));
            } else if (tower.type === 'spray') {
                const pelletCount = stats.pelletCount ?? 3;
                const spread = stats.spreadRadians ?? 0.42;
                const speed = stats.bulletSpeed ?? 390;
                const baseAngle = Math.atan2(targetDirection.y, targetDirection.x);
                for (let index = 0; index < pelletCount; index += 1) {
                    const t = pelletCount === 1 ? 0.5 : index / (pelletCount - 1);
                    const angle = baseAngle + (t - 0.5) * spread;
                    projectiles.push(createProjectile(this.nextProjectileId++, 'bullet', center.x, center.y, Math.cos(angle) * speed, Math.sin(angle) * speed, stats.damage, 3.4, 1250));
                }
            } else if (tower.type === 'missile') {
                const count = stats.missileCount ?? 1;
                const speed = stats.missileSpeed ?? 180;
                const baseAngle = Math.atan2(targetDirection.y, targetDirection.x);
                for (let index = 0; index < count; index += 1) {
                    const angle = baseAngle + (index - (count - 1) / 2) * 0.18;
                    const projectile = createProjectile(this.nextProjectileId++, 'missile', center.x, center.y, Math.cos(angle) * speed * 0.55, Math.sin(angle) * speed * 0.55, stats.damage, 6, 3600);
                    projectile.targetId = target.id;
                    projectile.speed = speed;
                    projectile.turnRate = stats.missileTurnRate ?? 2.3;
                    projectiles.push(projectile);
                }
            } else {
                const speed = stats.bulletSpeed ?? 280;
                const projectile = createProjectile(this.nextProjectileId++, 'cluster', center.x, center.y, targetDirection.x * speed, targetDirection.y * speed, stats.damage, 8, 2100);
                projectile.targetId = target.id;
                projectile.explosionRadius = stats.explosionRadius;
                projectile.fragmentCount = stats.fragmentCount;
                projectile.fragmentDamage = stats.fragmentDamage;
                projectiles.push(projectile);
            }
            tower.cooldownMs = stats.cooldownMs;
            shotsFired += 1;
        }
        return { projectiles, shotsFired, kills, explosions, hurtSounds, deathSounds, detonatedTowerIds };
    }

    private tryDetonateMine(
        tower: TowerState,
        enemies: EnemyState[],
        grid: Grid,
        geometry: MapGeometry,
    ): { kills: number; hurtSounds: number; deathSounds: number; explosion: { x: number; y: number; radius: number; lifeMs: number } } | undefined {
        const stats = getTowerStats(tower);
        const center = cellCenter({ x: tower.gridX, y: tower.gridY }, geometry);
        const triggerRadius = stats.triggerRadius ?? geometry.cellSize * 0.3;
        const primaryTarget = enemies.find((enemy) => enemy.health > 0 && Math.hypot(enemy.x - center.x, enemy.y - center.y) <= enemy.radius + triggerRadius);
        if (!primaryTarget) {
            return undefined;
        }

        const explosionRadius = stats.explosionRadius ?? stats.range;
        const maxKnockback = stats.knockbackDistance ?? 0;
        let kills = 0;
        let hurtSounds = 0;
        let deathSounds = 0;

        for (const enemy of enemies) {
            if (enemy.health <= 0) {
                continue;
            }

            const distance = Math.hypot(enemy.x - center.x, enemy.y - center.y);
            if (distance > explosionRadius + enemy.radius * 0.5) {
                continue;
            }

            const normalizedDistance = explosionRadius <= 0 ? 0 : Math.min(1, distance / explosionRadius);
            const falloff = Math.max(0.18, 1 - normalizedDistance);
            const damage = enemy.id === primaryTarget.id
                ? Math.max(enemy.health + enemy.maxHealth, stats.damage)
                : stats.damage * (0.3 + falloff * 0.7);
            hurtSounds += 1;

            if (applyDamage(enemy, damage)) {
                kills += 1;
                deathSounds += 1;
                continue;
            }

            applyKnockback(enemy, center.x, center.y, maxKnockback * falloff, grid, geometry);
        }

        return {
            kills,
            hurtSounds,
            deathSounds,
            explosion: { x: center.x, y: center.y, radius: explosionRadius, lifeMs: 260 },
        };
    }
}