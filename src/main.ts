import Phaser from 'phaser';
import './styles.css';
import { GAME_CONFIG } from './config/gameConfig';
import { GameScene } from './scenes/GameScene';

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
