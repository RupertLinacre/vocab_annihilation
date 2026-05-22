import { createProjectile } from '../entities/Projectile';
import { segmentCrossesTree } from '../map/LineOfSight';
import type { EnemyState, MapGeometry, ProjectileState } from '../types';
import { Grid } from '../map/Grid';

export interface ProjectileUpdateResult {
    projectiles: ProjectileState[];
    kills: number;
    explosions: { x: number; y: number; radius: number; lifeMs: number }[];
}

function normalize(dx: number, dy: number): { x: number; y: number } {
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
}

function applyDamage(enemy: EnemyState, damage: number): boolean {
    const wasAlive = enemy.health > 0;
    enemy.health -= damage;
    return wasAlive && enemy.health <= 0;
}

export class ProjectileSystem {
    private nextProjectileId = 100000;

    update(deltaMs: number, projectiles: ProjectileState[], enemies: EnemyState[], grid: Grid, geometry: MapGeometry): ProjectileUpdateResult {
        const aliveProjectiles: ProjectileState[] = [];
        const spawnedFragments: ProjectileState[] = [];
        const explosions: { x: number; y: number; radius: number; lifeMs: number }[] = [];
        let kills = 0;

        for (const projectile of projectiles) {
            projectile.lifeMs -= deltaMs;
            projectile.previousX = projectile.x;
            projectile.previousY = projectile.y;
            if (projectile.type === 'missile') {
                this.updateMissileVelocity(projectile, enemies, deltaMs);
            }
            projectile.x += projectile.vx * (deltaMs / 1000);
            projectile.y += projectile.vy * (deltaMs / 1000);

            if (projectile.lifeMs <= 0 || segmentCrossesTree(grid, { x: projectile.previousX, y: projectile.previousY }, { x: projectile.x, y: projectile.y }, geometry)) {
                continue;
            }

            const hit = this.findHitEnemy(projectile, enemies);
            if (hit) {
                if (projectile.type === 'cluster') {
                    kills += this.explodeCluster(projectile, enemies, spawnedFragments, explosions);
                } else {
                    if (applyDamage(hit, projectile.damage)) {
                        kills += 1;
                    }
                }
                continue;
            }

            aliveProjectiles.push(projectile);
        }

        return { projectiles: [...aliveProjectiles, ...spawnedFragments], kills, explosions };
    }

    private updateMissileVelocity(projectile: ProjectileState, enemies: readonly EnemyState[], deltaMs: number): void {
        let target = enemies.find((enemy) => enemy.id === projectile.targetId && enemy.health > 0);
        if (!target) {
            target = enemies.filter((enemy) => enemy.health > 0).sort((a, b) => Math.hypot(a.x - projectile.x, a.y - projectile.y) - Math.hypot(b.x - projectile.x, b.y - projectile.y))[0];
            projectile.targetId = target?.id;
        }
        if (!target) {
            return;
        }
        const desired = normalize(target.x - projectile.x, target.y - projectile.y);
        const currentAngle = Math.atan2(projectile.vy, projectile.vx);
        const desiredAngle = Math.atan2(desired.y, desired.x);
        let angleDelta = desiredAngle - currentAngle;
        while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
        while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
        const maxTurn = (projectile.turnRate ?? 2.2) * (deltaMs / 1000);
        const newAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDelta));
        const speed = projectile.speed ?? Math.hypot(projectile.vx, projectile.vy);
        projectile.vx = Math.cos(newAngle) * speed;
        projectile.vy = Math.sin(newAngle) * speed;
    }

    private findHitEnemy(projectile: ProjectileState, enemies: readonly EnemyState[]): EnemyState | undefined {
        return enemies.find((enemy) => enemy.health > 0 && Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) <= enemy.radius + projectile.radius);
    }

    private explodeCluster(projectile: ProjectileState, enemies: EnemyState[], fragments: ProjectileState[], explosions: { x: number; y: number; radius: number; lifeMs: number }[]): number {
        const radius = projectile.explosionRadius ?? 64;
        let kills = 0;
        for (const enemy of enemies) {
            if (enemy.health <= 0) {
                continue;
            }
            const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
            if (distance <= radius) {
                const falloff = 1 - distance / radius * 0.45;
                if (applyDamage(enemy, projectile.damage * falloff)) {
                    kills += 1;
                }
            }
        }
        explosions.push({ x: projectile.x, y: projectile.y, radius, lifeMs: 260 });
        const fragmentCount = projectile.fragmentCount ?? 6;
        for (let index = 0; index < fragmentCount; index += 1) {
            const angle = (Math.PI * 2 * index) / fragmentCount;
            const speed = 260;
            const fragment = createProjectile(this.nextProjectileId++, 'fragment', projectile.x, projectile.y, Math.cos(angle) * speed, Math.sin(angle) * speed, projectile.fragmentDamage ?? 7, 3.2, 620);
            fragments.push(fragment);
        }
        return kills;
    }
}