import type { EnemyState, MapGeometry, ProjectileState, TowerState } from '../types';
import { getTowerStats } from '../pathfinding/ThreatMap';
import { isWallTower, selectTowerTarget } from '../entities/Tower';
import { cellCenter, Grid } from '../map/Grid';
import type { FlowField } from '../pathfinding/FlowField';
import { createProjectile } from '../entities/Projectile';

export interface TowerUpdateResult {
    projectiles: ProjectileState[];
    shotsFired: number;
}

function normalize(dx: number, dy: number): { x: number; y: number } {
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
}

export class TowerSystem {
    private nextProjectileId = 1;

    update(deltaMs: number, towers: TowerState[], enemies: readonly EnemyState[], grid: Grid, geometry: MapGeometry, flowField: FlowField): TowerUpdateResult {
        const projectiles: ProjectileState[] = [];
        let shotsFired = 0;
        for (const tower of towers) {
            if (isWallTower(tower)) {
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
        return { projectiles, shotsFired };
    }
}