import type { ProjectileState, ProjectileType } from '../types';

// Lightweight, allocation-free particle system rendered in immediate mode into the
// scene's shared Graphics object. A fixed pool plus a free-list keeps per-frame work
// bounded and avoids creating Phaser GameObjects per particle, so heavy projectile
// activity stays cheap.

const MAX_PARTICLES = 520;

interface Particle {
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    ageMs: number;
    lifeMs: number;
    startSize: number;
    endSize: number;
    startColor: number;
    endColor: number;
    startAlpha: number;
    endAlpha: number;
    drag: number;
    gravity: number;
    glow: boolean;
}

function createBlankParticle(): Particle {
    return {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        ageMs: 0,
        lifeMs: 1,
        startSize: 1,
        endSize: 1,
        startColor: 0xffffff,
        endColor: 0xffffff,
        startAlpha: 1,
        endAlpha: 0,
        drag: 0,
        gravity: 0,
        glow: false,
    };
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    const r = (ar + (br - ar) * t) | 0;
    const g = (ag + (bg - ag) * t) | 0;
    const bl = (ab + (bb - ab) * t) | 0;
    return (r << 16) | (g << 8) | bl;
}

export interface ExplosionEffect {
    x: number;
    y: number;
    radius: number;
    lifeMs: number;
}

export class EffectsSystem {
    private readonly pool: Particle[] = [];
    private readonly free: number[] = [];

    constructor() {
        for (let index = 0; index < MAX_PARTICLES; index += 1) {
            this.pool.push(createBlankParticle());
            this.free.push(index);
        }
    }

    private spawn(
        x: number,
        y: number,
        vx: number,
        vy: number,
        lifeMs: number,
        startSize: number,
        endSize: number,
        startColor: number,
        endColor: number,
        startAlpha: number,
        endAlpha: number,
        drag: number,
        gravity: number,
        glow: boolean,
    ): void {
        const slot = this.free.pop();
        if (slot === undefined) {
            return;
        }
        const p = this.pool[slot];
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.ageMs = 0;
        p.lifeMs = lifeMs;
        p.startSize = startSize;
        p.endSize = endSize;
        p.startColor = startColor;
        p.endColor = endColor;
        p.startAlpha = startAlpha;
        p.endAlpha = endAlpha;
        p.drag = drag;
        p.gravity = gravity;
        p.glow = glow;
    }

    /** Emit trailing particles for every live projectile based on its type. */
    emitTrails(projectiles: ProjectileState[], deltaMs: number): void {
        if (this.free.length === 0) {
            return;
        }
        for (const projectile of projectiles) {
            this.emitProjectileTrail(projectile, deltaMs);
        }
    }

    private emitProjectileTrail(projectile: ProjectileState, deltaMs: number): void {
        const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
        const dirX = projectile.vx / speed;
        const dirY = projectile.vy / speed;

        let interval: number;
        switch (projectile.type) {
            case 'missile':
                interval = 16;
                break;
            case 'cluster':
                interval = 20;
                break;
            case 'fragment':
                interval = 28;
                break;
            default:
                interval = 34;
                break;
        }

        let accum = (projectile.emitAccumMs ?? 0) + deltaMs;
        while (accum >= interval) {
            accum -= interval;
            this.emitTrailParticle(projectile, dirX, dirY);
            if (this.free.length === 0) {
                accum = 0;
                break;
            }
        }
        projectile.emitAccumMs = accum;
    }

    private emitTrailParticle(projectile: ProjectileState, dirX: number, dirY: number): void {
        // Spawn slightly behind the projectile so the trail streams from its tail.
        const tailX = projectile.x - dirX * (projectile.radius + 2);
        const tailY = projectile.y - dirY * (projectile.radius + 2);

        switch (projectile.type) {
            case 'missile': {
                // Hot exhaust flame right at the nozzle.
                this.spawn(
                    tailX,
                    tailY,
                    dirX * -24 + (Math.random() - 0.5) * 24,
                    dirY * -24 + (Math.random() - 0.5) * 24,
                    170,
                    4.2,
                    1.2,
                    0xffe28a,
                    0xff5a1a,
                    0.95,
                    0,
                    2.4,
                    0,
                    true,
                );
                // Drifting smoke puff that lingers behind the rocket.
                this.spawn(
                    tailX + (Math.random() - 0.5) * 3,
                    tailY + (Math.random() - 0.5) * 3,
                    dirX * -10 + (Math.random() - 0.5) * 14,
                    dirY * -10 + (Math.random() - 0.5) * 14 - 6,
                    560,
                    2.6,
                    8.5,
                    0xc8c2b6,
                    0x4a443d,
                    0.5,
                    0,
                    1.6,
                    -8,
                    false,
                );
                break;
            }
            case 'cluster': {
                this.spawn(
                    tailX,
                    tailY,
                    (Math.random() - 0.5) * 26,
                    (Math.random() - 0.5) * 26,
                    320,
                    3.4,
                    0.6,
                    0xffa8e6,
                    0x7a2f8f,
                    0.85,
                    0,
                    1.8,
                    0,
                    true,
                );
                break;
            }
            case 'fragment': {
                this.spawn(
                    tailX,
                    tailY,
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 30,
                    160,
                    2.2,
                    0.4,
                    0xffe66d,
                    0xff7a1a,
                    0.8,
                    0,
                    2,
                    0,
                    false,
                );
                break;
            }
            default: {
                // Faint tracer sparks for bullets; kept low-rate to stay cheap.
                this.spawn(
                    tailX,
                    tailY,
                    (Math.random() - 0.5) * 16,
                    (Math.random() - 0.5) * 16,
                    120,
                    1.7,
                    0.3,
                    0xfff3c4,
                    0xffcf6b,
                    0.55,
                    0,
                    2,
                    0,
                    false,
                );
                break;
            }
        }
    }

    /** Small spark burst when a direct-hit projectile strikes an enemy. */
    spawnImpact(x: number, y: number, type: ProjectileType): void {
        const sparks = type === 'missile' ? 10 : 6;
        for (let index = 0; index < sparks; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 70 + Math.random() * 130;
            this.spawn(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                220 + Math.random() * 120,
                type === 'missile' ? 3 : 2.2,
                0.4,
                0xfff1b0,
                0xff6a1a,
                0.9,
                0,
                3,
                40,
                true,
            );
        }
        if (type === 'missile') {
            this.spawnSmoke(x, y, 4, 0.7);
        }
    }

    /** Fiery burst for cluster shells and airstrikes. */
    spawnExplosion(x: number, y: number, radius: number, big: boolean): void {
        const emberCount = big ? 30 : 16;
        const smokeCount = big ? 12 : 6;
        const reach = radius * 1.1;
        for (let index = 0; index < emberCount; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = reach * (1.4 + Math.random() * 2.2);
            this.spawn(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                280 + Math.random() * 260,
                big ? 5 : 3.4,
                0.5,
                0xfff2b0,
                0xff3b00,
                0.95,
                0,
                3.2,
                90,
                true,
            );
        }
        // Bright core flash.
        this.spawn(x, y, 0, 0, big ? 180 : 130, radius * 0.5, radius * 0.18, 0xfff6cf, 0xffae3b, 0.85, 0, 0, 0, true);
        this.spawnSmoke(x, y, smokeCount, big ? 1.4 : 1);
    }

    private spawnSmoke(x: number, y: number, count: number, scale: number): void {
        for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (10 + Math.random() * 26) * scale;
            this.spawn(
                x + (Math.random() - 0.5) * 6,
                y + (Math.random() - 0.5) * 6,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 12,
                620 + Math.random() * 320,
                4 * scale,
                14 * scale,
                0xb6b0a4,
                0x3a352e,
                0.5,
                0,
                1.4,
                -14,
                false,
            );
        }
    }

    update(deltaMs: number): void {
        const dt = deltaMs / 1000;
        for (let index = 0; index < this.pool.length; index += 1) {
            const p = this.pool[index];
            if (!p.active) {
                continue;
            }
            p.ageMs += deltaMs;
            if (p.ageMs >= p.lifeMs) {
                p.active = false;
                this.free.push(index);
                continue;
            }
            const dragFactor = Math.max(0, 1 - p.drag * dt);
            p.vx *= dragFactor;
            p.vy *= dragFactor;
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
    }

    render(graphics: Phaser.GameObjects.Graphics): void {
        for (const p of this.pool) {
            if (!p.active) {
                continue;
            }
            const t = p.ageMs / p.lifeMs;
            const size = lerp(p.startSize, p.endSize, t);
            if (size <= 0.05) {
                continue;
            }
            const alpha = lerp(p.startAlpha, p.endAlpha, t);
            if (alpha <= 0.01) {
                continue;
            }
            const color = lerpColor(p.startColor, p.endColor, t);
            if (p.glow) {
                graphics.fillStyle(color, alpha * 0.28);
                graphics.fillCircle(p.x, p.y, size * 1.9);
            }
            graphics.fillStyle(color, alpha);
            graphics.fillCircle(p.x, p.y, size);
        }
    }
}
