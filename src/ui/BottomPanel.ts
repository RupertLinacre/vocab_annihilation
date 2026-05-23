import { DIFFICULTY_LABELS, TOWER_LABELS } from '../config/gameConfig';
import { SeededRandom } from '../core/SeededRandom';
import { canUpgradeTower, getUpgradeQuestionDifficulty } from '../entities/Tower';
import { getTowerStats } from '../pathfinding/ThreatMap';
import { VocabQuestionSystem } from '../systems/VocabQuestionSystem';
import type { GridPoint, TowerDifficulty, TowerState, Vec2, VocabQuestion } from '../types';

const BUILD_DIFFICULTIES: TowerDifficulty[] = ['easy', 'medium', 'hard', 'veryHard'];
const BUILD_SELECTIONS = [...BUILD_DIFFICULTIES, 'random'] as const;
const BUILD_MENU_PADDING = 12;
const BUILD_MENU_OFFSET = 14;

export type BuildDifficultySelection = (typeof BUILD_SELECTIONS)[number];

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
    private readonly body = document.querySelector<HTMLElement>('[data-panel-body]')!;
    private readonly toggleButton = document.querySelector<HTMLButtonElement>('[data-panel-toggle]')!;
    private readonly buildMenu: HTMLElement;
    private closeTimeoutId: number | undefined;
    private popupAnchor: Vec2 | undefined;
    private currentQuestion: VocabQuestion | undefined;
    private pendingAction: PendingAction | undefined;
    private selectedBuildDifficulty: BuildDifficultySelection = 'easy';
    private panelExpanded = true;

    constructor(private readonly vocab: VocabQuestionSystem, private readonly rng: SeededRandom, private readonly callbacks: BottomPanelCallbacks) {
        this.buildMenu = document.createElement('section');
        this.buildMenu.className = 'build-popup';
        this.buildMenu.dataset.testid = 'build-popup';
        this.buildMenu.hidden = true;
        this.frame.append(this.buildMenu);
        this.toggleButton.addEventListener('click', () => this.setExpanded(!this.panelExpanded));
        this.renderDifficultySelector();
        this.setExpanded(true);
    }

    openBuild(cell: GridPoint, anchor: Vec2): void {
        this.clearPendingClose();
        this.popupAnchor = anchor;
        this.showQuestion({ kind: 'build', cell, difficulty: this.resolveBuildDifficulty() });
    }

    openUpgrade(tower: TowerState, anchor: Vec2): void {
        this.clearPendingClose();
        this.popupAnchor = anchor;
        if (!canUpgradeTower(tower)) {
            const stats = getTowerStats(tower);
            this.showMessagePopup(
                TOWER_LABELS[tower.type],
                `Level ${tower.level} tower`,
                `Range ${Math.round(stats.range)} px. Fire interval ${Math.round(stats.cooldownMs)} ms.`,
                'Maximum level reached.',
            );
            return;
        }

        const nextLevel = tower.level + 1;
        this.showQuestion({ kind: 'upgrade', tower, difficulty: getUpgradeQuestionDifficulty(nextLevel) });
    }

    close(): void {
        this.clearPendingClose();
        this.hideBuildMenu();
        this.popupAnchor = undefined;
        this.currentQuestion = undefined;
        this.pendingAction = undefined;
        this.callbacks.onClose();
    }

    setSelectedBuildDifficulty(selection: BuildDifficultySelection): void {
        this.selectedBuildDifficulty = selection;
        this.renderDifficultySelector();
    }

    private showQuestion(action: PendingAction): void {
        this.clearPendingClose();
        this.hideBuildMenu();
        this.pendingAction = action;
        this.currentQuestion = this.vocab.createQuestion(action.difficulty);
        this.showAnswerPopup();
    }

    private answer(choice: string): void {
        if (!this.currentQuestion || !this.pendingAction) {
            return;
        }

        const correct = choice === this.currentQuestion.correctWord;
        this.callbacks.onAnswered(correct);
        if (correct) {
            this.buildMenu.append(this.createParagraph('feedback good', 'Correct'));
            this.buildMenu.style.pointerEvents = 'none';
            if (this.pendingAction.kind === 'build') {
                this.callbacks.onBuild(this.pendingAction.cell, this.pendingAction.difficulty);
            } else {
                this.callbacks.onUpgrade(this.pendingAction.tower);
            }
            this.clearPendingClose();
            this.closeTimeoutId = window.setTimeout(() => this.close(), 220);
            return;
        }

        const action = this.pendingAction;
        this.hideBuildMenu();
        this.buildMenu.append(this.createParagraph('feedback bad', `Wrong. Correct answer: ${this.currentQuestion.correctWord}.`));
        const retry = this.createButton('primary-button', 'Try another question', 'retry-question');
        retry.addEventListener('click', () => this.showQuestion(action));
        this.buildMenu.append(retry);
        this.buildMenu.hidden = false;
        this.buildMenu.classList.add('is-open');
        if (this.popupAnchor) {
            this.positionBuildMenu(this.popupAnchor);
        }
    }

    private hideBuildMenu(): void {
        this.buildMenu.classList.remove('is-open');
        this.buildMenu.hidden = true;
        this.buildMenu.innerHTML = '';
        this.buildMenu.style.left = '';
        this.buildMenu.style.top = '';
        this.buildMenu.style.pointerEvents = '';
    }

    private showAnswerPopup(): void {
        if (!this.currentQuestion || !this.popupAnchor) {
            return;
        }

        const header = this.createDiv('build-popup-header');
        const heading = this.createDiv('build-popup-head');
        heading.append(this.createParagraph('panel-kicker build-popup-kicker', DIFFICULTY_LABELS[this.currentQuestion.difficulty]));

        const closeButton = this.createButton('icon-button build-popup-close', '×', 'answer-popup-close');
        closeButton.setAttribute('aria-label', 'Close answers');
        closeButton.addEventListener('click', () => this.close());
        header.append(heading, closeButton);

        const definition = this.createParagraph('definition popup-definition', this.currentQuestion.definition);
        const row = this.createDiv('build-popup-actions answer-popup-actions');
        this.currentQuestion.choices.forEach((choice) => {
            const button = this.createButton('choice-button', choice, 'answer-button');
            button.dataset.correct = String(choice === this.currentQuestion?.correctWord);
            button.addEventListener('click', () => this.answer(choice));
            row.append(button);
        });

        this.buildMenu.append(header, definition, row);
        this.buildMenu.hidden = false;
        this.buildMenu.classList.add('is-open');
        this.positionBuildMenu(this.popupAnchor);
    }

    private showMessagePopup(kicker: string, titleText: string, detail: string, message: string): void {
        if (!this.popupAnchor) {
            return;
        }

        this.hideBuildMenu();

        const header = this.createDiv('build-popup-header');
        const heading = this.createDiv('build-popup-head');
        heading.append(this.createParagraph('panel-kicker build-popup-kicker', kicker));
        const title = document.createElement('h2');
        title.textContent = titleText;
        heading.append(title);

        const closeButton = this.createButton('icon-button build-popup-close', '×', 'message-popup-close');
        closeButton.setAttribute('aria-label', 'Close details');
        closeButton.addEventListener('click', () => this.close());
        header.append(heading, closeButton);

        this.buildMenu.append(
            header,
            this.createParagraph('meta-line', detail),
            this.createParagraph('feedback good', message),
        );
        this.buildMenu.hidden = false;
        this.buildMenu.classList.add('is-open');
        this.positionBuildMenu(this.popupAnchor);
    }

    private renderDifficultySelector(): void {
        this.body.innerHTML = '';
        const row = this.createDiv('button-row difficulty-selector-row');
        BUILD_SELECTIONS.forEach((selection) => {
            const isSelected = selection === this.selectedBuildDifficulty;
            const label = selection === 'random' ? 'Random' : DIFFICULTY_LABELS[selection];
            const button = this.createButton(
                `difficulty-button difficulty-selector-button${isSelected ? ' is-selected' : ''}`,
                label,
                `select-${selection}`,
            );
            button.setAttribute('aria-pressed', String(isSelected));
            button.addEventListener('click', () => this.setSelectedBuildDifficulty(selection));
            row.append(button);
        });
        this.body.append(row);
    }

    private resolveBuildDifficulty(): TowerDifficulty {
        return this.selectedBuildDifficulty === 'random'
            ? this.rng.choice(BUILD_DIFFICULTIES)
            : this.selectedBuildDifficulty;
    }

    private setExpanded(expanded: boolean): void {
        this.panelExpanded = expanded;
        this.panel.classList.toggle('is-open', expanded);
        this.toggleButton.textContent = expanded ? '↓' : '↑';
        this.toggleButton.setAttribute('aria-expanded', String(expanded));
        this.toggleButton.setAttribute('aria-label', expanded ? 'Collapse difficulty panel' : 'Expand difficulty panel');
    }

    private clearPendingClose(): void {
        if (this.closeTimeoutId === undefined) {
            return;
        }
        window.clearTimeout(this.closeTimeoutId);
        this.closeTimeoutId = undefined;
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