import Phaser from 'phaser';
import './shell.css';
import { GAME_WIDTH, GAME_HEIGHT, NOKIA_BG } from './core/constants.ts';
import { BootScene } from './scenes/BootScene.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { initShell } from './ui/shell.ts';
import { initJoystick } from './ui/joystick.ts';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: NOKIA_BG,
  pixelArt: true,
  scale: {
    // NONE + 整數倍 zoom（shell.ts 同步），確保像素銳利（見 PLANNING.md §3.2）
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: Phaser.Scale.MAX_ZOOM,
  },
  scene: [BootScene, MenuScene, GameScene],
});

initShell(game);
initJoystick();

// dev-only：給 e2e／除錯腳本存取遊戲實例（production build 會被移除）
if (import.meta.env.DEV) {
  (window as Window & { __game?: Phaser.Game }).__game = game;
}

// PWA：可安裝到手機桌面、離線玩（PLANNING.md §3.6）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
