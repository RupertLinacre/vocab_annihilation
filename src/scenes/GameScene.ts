import Phaser from 'phaser';
import { ENEMY_COLORS, GAME_CONFIG, TOWER_COLORS } from '../config/gameConfig';
import { SeededRandom } from '../core/SeededRandom';
import { createTower, towerTypeForDifficulty, upgradeTower } from '../entities/Tower';
import { updateEnemy } from '../entities/Enemy';
import { cellCenter, Grid, worldToGrid } from '../map/Grid';
import { hasLineOfSight } from '../map/LineOfSight';
import { generateMap, type GeneratedMap } from '../map/MapGenerator';
import { buildFlowField, type FlowField } from '../pathfinding/FlowField';
import { calculateTowerThreatCosts, type CostGrid, getTowerStats } from '../pathfinding/ThreatMap';
import { EnemySpawner } from '../systems/EnemySpawner';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { VocabQuestionSystem } from '../systems/VocabQuestionSystem';
import { BottomPanel } from '../ui/BottomPanel';
import type { EnemyState, GridPoint, ProjectileState, TowerDifficulty, TowerState } from '../types';

interface DebugToggles {
    grid: boolean;
    ranges: boolean;
    flow: boolean;
    costs: boolean;
    los: boolean;
}

interface ExplosionVisual {
    x: number;
    y: number;
    radius: number;
    lifeMs: number;
}

export class GameScene extends Phaser.Scene {
    private generatedMap!: GeneratedMap;
    private flowField!: FlowField;
    private threatCosts!: CostGrid;
    private graphics!: Phaser.GameObjects.Graphics;
    private debugGraphics!: Phaser.GameObjects.Graphics;
    private costTexts: Phaser.GameObjects.Text[] = [];
    private panel!: BottomPanel;
    private spawner!: EnemySpawner;
    private towerSystem = new TowerSystem();
    private projectileSystem = new ProjectileSystem();
    private towers: TowerState[] = [];
    private enemies: EnemyState[] = [];
    private projectiles: ProjectileState[] = [];
    private explosions: ExplosionVisual[] = [];
    private baseHealth = GAME_CONFIG.baseHealth;
    private elapsedMs = 0;
    private kills = 0;
    private answered = 0;
    private correctAnswers = 0;
    private nextTowerId = 1;
    private selectedCell: GridPoint | undefined;
    private selectedTower: TowerState | undefined;
    private gameOver = false;
    private debug: DebugToggles = { grid: true, ranges: false, flow: false, costs: false, los: false };

    constructor() {
        super('GameScene');
    }

    create(): void {
        const seedParam = new URLSearchParams(window.location.search).get('seed');
        const seed = seedParam ? SeededRandom.hash(seedParam) : Date.now() % 1000000000;
        this.generatedMap = generateMap(seed);
        this.rebuildFlowField();
        this.graphics = this.add.graphics();
        this.debugGraphics = this.add.graphics();
        this.spawner = new EnemySpawner(this.generatedMap.spawns, GAME_CONFIG.map, new SeededRandom(`${seed}:spawns`));
        this.panel = new BottomPanel(new VocabQuestionSystem(new SeededRandom(`${seed}:vocab`)), {
            onBuild: (cell, difficulty) => this.buildTower(cell, difficulty),
            onUpgrade: (tower) => this.upgradeExistingTower(tower),
            onAnswered: (correct) => this.recordAnswer(correct),
            onClose: () => this.clearSelection(),
        });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
        this.registerDebugKeys();
        this.installBrowserHooks();
        this.updateHud();
        this.render();
    }

    update(_time: number, deltaMs: number): void {
        if (this.gameOver) {
            this.render();
            return;
        }
        this.elapsedMs += deltaMs;
        this.enemies.push(...this.spawner.update(deltaMs));

        const enemySurvivors: EnemyState[] = [];
        for (const enemy of this.enemies) {
            const reachedBase = updateEnemy(enemy, deltaMs / 1000, this.flowField, this.generatedMap.grid, GAME_CONFIG.map, this.enemies);
            if (reachedBase) {
                this.baseHealth = Math.max(0, this.baseHealth - enemy.baseDamage);
            } else if (enemy.health > 0) {
                enemySurvivors.push(enemy);
            }
        }
        this.enemies = enemySurvivors;

        this.projectiles.push(...this.towerSystem.update(deltaMs, this.towers, this.enemies, this.generatedMap.grid, GAME_CONFIG.map, this.flowField));
        const projectileResult = this.projectileSystem.update(deltaMs, this.projectiles, this.enemies, this.generatedMap.grid, GAME_CONFIG.map);
        this.projectiles = projectileResult.projectiles;
        this.kills += projectileResult.kills;
        this.explosions.push(...projectileResult.explosions);
        this.enemies = this.enemies.filter((enemy) => enemy.health > 0);
        this.explosions = this.explosions
            .map((explosion) => ({ ...explosion, lifeMs: explosion.lifeMs - deltaMs }))
            .filter((explosion) => explosion.lifeMs > 0);

        if (this.baseHealth <= 0) {
            this.endGame();
        }
        this.updateHud();
        this.render();
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (this.gameOver) {
            return;
        }
        const cell = worldToGrid({ x: pointer.x, y: pointer.y }, this.generatedMap.grid, GAME_CONFIG.map);
        if (!cell) {
            return;
        }
        const tower = this.findTowerAt(cell.x, cell.y);
        this.selectedCell = cell;
        this.selectedTower = tower;
        if (tower) {
            this.panel.openUpgrade(tower);
        } else if (this.generatedMap.grid.isBuildable(cell.x, cell.y)) {
            this.panel.openBuild(cell);
        } else {
            this.selectedTower = undefined;
        }
        this.render();
    }

    private buildTower(cell: GridPoint, difficulty: TowerDifficulty): void {
        if (!this.generatedMap.grid.isBuildable(cell.x, cell.y) || this.findTowerAt(cell.x, cell.y)) {
            return;
        }
        this.towers.push(createTower(this.nextTowerId++, cell.x, cell.y, towerTypeForDifficulty(difficulty)));
        this.rebuildFlowField();
    }

    private upgradeExistingTower(tower: TowerState): void {
        if (upgradeTower(tower)) {
            this.rebuildFlowField();
        }
    }

    private recordAnswer(correct: boolean): void {
        this.answered += 1;
        if (correct) {
            this.correctAnswers += 1;
        }
        this.updateHud();
    }

    private rebuildFlowField(): void {
        this.threatCosts = calculateTowerThreatCosts(this.generatedMap.grid, this.towers, GAME_CONFIG.map);
        this.flowField = buildFlowField(this.generatedMap.grid, this.generatedMap.base, this.threatCosts);
    }

    private findTowerAt(x: number, y: number): TowerState | undefined {
        return this.towers.find((tower) => tower.gridX === x && tower.gridY === y);
    }

    private clearSelection(): void {
        this.selectedCell = undefined;
        this.selectedTower = undefined;
    }

    private registerDebugKeys(): void {
        const keyboard = this.input.keyboard;
        keyboard?.on('keydown-G', () => { this.debug.grid = !this.debug.grid; });
        keyboard?.on('keydown-R', () => { this.debug.ranges = !this.debug.ranges; });
        keyboard?.on('keydown-F', () => { this.debug.flow = !this.debug.flow; });
        keyboard?.on('keydown-C', () => { this.debug.costs = !this.debug.costs; });
        keyboard?.on('keydown-L', () => { this.debug.los = !this.debug.los; });
    }

    private updateHud(): void {
        document.querySelector('[data-stat="health"]')!.textContent = `${Math.ceil(this.baseHealth)}`;
        document.querySelector('[data-stat="time"]')!.textContent = this.formatTime(this.elapsedMs);
        document.querySelector('[data-stat="kills"]')!.textContent = `${this.kills}`;
        const accuracy = this.answered === 0 ? '0/0' : `${this.correctAnswers}/${this.answered} (${Math.round((this.correctAnswers / this.answered) * 100)}%)`;
        document.querySelector('[data-stat="accuracy"]')!.textContent = accuracy;
    }

    private endGame(): void {
        this.gameOver = true;
        const gameOver = document.querySelector<HTMLElement>('[data-testid="game-over"]')!;
        gameOver.hidden = false;
        document.querySelector('[data-game-over-time]')!.textContent = this.formatTime(this.elapsedMs);
    }

    private formatTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    private render(): void {
        this.graphics.clear();
        this.debugGraphics.clear();
        this.renderMap();
        this.renderDebugLosBlocks();
        this.renderTowerRanges();
        this.renderFlowDebug();
        this.renderTowers();
        this.renderProjectiles();
        this.renderEnemies();
        this.renderExplosions();
        this.renderSelection();
        this.renderCostDebug();
    }

    private renderMap(): void {
        const { grid, spawns, base } = this.generatedMap;
        const { originX, originY, cellSize } = GAME_CONFIG.map;
        grid.forEachCell((x, y, terrain) => {
            const color = terrain === 'tree' ? 0x183528 : terrain === 'tarmac' ? 0x747a77 : 0x3d8b55;
            this.graphics.fillStyle(color, 1);
            this.graphics.fillRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
            if (terrain === 'grass') {
                this.graphics.fillStyle(0x5aa96d, 0.22);
                this.graphics.fillRect(originX + x * cellSize + 3, originY + y * cellSize + 3, cellSize - 6, cellSize - 6);
            }
        });
        if (this.debug.grid) {
            this.graphics.lineStyle(1, 0xf7f0d6, 0.16);
            for (let x = 0; x <= grid.cols; x += 1) {
                const worldX = originX + x * cellSize;
                this.graphics.lineBetween(worldX, originY, worldX, originY + grid.rows * cellSize);
            }
            for (let y = 0; y <= grid.rows; y += 1) {
                const worldY = originY + y * cellSize;
                this.graphics.lineBetween(originX, worldY, originX + grid.cols * cellSize, worldY);
            }
        }
        for (const spawn of spawns) {
            const center = cellCenter(spawn, GAME_CONFIG.map);
            this.graphics.fillStyle(0xf3b64b, 1);
            this.graphics.fillTriangle(center.x - 14, center.y - 14, center.x - 14, center.y + 14, center.x + 16, center.y);
            this.graphics.lineStyle(2, 0x3b2106, 0.7);
            this.graphics.strokeCircle(center.x, center.y, 18);
        }
        const baseCenter = cellCenter(base, GAME_CONFIG.map);
        this.graphics.fillStyle(0xf7f0d6, 1);
        this.graphics.fillRect(baseCenter.x - 23, baseCenter.y - 27, 46, 54);
        this.graphics.fillStyle(0x2ec4b6, 1);
        this.graphics.fillRect(baseCenter.x - 15, baseCenter.y - 18, 30, 36);
    }

    private renderTowerRanges(): void {
        const towersToShow = this.debug.ranges ? this.towers : this.selectedTower ? [this.selectedTower] : [];
        for (const tower of towersToShow) {
            const center = cellCenter({ x: tower.gridX, y: tower.gridY }, GAME_CONFIG.map);
            const stats = getTowerStats(tower);
            this.graphics.lineStyle(2, TOWER_COLORS[tower.type], tower === this.selectedTower ? 0.54 : 0.24);
            this.graphics.strokeCircle(center.x, center.y, stats.range);
        }
    }

    private renderTowers(): void {
        for (const tower of this.towers) {
            const center = cellCenter({ x: tower.gridX, y: tower.gridY }, GAME_CONFIG.map);
            const color = TOWER_COLORS[tower.type];
            this.graphics.fillStyle(0x101614, 0.85);
            this.graphics.fillRect(center.x - 15, center.y - 15, 30, 30);
            this.graphics.fillStyle(color, 1);
            this.graphics.fillRect(center.x - 12, center.y - 12, 24, 24);
            this.graphics.fillStyle(0x101614, 0.9);
            for (let level = 0; level < tower.level; level += 1) {
                this.graphics.fillCircle(center.x - 10 + level * 5, center.y + 18, 2);
            }
            if (tower.type === 'missile') {
                this.graphics.fillStyle(0x101614, 0.8);
                this.graphics.fillTriangle(center.x, center.y - 10, center.x - 8, center.y + 8, center.x + 8, center.y + 8);
            } else if (tower.type === 'cluster') {
                this.graphics.lineStyle(2, 0x101614, 0.85);
                this.graphics.strokeCircle(center.x, center.y, 8);
            }
        }
    }

    private renderEnemies(): void {
        for (const enemy of this.enemies) {
            this.graphics.fillStyle(0x0b0d0c, 0.42);
            this.graphics.fillCircle(enemy.x + 2, enemy.y + 3, enemy.radius + 1);
            this.graphics.fillStyle(ENEMY_COLORS[enemy.type], 1);
            this.graphics.fillCircle(enemy.x, enemy.y, enemy.radius);
            const barWidth = enemy.radius * 2.1;
            const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
            this.graphics.fillStyle(0x111611, 0.88);
            this.graphics.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth, 4);
            this.graphics.fillStyle(healthPercent > 0.45 ? 0x66d17a : 0xe85d75, 1);
            this.graphics.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth * healthPercent, 4);
        }
    }

    private renderProjectiles(): void {
        for (const projectile of this.projectiles) {
            const color = projectile.type === 'missile' ? 0xbde0fe : projectile.type === 'cluster' ? 0xf15bb5 : projectile.type === 'fragment' ? 0xffe66d : 0xf7f0d6;
            this.graphics.fillStyle(color, 1);
            if (projectile.type === 'missile') {
                const angle = Math.atan2(projectile.vy, projectile.vx);
                this.graphics.save();
                this.graphics.translateCanvas(projectile.x, projectile.y);
                this.graphics.rotateCanvas(angle);
                this.graphics.fillTriangle(8, 0, -6, -5, -6, 5);
                this.graphics.restore();
            } else {
                this.graphics.fillCircle(projectile.x, projectile.y, projectile.radius);
            }
        }
    }

    private renderExplosions(): void {
        for (const explosion of this.explosions) {
            const alpha = Math.max(0, Math.min(1, explosion.lifeMs / 260));
            this.graphics.lineStyle(3, 0xffe66d, alpha);
            this.graphics.strokeCircle(explosion.x, explosion.y, explosion.radius * (1.05 - alpha * 0.2));
            this.graphics.fillStyle(0xff9f1c, alpha * 0.16);
            this.graphics.fillCircle(explosion.x, explosion.y, explosion.radius);
        }
    }

    private renderSelection(): void {
        if (!this.selectedCell) {
            return;
        }
        const { originX, originY, cellSize } = GAME_CONFIG.map;
        const blocked = !this.generatedMap.grid.isBuildable(this.selectedCell.x, this.selectedCell.y) && !this.selectedTower;
        this.graphics.lineStyle(3, blocked ? 0xe85d75 : 0xffe66d, 0.95);
        this.graphics.strokeRect(originX + this.selectedCell.x * cellSize + 2, originY + this.selectedCell.y * cellSize + 2, cellSize - 4, cellSize - 4);
    }

    private renderFlowDebug(): void {
        if (!this.debug.flow) {
            return;
        }
        const { grid } = this.generatedMap;
        for (let y = 0; y < grid.rows; y += 1) {
            for (let x = 0; x < grid.cols; x += 1) {
                if (grid.isBlocked(x, y) || (x + y) % 2 === 1) {
                    continue;
                }
                const center = cellCenter({ x, y }, GAME_CONFIG.map);
                const direction = this.flowField.direction[y][x];
                this.debugGraphics.lineStyle(1, 0x0b1dff, 0.6);
                this.debugGraphics.lineBetween(center.x, center.y, center.x + direction.x * 13, center.y + direction.y * 13);
                this.debugGraphics.fillStyle(0x0b1dff, 0.8);
                this.debugGraphics.fillCircle(center.x + direction.x * 13, center.y + direction.y * 13, 2);
            }
        }
    }

    private renderDebugLosBlocks(): void {
        if (!this.debug.los || !this.selectedTower) {
            return;
        }
        const tower = this.selectedTower;
        const stats = getTowerStats(tower);
        const towerCenter = cellCenter({ x: tower.gridX, y: tower.gridY }, GAME_CONFIG.map);
        const cellRadius = Math.ceil(stats.range / GAME_CONFIG.map.cellSize);
        const { originX, originY, cellSize } = GAME_CONFIG.map;
        for (let y = tower.gridY - cellRadius; y <= tower.gridY + cellRadius; y += 1) {
            for (let x = tower.gridX - cellRadius; x <= tower.gridX + cellRadius; x += 1) {
                if (!this.generatedMap.grid.inBounds(x, y) || this.generatedMap.grid.isBlocked(x, y)) {
                    continue;
                }
                const center = cellCenter({ x, y }, GAME_CONFIG.map);
                if (Math.hypot(center.x - towerCenter.x, center.y - towerCenter.y) <= stats.range && !hasLineOfSight(this.generatedMap.grid, towerCenter, center, GAME_CONFIG.map)) {
                    this.debugGraphics.fillStyle(0xe85d75, 0.28);
                    this.debugGraphics.fillRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    private renderCostDebug(): void {
        if (!this.debug.costs) {
            this.costTexts.forEach((text) => text.setVisible(false));
            return;
        }
        const { grid } = this.generatedMap;
        const required = grid.cols * grid.rows;
        while (this.costTexts.length < required) {
            this.costTexts.push(this.add.text(0, 0, '', { fontFamily: 'Verdana', fontSize: '9px', color: '#101614' }).setDepth(4));
        }
        let index = 0;
        for (let y = 0; y < grid.rows; y += 1) {
            for (let x = 0; x < grid.cols; x += 1) {
                const text = this.costTexts[index++];
                const center = cellCenter({ x, y }, GAME_CONFIG.map);
                const value = this.flowField.costToBase[y][x];
                text.setVisible(true);
                text.setPosition(center.x - 13, center.y - 7);
                text.setText(Number.isFinite(value) ? `${Math.round(value)}` : 'X');
            }
        }
    }

    private installBrowserHooks(): void {
        const hooks = {
            getFirstBuildableCell: () => {
                for (let y = 3; y < this.generatedMap.grid.rows; y += 1) {
                    for (let x = 3; x < this.generatedMap.grid.cols; x += 1) {
                        if (this.generatedMap.grid.isBuildable(x, y) && !this.findTowerAt(x, y)) {
                            const center = cellCenter({ x, y }, GAME_CONFIG.map);
                            return { x, y, worldX: center.x, worldY: center.y };
                        }
                    }
                }
                return null;
            },
            getTowerCount: () => this.towers.length,
            getEnemyCount: () => this.enemies.length,
            getEnemySnapshot: () => this.enemies.map((enemy) => ({ id: enemy.id, x: enemy.x, y: enemy.y, health: enemy.health })),
            getBaseHealth: () => this.baseHealth,
            spawnEnemyNearBase: () => this.spawnEnemyNearBase(),
        };
        (window as unknown as { vocabAnnihilation: typeof hooks }).vocabAnnihilation = hooks;
    }

    private spawnEnemyNearBase(): void {
        const center = cellCenter(this.generatedMap.base, GAME_CONFIG.map);
        this.enemies.push({
            id: 900000 + this.enemies.length,
            type: 'scout',
            x: center.x - GAME_CONFIG.map.cellSize * 0.7,
            y: center.y,
            vx: 0,
            vy: 0,
            health: 10,
            maxHealth: 10,
            speed: 90,
            radius: 10,
            baseDamage: 4,
        });
    }
}