import Phaser from 'phaser';
import './styles.css';
import { GAME_CONFIG } from './config/gameConfig';
import { GameScene } from './scenes/GameScene';
import { isMobileLayout } from './ui/mobile';

const baseUrl = import.meta.env.BASE_URL;

function clearDevelopmentServiceWorker(): void {
    if (!import.meta.env.DEV || !('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
            registration.unregister();
        });
    }).catch(() => {
        /* Development cleanup failures are non-fatal. */
    });

    if ('caches' in window) {
        window.caches.keys().then((keys) => {
            keys
                .filter((key) => key.startsWith('vocab-annihilation-'))
                .forEach((key) => {
                    window.caches.delete(key);
                });
        }).catch(() => {
            /* Development cleanup failures are non-fatal. */
        });
    }
}

function linkManifest(): void {
    if (document.querySelector('link[rel="manifest"]')) {
        return;
    }
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = `${baseUrl}manifest.webmanifest`;
    document.head.append(link);

    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = `${baseUrl}icons/icon-192.png`;
    document.head.append(appleIcon);
}

function registerServiceWorker(): void {
    // Service worker powers the installable Android PWA; only needed on mobile.
    if (import.meta.env.DEV || !isMobileLayout() || !('serviceWorker' in navigator)) {
        return;
    }
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${baseUrl}sw.js`).catch(() => {
            /* Registration failures are non-fatal; the game still runs online. */
        });
    });
}

clearDevelopmentServiceWorker();
linkManifest();
registerServiceWorker();

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-root',
    width: GAME_CONFIG.canvasWidth,
    height: GAME_CONFIG.canvasHeight,
    backgroundColor: '#132119',
    render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: false,
        mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        autoRound: true,
    },
    scene: [GameScene],
};

new Phaser.Game(config);
