import Phaser from 'phaser';
import { ENEMY_STATS, GAME_CONFIG, TOWER_COLORS } from '../config/gameConfig';
import { SeededRandom } from '../core/SeededRandom';
import { createTower, towerTypeForDifficulty, upgradeTower } from '../entities/Tower';
import { updateEnemy } from '../entities/Enemy';
import { isBaseFootprintCell } from '../map/BaseFootprint';
import { cellCenter, Grid, worldToGrid } from '../map/Grid';
import { hasLineOfSight } from '../map/LineOfSight';
import { generateMap, type GeneratedMap } from '../map/MapGenerator';
import { buildFlowField, type FlowField } from '../pathfinding/FlowField';
import { calculateTowerThreatCosts, createEmptyCostGrid, type CostGrid, getTowerStats } from '../pathfinding/ThreatMap';
import { EnemySpawner, isGameDifficulty, type GameDifficulty } from '../systems/EnemySpawner';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { VocabQuestionSystem } from '../systems/VocabQuestionSystem';
import { BottomPanel, type BuildDifficultySelection } from '../ui/BottomPanel';
import type { EnemyState, GridPoint, ProjectileState, TerrainType, TowerDifficulty, TowerState, TowerType, Vec2 } from '../types';

const SPRITE_PATHS = {
    base: 'sprites/base_1.png',
    grass1: 'sprites/grass_1.png',
    grass2: 'sprites/grass_2.png',
    grass3: 'sprites/grass_3.png',
    grass4: 'sprites/grass_4.png',
    grass5: 'sprites/grass_5.png',
    tree1: 'sprites/tree_1.png',
    tree2: 'sprites/tree_2.png',
    tarmac1: 'sprites/tarmac_1.png',
    tarmac2: 'sprites/tarmac_2.png',
    tarmac3: 'sprites/tarmac_3.png',
    towerBasic: 'sprites/turret_basic.png',
    towerCluster: 'sprites/turret_cluster.png',
    towerClusterBomb: 'sprites/turrent_cluster_bomb.png',
    towerSidewinder: 'sprites/turret_sidewinder.png',
    monster1Run: 'sprites/monster_1_run.png',
    monster1Stop: 'sprites/monster_1_stop.png',
    monster1Hurt: 'sprites/monster_1_hurt.png',
    monster2Run: 'sprites/monster_2_run.png',
    monster2Stop: 'sprites/monster_2_stop.png',
    monster2Hurt: 'sprites/monster_2_hurt.png',
    monster3Run: 'sprites/monster_3_run.png',
    monster3Stop: 'sprites/monster_3_stop.png',
    monster3Hurt: 'sprites/monster_3_hurt.png',
    monster4Run: 'sprites/monster_4_run.png',
    monster4Stop: 'sprites/monster_4_stop.png',
    monster4Hurt: 'sprites/monster_4_hurt.png',
} as const;

const SOUND_PATHS = {
    pop: 'audio/pop.mp3',
    owHurt: 'audio/ow_hurt.mp3',
    owDeath: 'audio/ow_death.mp3',
} as const;

const SOUND_KEYS = {
    pop: 'sound-pop',
    owHurt: 'sound-ow-hurt',
    owDeath: 'sound-ow-death',
} as const;

const TERRAIN_TEXTURES: Record<TerrainType, readonly string[]> = {
    grass: [SPRITE_PATHS.grass1, SPRITE_PATHS.grass2, SPRITE_PATHS.grass3, SPRITE_PATHS.grass4, SPRITE_PATHS.grass5],
    tree: [SPRITE_PATHS.tree1, SPRITE_PATHS.tree2],
    tarmac: [SPRITE_PATHS.tarmac1, SPRITE_PATHS.tarmac2, SPRITE_PATHS.tarmac3],
};

const TOWER_TEXTURES: Record<TowerType, string> = {
    easy: SPRITE_PATHS.towerBasic,
    spray: SPRITE_PATHS.towerCluster,
    missile: SPRITE_PATHS.towerSidewinder,
    cluster: SPRITE_PATHS.towerClusterBomb,
};

const ENEMY_TEXTURES = {
    1: { run: SPRITE_PATHS.monster1Run, stop: SPRITE_PATHS.monster1Stop, hurt: SPRITE_PATHS.monster1Hurt },
    2: { run: SPRITE_PATHS.monster2Run, stop: SPRITE_PATHS.monster2Stop, hurt: SPRITE_PATHS.monster2Hurt },
    3: { run: SPRITE_PATHS.monster3Run, stop: SPRITE_PATHS.monster3Stop, hurt: SPRITE_PATHS.monster3Hurt },
    4: { run: SPRITE_PATHS.monster4Run, stop: SPRITE_PATHS.monster4Stop, hurt: SPRITE_PATHS.monster4Hurt },
} as const;

const BUILD_SHORTCUTS: Record<string, BuildDifficultySelection> = {
    '1': 'easy',
    '2': 'medium',
    '3': 'hard',
    '4': 'veryHard',
    '5': 'random',
};

const TOWER_SPRITE_MAX_SIZE = GAME_CONFIG.map.cellSize * 1.2;
const ENEMY_SPRITE_MIN_SIZE = GAME_CONFIG.map.cellSize * 0.9;
const ENEMY_SPRITE_MAX_SIZE = GAME_CONFIG.map.cellSize * 1.28;
const DIFFICULTY_STORAGE_KEY = 'vocab-annihilation:difficulty';

const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
    veryEasy: 'Very easy',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    veryHard: 'Very hard',
};

type EnemyTextureTier = keyof typeof ENEMY_TEXTURES;
type EnemyTextureState = keyof (typeof ENEMY_TEXTURES)[EnemyTextureTier];

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
    private emergencyFlowField!: FlowField;
    private threatCosts!: CostGrid;
    private graphics!: Phaser.GameObjects.Graphics;
    private debugGraphics!: Phaser.GameObjects.Graphics;
    private towerSprites = new Map<number, Phaser.GameObjects.Image>();
    private enemySprites = new Map<number, Phaser.GameObjects.Image>();
    private costTexts: Phaser.GameObjects.Text[] = [];
    private panel!: BottomPanel;
    private spawner!: EnemySpawner;
    private towerSystem = new TowerSystem();
    private projectileSystem = new ProjectileSystem();
    private baseSprite!: Phaser.GameObjects.Image;
    private towers: TowerState[] = [];
    private enemies: EnemyState[] = [];
    private projectiles: ProjectileState[] = [];
    private explosions: ExplosionVisual[] = [];
    private baseHealth = GAME_CONFIG.baseHealth;
    private baseDamageFlashMs = 0;
    private difficulty: GameDifficulty = 'medium';
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

    preload(): void {
        for (const path of Object.values(SPRITE_PATHS)) {
            this.load.image(path, path);
        }
        this.load.audio(SOUND_KEYS.pop, SOUND_PATHS.pop);
        this.load.audio(SOUND_KEYS.owHurt, SOUND_PATHS.owHurt);
        this.load.audio(SOUND_KEYS.owDeath, SOUND_PATHS.owDeath);
    }

    create(): void {
        const seedParam = new URLSearchParams(window.location.search).get('seed');
        const seed = seedParam ? SeededRandom.hash(seedParam) : Date.now() % 1000000000;
        this.difficulty = this.readSavedDifficulty();
        this.generatedMap = generateMap(seed);
        this.rebuildFlowField();
        this.graphics = this.add.graphics().setDepth(3);
        this.debugGraphics = this.add.graphics().setDepth(5);
        this.createMapSprites();
        this.spawner = new EnemySpawner(this.generatedMap.spawns, GAME_CONFIG.map, new SeededRandom(`${seed}:spawns`));
        this.panel = new BottomPanel(new VocabQuestionSystem(new SeededRandom(`${seed}:vocab`)), new SeededRandom(`${seed}:panel`), {
            onBuild: (cell, difficulty) => this.buildTower(cell, difficulty),
            onUpgrade: (tower) => this.upgradeExistingTower(tower),
            onAnswered: (correct) => this.recordAnswer(correct),
            onClose: () => this.clearSelection(),
        });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
        this.registerDebugKeys();
        this.setupSettingsControls();
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
        this.baseDamageFlashMs = Math.max(0, this.baseDamageFlashMs - deltaMs);
        this.enemies.push(...this.spawner.update(deltaMs, this.towers, {
            difficulty: this.difficulty,
            baseHealthPercent: this.baseHealth / GAME_CONFIG.baseHealth,
            activeEnemyCount: this.enemies.length,
        }));
        for (const enemy of this.enemies) {
            enemy.hurtFlashMs = Math.max(0, enemy.hurtFlashMs - deltaMs);
        }

        const enemySurvivors: EnemyState[] = [];
        let baseDamageTaken = 0;
        for (const enemy of this.enemies) {
            const reachedBase = updateEnemy(enemy, deltaMs / 1000, this.flowField, this.emergencyFlowField, this.generatedMap.grid, GAME_CONFIG.map, this.enemies);
            if (reachedBase) {
                const previousHealth = this.baseHealth;
                this.baseHealth = Math.max(0, this.baseHealth - enemy.baseDamage);
                baseDamageTaken += previousHealth - this.baseHealth;
            } else if (enemy.health > 0) {
                enemySurvivors.push(enemy);
            }
        }
        this.enemies = enemySurvivors;
        if (baseDamageTaken > 0) {
            this.flashBaseDamage();
        }

        const towerResult = this.towerSystem.update(deltaMs, this.towers, this.enemies, this.generatedMap.grid, GAME_CONFIG.map, this.flowField);
        this.projectiles.push(...towerResult.projectiles);
        this.playRepeatedSound(SOUND_KEYS.pop, towerResult.shotsFired, 0.18);

        const projectileResult = this.projectileSystem.update(deltaMs, this.projectiles, this.enemies, this.generatedMap.grid, GAME_CONFIG.map);
        this.projectiles = projectileResult.projectiles;
        this.kills += projectileResult.kills;
        this.explosions.push(...projectileResult.explosions);
        this.playRepeatedSound(SOUND_KEYS.owHurt, projectileResult.hurtSounds, 0.2);
        this.playRepeatedSound(SOUND_KEYS.owDeath, projectileResult.deathSounds, 0.28);
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
            this.panel.close();
            this.render();
            return;
        }
        const tower = this.findTowerAt(cell.x, cell.y);
        const pointerPosition = this.getPointerClientPosition(pointer);
        this.selectedCell = cell;
        this.selectedTower = tower;
        if (tower) {
            this.panel.openUpgrade(tower, pointerPosition);
        } else if (this.canBuildOnCell(cell)) {
            this.panel.openBuild(cell, pointerPosition);
        } else {
            this.panel.close();
        }
        this.render();
    }

    private buildTower(cell: GridPoint, difficulty: TowerDifficulty): void {
        if (!this.canBuildOnCell(cell) || this.findTowerAt(cell.x, cell.y)) {
            return;
        }
        this.towers.push(createTower(this.nextTowerId++, cell.x, cell.y, towerTypeForDifficulty(difficulty)));
        this.rebuildFlowField();
    }

    private canBuildOnCell(cell: GridPoint): boolean {
        return this.generatedMap.grid.isBuildable(cell.x, cell.y)
            && !isBaseFootprintCell(this.generatedMap.base, cell, this.generatedMap.grid);
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

    private playRepeatedSound(key: string, count: number, volume: number): void {
        if (count <= 0 || this.sound.locked) {
            return;
        }
        const playCount = Math.min(count, 4);
        for (let index = 0; index < playCount; index += 1) {
            this.sound.play(key, { volume });
        }
    }

    private rebuildFlowField(): void {
        this.threatCosts = calculateTowerThreatCosts(this.generatedMap.grid, this.towers, GAME_CONFIG.map);
        this.flowField = buildFlowField(this.generatedMap.grid, this.generatedMap.base, this.threatCosts);
        this.emergencyFlowField = buildFlowField(this.generatedMap.grid, this.generatedMap.base, createEmptyCostGrid(this.generatedMap.grid));
    }

    private findTowerAt(x: number, y: number): TowerState | undefined {
        return this.towers.find((tower) => tower.gridX === x && tower.gridY === y);
    }

    private clearSelection(): void {
        this.selectedCell = undefined;
        this.selectedTower = undefined;
    }

    private getPointerClientPosition(pointer: Phaser.Input.Pointer): Vec2 {
        const canvas = this.scale.canvas;
        const bounds = canvas.getBoundingClientRect();
        return {
            x: bounds.left + pointer.x * (bounds.width / canvas.width),
            y: bounds.top + pointer.y * (bounds.height / canvas.height),
        };
    }

    private registerDebugKeys(): void {
        const keyboard = this.input.keyboard;
        keyboard?.on('keydown', (event: KeyboardEvent) => {
            const selection = BUILD_SHORTCUTS[event.key];
            if (!selection) {
                return;
            }
            this.panel.setSelectedBuildDifficulty(selection);
            event.preventDefault();
        });
        keyboard?.on('keydown-G', () => { this.debug.grid = !this.debug.grid; });
        keyboard?.on('keydown-R', () => { this.debug.ranges = !this.debug.ranges; });
        keyboard?.on('keydown-F', () => { this.debug.flow = !this.debug.flow; });
        keyboard?.on('keydown-C', () => { this.debug.costs = !this.debug.costs; });
        keyboard?.on('keydown-L', () => { this.debug.los = !this.debug.los; });
    }

    private setupSettingsControls(): void {
        const button = document.querySelector<HTMLButtonElement>('[data-testid="settings-button"]')!;
        const popup = document.querySelector<HTMLElement>('[data-testid="settings-popup"]')!;
        const options = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-difficulty-option]'));
        const closePopup = () => {
            popup.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        };

        button.addEventListener('click', () => {
            const shouldOpen = popup.hidden;
            popup.hidden = !shouldOpen;
            button.setAttribute('aria-expanded', `${shouldOpen}`);
        });
        for (const option of options) {
            option.addEventListener('click', () => {
                const value = option.dataset.difficultyOption;
                if (!value || !isGameDifficulty(value)) {
                    return;
                }
                this.setDifficulty(value);
                closePopup();
            });
        }
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closePopup();
            }
        });
        this.syncSettingsControls();
    }

    private readSavedDifficulty(): GameDifficulty {
        const savedDifficulty = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
        return savedDifficulty && isGameDifficulty(savedDifficulty) ? savedDifficulty : 'medium';
    }

    private setDifficulty(difficulty: GameDifficulty): void {
        this.difficulty = difficulty;
        window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
        this.syncSettingsControls();
    }

    private syncSettingsControls(): void {
        for (const option of document.querySelectorAll<HTMLButtonElement>('[data-difficulty-option]')) {
            const isSelected = option.dataset.difficultyOption === this.difficulty;
            option.setAttribute('aria-pressed', `${isSelected}`);
        }
        const popup = document.querySelector<HTMLElement>('[data-testid="settings-popup"]');
        if (popup) {
            popup.setAttribute('aria-label', `Settings, difficulty ${DIFFICULTY_LABELS[this.difficulty]}`);
        }
    }

    private updateHud(): void {
        const healthPercent = Math.max(0, Math.min(1, this.baseHealth / GAME_CONFIG.baseHealth));
        document.querySelector('[data-stat="health"]')!.textContent = `${Math.ceil(this.baseHealth)}`;
        document.querySelector<HTMLElement>('[data-stat="base-fill"]')!.style.transform = `scaleX(${healthPercent})`;
        document.querySelector<HTMLElement>('[data-stat="base-meter"]')!.setAttribute('aria-valuenow', `${Math.ceil(this.baseHealth)}`);
        document.querySelector('[data-stat="time"]')!.textContent = this.formatTime(this.elapsedMs);
        document.querySelector('[data-stat="kills"]')!.textContent = `${this.kills}`;
        const accuracy = this.answered === 0 ? '0/0' : `${this.correctAnswers}/${this.answered} (${Math.round((this.correctAnswers / this.answered) * 100)}%)`;
        document.querySelector('[data-stat="accuracy"]')!.textContent = accuracy;
    }

    private flashBaseDamage(): void {
        this.baseDamageFlashMs = 360;
        const hud = document.querySelector<HTMLElement>('#hud')!;
        hud.classList.remove('base-hit');
        void hud.offsetWidth;
        hud.classList.add('base-hit');
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
        this.renderBaseDamageFlash();
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
        this.graphics.lineStyle(2, 0x132119, 0.28);
        this.graphics.strokeRect(
            originX + (base.x - 1) * cellSize + 1,
            originY + (base.y - 1) * cellSize + 1,
            cellSize * 3 - 2,
            cellSize * 3 - 2,
        );
    }

    private renderBaseDamageFlash(): void {
        if (this.baseDamageFlashMs <= 0) {
            this.baseSprite.clearTint();
            return;
        }
        const { base } = this.generatedMap;
        const { originX, originY, cellSize } = GAME_CONFIG.map;
        const alpha = Math.max(0, Math.min(1, this.baseDamageFlashMs / 360));
        this.baseSprite.setTint(0xff6b6b);
        this.graphics.fillStyle(0xe85d75, alpha * 0.26);
        this.graphics.fillRect(originX + (base.x - 1) * cellSize, originY + (base.y - 1) * cellSize, cellSize * 3, cellSize * 3);
        this.graphics.lineStyle(4, 0xff2d55, alpha * 0.9);
        this.graphics.strokeRect(originX + (base.x - 1) * cellSize + 2, originY + (base.y - 1) * cellSize + 2, cellSize * 3 - 4, cellSize * 3 - 4);
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
        const activeIds = new Set<number>();
        const { cellSize } = GAME_CONFIG.map;
        for (const tower of this.towers) {
            activeIds.add(tower.id);
            const center = cellCenter({ x: tower.gridX, y: tower.gridY }, GAME_CONFIG.map);
            let sprite = this.towerSprites.get(tower.id);
            if (!sprite) {
                sprite = this.add.image(center.x, center.y, TOWER_TEXTURES[tower.type]).setDepth(2);
                this.towerSprites.set(tower.id, sprite);
            }
            sprite.setTexture(TOWER_TEXTURES[tower.type]);
            sprite.setPosition(center.x, center.y);
            this.setSpriteMaxSize(sprite, TOWER_SPRITE_MAX_SIZE);
            sprite.setAlpha(tower === this.selectedTower ? 1 : 0.96);

            this.graphics.fillStyle(0x101614, 0.9);
            for (let level = 0; level < tower.level; level += 1) {
                this.graphics.fillCircle(center.x - 10 + level * 5, center.y + 18, 2);
            }
        }

        for (const [towerId, sprite] of this.towerSprites) {
            if (!activeIds.has(towerId)) {
                sprite.destroy();
                this.towerSprites.delete(towerId);
            }
        }
    }

    private renderEnemies(): void {
        const activeIds = new Set<number>();
        const { cellSize } = GAME_CONFIG.map;
        for (const enemy of this.enemies) {
            activeIds.add(enemy.id);
            let sprite = this.enemySprites.get(enemy.id);
            if (!sprite) {
                sprite = this.add.image(enemy.x, enemy.y, this.getEnemyTextureKey(enemy));
                this.enemySprites.set(enemy.id, sprite);
            }
            sprite.setTexture(this.getEnemyTextureKey(enemy));
            sprite.setPosition(enemy.x, enemy.y);
            this.setEnemySpriteSize(sprite, this.getEnemySpriteMaxSize(enemy, cellSize));
            sprite.setDepth(2 + enemy.y / 10000);

            const barWidth = enemy.radius * 2.1;
            const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
            this.graphics.fillStyle(0x111611, 0.88);
            this.graphics.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth, 4);
            this.graphics.fillStyle(healthPercent > 0.45 ? 0x66d17a : 0xe85d75, 1);
            this.graphics.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth * healthPercent, 4);
        }

        for (const [enemyId, sprite] of this.enemySprites) {
            if (!activeIds.has(enemyId)) {
                sprite.destroy();
                this.enemySprites.delete(enemyId);
            }
        }
    }

    private setEnemySpriteSize(sprite: Phaser.GameObjects.Image, maxSize: number): void {
        this.setSpriteMaxSize(sprite, maxSize);
    }

    private getEnemySpriteMaxSize(enemy: EnemyState, cellSize: number): number {
        return Math.max(ENEMY_SPRITE_MIN_SIZE, Math.min(ENEMY_SPRITE_MAX_SIZE, enemy.radius * 3.1, cellSize * 1.3));
    }

    private setSpriteMaxSize(sprite: Phaser.GameObjects.Image, maxSize: number): void {
        sprite.setScale(1);
        const scale = maxSize / Math.max(sprite.width, sprite.height, 1);
        sprite.setScale(scale);
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
        const blocked = !this.canBuildOnCell(this.selectedCell) && !this.selectedTower;
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

    private createMapSprites(): void {
        const { grid, base } = this.generatedMap;
        const { originX, originY, cellSize } = GAME_CONFIG.map;

        grid.forEachCell((x, y, terrain) => {
            const textureKey = this.getTerrainTextureKey(terrain, x, y);
            this.add
                .image(originX + x * cellSize + cellSize / 2, originY + y * cellSize + cellSize / 2, textureKey)
                .setDisplaySize(cellSize, cellSize)
                .setDepth(0);
        });

        const baseCenter = cellCenter(base, GAME_CONFIG.map);
        this.baseSprite = this.add.image(baseCenter.x, baseCenter.y, SPRITE_PATHS.base).setDisplaySize(cellSize * 3, cellSize * 3).setDepth(1);
    }

    private getTerrainTextureKey(terrain: TerrainType, x: number, y: number): string {
        const variants = TERRAIN_TEXTURES[terrain];
        const seedHash = (this.generatedMap.seed >>> 0) ^ ((x + 1) * 73856093) ^ ((y + 1) * 19349663);
        return variants[seedHash % variants.length];
    }

    private getEnemyTextureKey(enemy: EnemyState): string {
        const tier = this.getEnemyTextureTier(enemy);
        const state = this.getEnemyTextureState(enemy);
        return ENEMY_TEXTURES[tier][state];
    }

    private getEnemyTextureTier(enemy: EnemyState): EnemyTextureTier {
        const healthScale = enemy.maxHealth / ENEMY_STATS[enemy.type].health;
        if (enemy.type === 'scout') {
            return healthScale >= 2.35 ? 2 : 1;
        }
        if (enemy.type === 'grunt') {
            return healthScale >= 2.1 ? 3 : 2;
        }
        return healthScale >= 1.6 ? 4 : 3;
    }

    private getEnemyTextureState(enemy: EnemyState): EnemyTextureState {
        if (enemy.hurtFlashMs > 0) {
            return 'hurt';
        }
        return enemy.lastMoveSpeed > enemy.speed * 0.12 ? 'run' : 'stop';
    }

    private installBrowserHooks(): void {
        const hooks = {
            getFirstBuildableCell: () => {
                for (let y = 3; y < this.generatedMap.grid.rows; y += 1) {
                    for (let x = 3; x < this.generatedMap.grid.cols; x += 1) {
                        if (this.canBuildOnCell({ x, y }) && !this.findTowerAt(x, y)) {
                            const center = cellCenter({ x, y }, GAME_CONFIG.map);
                            return { x, y, worldX: center.x, worldY: center.y };
                        }
                    }
                }
                return null;
            },
            getTowerCount: () => this.towers.length,
            getTowerTypes: () => this.towers.map((tower) => tower.type),
            getEnemyCount: () => this.enemies.length,
            getEnemySnapshot: () => this.enemies.map((enemy) => ({ id: enemy.id, x: enemy.x, y: enemy.y, health: enemy.health })),
            getBaseHealth: () => this.baseHealth,
            getDifficulty: () => this.difficulty,
            setDifficulty: (difficulty: GameDifficulty) => this.setDifficulty(difficulty),
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
            hurtFlashMs: 0,
            lastProgressDistance: Number.POSITIVE_INFINITY,
            stalledSeconds: 0,
            panicSecondsRemaining: 0,
            panicStartDistance: Number.POSITIVE_INFINITY,
            isStuck: false,
            lastMoveSpeed: 0,
        });
    }
}
