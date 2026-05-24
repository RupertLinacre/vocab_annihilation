import { expect, test, type Page } from '@playwright/test';

interface BuildableCell {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
}

declare global {
    interface Window {
        vocabAnnihilation?: {
            getFirstBuildableCell: () => BuildableCell | null;
            getTowerCount: () => number;
            getTowerTypes: () => string[];
            getEnemyCount: () => number;
            getEnemySnapshot: () => { id: number; x: number; y: number; health: number }[];
            getBaseHealth: () => number;
            getDifficulty: () => string;
            setDifficulty: (difficulty: 'veryEasy' | 'easy' | 'medium' | 'hard' | 'veryHard') => void;
            spawnEnemyNearBase: () => void;
        };
    }
}

async function clickGamePoint(page: Page, worldX: number, worldY: number): Promise<void> {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) {
        throw new Error('Canvas was not visible.');
    }
    const size = await canvas.evaluate((element) => ({ width: (element as HTMLCanvasElement).width, height: (element as HTMLCanvasElement).height }));
    await page.mouse.click(box.x + worldX * (box.width / size.width), box.y + worldY * (box.height / size.height));
}

test('vocabulary tower defence MVP is playable in the browser', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/?seed=e2e');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('[data-stat="health"]')).toHaveText(/\d+/);
    await expect(page.locator('[data-stat="base-meter"]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(window.vocabAnnihilation))).toBe(true);

    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-popup')).toBeVisible();
    await page.getByTestId('difficulty-hard').click();
    await expect.poll(() => page.evaluate(() => window.vocabAnnihilation!.getDifficulty())).toBe('hard');
    await expect(page.getByTestId('settings-popup')).toBeHidden();

    const screenshot = await page.locator('canvas').screenshot();
    expect(screenshot.byteLength).toBeGreaterThan(1000);

    await expect(page.locator('[data-testid="bottom-panel"]')).toHaveClass(/is-open/);
    await page.getByTestId('panel-toggle').click();
    await expect(page.locator('[data-testid="bottom-panel"]')).not.toHaveClass(/is-open/);
    await page.getByTestId('panel-toggle').click();
    await expect(page.locator('[data-testid="bottom-panel"]')).toHaveClass(/is-open/);

    for (const [key, testId] of [['1', 'select-easy'], ['2', 'select-medium'], ['3', 'select-hard'], ['4', 'select-veryHard'], ['5', 'select-random']] as const) {
        await page.keyboard.press(key);
        await expect(page.getByTestId(testId)).toHaveAttribute('aria-pressed', 'true');
    }

    await page.keyboard.press('3');

    const buildable = await page.evaluate(() => window.vocabAnnihilation!.getFirstBuildableCell());
    expect(buildable).not.toBeNull();
    await clickGamePoint(page, buildable!.worldX, buildable!.worldY);
    await expect(page.getByTestId('build-popup')).toBeVisible();
    await expect(page.locator('[data-testid="build-popup"] .definition')).toBeVisible();
    await expect(page.getByText('Pick the word')).toHaveCount(0);
    await page.locator('[data-testid="answer-button"][data-correct="true"]').click();
    await expect.poll(() => page.evaluate(() => window.vocabAnnihilation!.getTowerCount())).toBe(1);
    await expect.poll(() => page.evaluate(() => window.vocabAnnihilation!.getTowerTypes())).toEqual(['missile']);

    const secondBuildable = await page.evaluate(() => window.vocabAnnihilation!.getFirstBuildableCell());
    expect(secondBuildable).not.toBeNull();
    await clickGamePoint(page, secondBuildable!.worldX, secondBuildable!.worldY);
    await expect(page.getByTestId('build-popup')).toBeVisible();
    await expect(page.locator('[data-testid="answer-button"]')).toHaveCount(3);
    await page.locator('[data-testid="answer-button"][data-correct="true"]').click();
    await expect.poll(() => page.evaluate(() => window.vocabAnnihilation!.getTowerTypes())).toEqual(['missile', 'missile']);

    await expect.poll(() => page.evaluate(() => window.vocabAnnihilation!.getEnemyCount())).toBeGreaterThan(0);
    const firstEnemyPosition = await page.evaluate(() => window.vocabAnnihilation!.getEnemySnapshot()[0]);
    await expect.poll(async () => {
        const enemy = await page.evaluate((id) => window.vocabAnnihilation!.getEnemySnapshot().find((item) => item.id === id), firstEnemyPosition.id);
        if (!enemy) {
            return true;
        }
        return Math.hypot(enemy.x - firstEnemyPosition.x, enemy.y - firstEnemyPosition.y) > 2;
    }).toBe(true);

    const healthBefore = await page.evaluate(() => window.vocabAnnihilation!.getBaseHealth());
    await page.evaluate(() => window.vocabAnnihilation!.spawnEnemyNearBase());
    await expect.poll(() => page.evaluate(() => window.vocabAnnihilation!.getBaseHealth())).toBeLessThan(healthBefore);
    await expect(page.locator('#hud')).toHaveClass(/base-hit/);
    expect(errors).toEqual([]);
});
