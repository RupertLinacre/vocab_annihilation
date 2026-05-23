import { DIFFICULTY_LABELS, TOWER_LABELS } from '../config/gameConfig';
import type { GridPoint, TowerDifficulty, TowerState, Vec2, VocabQuestion } from '../types';
import { getTowerStats } from '../pathfinding/ThreatMap';
import { canUpgradeTower, getUpgradeQuestionDifficulty } from '../entities/Tower';
import { VocabQuestionSystem } from '../systems/VocabQuestionSystem';

const BUILD_DIFFICULTIES: TowerDifficulty[] = ['easy', 'medium', 'hard', 'veryHard'];
const BUILD_MENU_PADDING = 12;
const BUILD_MENU_OFFSET = 14;

interface BottomPanelCallbacks {
    onBuild: (cell: GridPoint, difficulty: TowerDifficulty) => void;
    onUpgrade: (tower: TowerState) => void;
    onAnswered: (correct: boolean) => void;
    onClose: () => void;
}

type PendingAction =
    | { kind: 'build'; cell: GridPoint; difficulty: TowerDifficulty }
    | { kind: 'upgrade'; tower: TowerState; difficulty: TowerDifficulty };

export class BottomPanel {
    private readonly frame = document.querySelector<HTMLElement>('#game-frame')!;
    private readonly panel = document.querySelector<HTMLElement>('[data-testid="bottom-panel"]')!;
    private readonly kicker = document.querySelector<HTMLElement>('[data-panel-kicker]')!;
    private readonly title = document.querySelector<HTMLElement>('[data-panel-title]')!;
    private readonly body = document.querySelector<HTMLElement>('[data-panel-body]')!;
    private readonly closeButton = document.querySelector<HTMLButtonElement>('[data-panel-close]')!;
    private readonly buildMenu: HTMLElement;
    private currentQuestion: VocabQuestion | undefined;
    private pendingAction: PendingAction | undefined;

    constructor(private readonly vocab: VocabQuestionSystem, private readonly callbacks: BottomPanelCallbacks) {
        this.buildMenu = document.createElement('section');
        this.buildMenu.className = 'build-popup';
        this.buildMenu.dataset.testid = 'build-popup';
        this.buildMenu.hidden = true;
        this.frame.append(this.buildMenu);
        this.closeButton.addEventListener('click', () => this.close());
        this.close();
    }

    openBuild(cell: GridPoint, anchor: Vec2): void {
        this.resetPanel();
        this.hideBuildMenu();

        const header = this.createDiv('build-popup-header');
        const heading = this.createDiv('build-popup-head');
        heading.append(this.createParagraph('panel-kicker build-popup-kicker', `Cell ${cell.x + 1}, ${cell.y + 1}`));
        const title = document.createElement('h2');
        title.textContent = 'Build tower';
        heading.append(title);

        const closeButton = this.createButton('icon-button build-popup-close', '×', 'build-popup-close');
        closeButton.setAttribute('aria-label', 'Close build menu');
        closeButton.addEventListener('click', () => this.close());
        header.append(heading, closeButton);

        const meta = this.createParagraph('meta-line', 'Pick a difficulty close to the square, then answer its vocabulary question.');
        const row = this.createDiv('build-popup-actions');
        BUILD_DIFFICULTIES.forEach((difficulty) => {
            const button = this.createButton('difficulty-button', DIFFICULTY_LABELS[difficulty], `build-${difficulty}`);
            button.addEventListener('click', () => this.showQuestion({ kind: 'build', cell, difficulty }));
            row.append(button);
        });

        this.buildMenu.append(header, meta, row);
        this.buildMenu.hidden = false;
        this.buildMenu.classList.add('is-open');
        this.positionBuildMenu(anchor);
    }

    openUpgrade(tower: TowerState): void {
        this.hideBuildMenu();
        this.panel.classList.add('is-open');
        this.currentQuestion = undefined;
        this.pendingAction = undefined;
        const stats = getTowerStats(tower);
        this.kicker.textContent = TOWER_LABELS[tower.type];
        this.title.textContent = `Level ${tower.level} tower`;
        this.body.innerHTML = '';
        this.body.append(this.createParagraph('meta-line', `Range ${Math.round(stats.range)} px. Fire interval ${Math.round(stats.cooldownMs)} ms.`));
        if (!canUpgradeTower(tower)) {
            this.body.append(this.createParagraph('feedback good', 'Maximum level reached.'));
            return;
        }
        const nextLevel = tower.level + 1;
        const difficulty = getUpgradeQuestionDifficulty(nextLevel);
        const button = this.createButton('primary-button', `Upgrade to level ${nextLevel}: ${DIFFICULTY_LABELS[difficulty]} question`, 'upgrade-button');
        button.addEventListener('click', () => this.showQuestion({ kind: 'upgrade', tower, difficulty }));
        this.body.append(button);
    }

    close(): void {
        this.resetPanel();
        this.hideBuildMenu();
        this.callbacks.onClose();
    }

    private showQuestion(action: PendingAction): void {
        this.hideBuildMenu();
        this.panel.classList.add('is-open');
        this.pendingAction = action;
        this.currentQuestion = this.vocab.createQuestion(action.difficulty);
        this.kicker.textContent = DIFFICULTY_LABELS[action.difficulty];
        this.title.textContent = action.kind === 'build' ? 'Choose the word' : `Upgrade question`;
        this.body.innerHTML = '';
        const definition = this.createParagraph('definition', this.currentQuestion.definition);
        const answerGrid = this.createDiv('answer-grid');
        this.currentQuestion.choices.forEach((choice) => {
            const button = this.createButton('choice-button', choice, 'answer-button');
            button.dataset.correct = String(choice === this.currentQuestion?.correctWord);
            button.addEventListener('click', () => this.answer(choice));
            answerGrid.append(button);
        });
        this.body.append(definition, answerGrid, this.createParagraph('feedback', ''));
    }

    private answer(choice: string): void {
        if (!this.currentQuestion || !this.pendingAction) {
            return;
        }
        const correct = choice === this.currentQuestion.correctWord;
        this.callbacks.onAnswered(correct);
        if (correct) {
            const feedback = this.createParagraph('feedback good', 'Correct');
            this.body.append(feedback);
            if (this.pendingAction.kind === 'build') {
                this.callbacks.onBuild(this.pendingAction.cell, this.pendingAction.difficulty);
            } else {
                this.callbacks.onUpgrade(this.pendingAction.tower);
            }
            window.setTimeout(() => this.close(), 220);
            return;
        }

        const action = this.pendingAction;
        this.body.innerHTML = '';
        this.body.append(this.createParagraph('feedback bad', `Wrong. Correct answer: ${this.currentQuestion.correctWord}.`));
        const retry = this.createButton('primary-button', 'Try another question', 'retry-question');
        retry.addEventListener('click', () => this.showQuestion(action));
        this.body.append(retry);
    }

    private resetPanel(): void {
        this.panel.classList.remove('is-open');
        this.kicker.textContent = 'Ready';
        this.title.textContent = 'Select a buildable square';
        this.body.innerHTML = '';
        this.currentQuestion = undefined;
        this.pendingAction = undefined;
    }

    private hideBuildMenu(): void {
        this.buildMenu.classList.remove('is-open');
        this.buildMenu.hidden = true;
        this.buildMenu.innerHTML = '';
        this.buildMenu.style.left = '';
        this.buildMenu.style.top = '';
    }

    private positionBuildMenu(anchor: Vec2): void {
        const frameBounds = this.frame.getBoundingClientRect();
        const menuBounds = this.buildMenu.getBoundingClientRect();
        const relativeX = anchor.x - frameBounds.left;
        const relativeY = anchor.y - frameBounds.top;
        const maxLeft = Math.max(BUILD_MENU_PADDING, frameBounds.width - menuBounds.width - BUILD_MENU_PADDING);
        const maxTop = Math.max(BUILD_MENU_PADDING, frameBounds.height - menuBounds.height - BUILD_MENU_PADDING);
        const left = Math.max(BUILD_MENU_PADDING, Math.min(relativeX + BUILD_MENU_OFFSET, maxLeft));
        const abovePointer = relativeY - menuBounds.height - BUILD_MENU_OFFSET;
        const belowPointer = relativeY + BUILD_MENU_OFFSET;
        const top = abovePointer >= BUILD_MENU_PADDING
            ? abovePointer
            : Math.min(belowPointer, maxTop);

        this.buildMenu.style.left = `${left}px`;
        this.buildMenu.style.top = `${Math.max(BUILD_MENU_PADDING, top)}px`;
    }

    private createDiv(className: string): HTMLDivElement {
        const div = document.createElement('div');
        div.className = className;
        return div;
    }

    private createParagraph(className: string, text: string): HTMLParagraphElement {
        const paragraph = document.createElement('p');
        paragraph.className = className;
        paragraph.textContent = text;
        return paragraph;
    }

    private createButton(className: string, text: string, testId: string): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = text;
        button.dataset.testid = testId;
        return button;
    }
}