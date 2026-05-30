/* Mobile (landscape, touch) layout for the Vocab Annihilation PWA.
 * Desktop is left completely untouched: none of this runs unless the device
 * is detected as a coarse-pointer touch device. */

let cachedIsMobile: boolean | undefined;

export function isMobileLayout(): boolean {
    if (cachedIsMobile !== undefined) {
        return cachedIsMobile;
    }
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        cachedIsMobile = false;
        return cachedIsMobile;
    }
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const noHover = window.matchMedia?.('(hover: none)').matches ?? false;
    const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    cachedIsMobile = hasTouch && (coarsePointer || noHover);
    return cachedIsMobile;
}

/**
 * Reorganises the existing DOM into a landscape mobile layout: the Phaser map
 * fills the left of the screen and a single right-hand info panel hosts the HUD,
 * status messages, controls and the contextual question/answer panel. The tower
 * picker becomes a drawer that slides out from the right edge.
 */
export class MobileLayout {
    private readonly frame = document.querySelector<HTMLElement>('#game-frame')!;
    private readonly sidePanel: HTMLElement;
    private readonly infoHost: HTMLElement;
    private readonly drawerBackdrop: HTMLElement;
    private readonly towersButton: HTMLButtonElement;

    constructor() {
        document.documentElement.classList.add('is-mobile');

        this.sidePanel = document.createElement('aside');
        this.sidePanel.id = 'side-panel';
        this.sidePanel.className = 'side-panel';
        this.sidePanel.setAttribute('aria-label', 'Game panel');

        const controlsSlot = document.createElement('div');
        controlsSlot.className = 'side-controls';

        const hudSlot = document.createElement('div');
        hudSlot.className = 'side-hud';

        this.infoHost = document.createElement('div');
        this.infoHost.className = 'side-info';
        this.infoHost.dataset.sideInfo = '';

        this.towersButton = document.createElement('button');
        this.towersButton.type = 'button';
        this.towersButton.className = 'side-towers-button';
        this.towersButton.dataset.testid = 'towers-launch';
        this.towersButton.textContent = 'Towers';
        this.towersButton.setAttribute('aria-expanded', 'false');

        this.sidePanel.append(controlsSlot, hudSlot, this.infoHost, this.towersButton);
        this.frame.append(this.sidePanel);

        // Relocate existing controls/HUD/status into the side panel.
        const controls = document.querySelector<HTMLElement>('#topbar-controls');
        if (controls) {
            controlsSlot.append(controls);
        }
        const hud = document.querySelector<HTMLElement>('#hud');
        if (hud) {
            hudSlot.append(hud);
        }
        const status = document.querySelector<HTMLElement>('[data-testid="game-status-message"]');
        if (status) {
            this.infoHost.append(status);
        }

        // Backdrop closes the tower drawer when tapped.
        this.drawerBackdrop = document.createElement('div');
        this.drawerBackdrop.className = 'drawer-backdrop';
        this.drawerBackdrop.hidden = true;
        this.frame.append(this.drawerBackdrop);

        this.installOrientationWatch();
    }

    getInfoHost(): HTMLElement {
        return this.infoHost;
    }

    /** Wires the Towers launcher + backdrop to the constructed BottomPanel. */
    bindDrawer(controls: {
        toggle: () => void;
        close: () => void;
        isOpen: () => boolean;
        onOpenChange: (listener: (open: boolean) => void) => void;
    }): void {
        this.towersButton.addEventListener('click', () => controls.toggle());
        this.drawerBackdrop.addEventListener('click', () => controls.close());
        controls.onOpenChange((open) => {
            this.towersButton.setAttribute('aria-expanded', String(open));
            this.towersButton.classList.toggle('is-active', open);
            this.drawerBackdrop.hidden = !open;
        });
    }

    setQuestionActive(active: boolean): void {
        document.documentElement.classList.toggle('is-question-active', active);
    }

    private installOrientationWatch(): void {
        const update = () => {
            const portrait = window.matchMedia('(orientation: portrait)').matches;
            document.documentElement.classList.toggle('is-portrait', portrait);
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
    }
}
