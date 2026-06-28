import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, NOKIA_BG, NOKIA_FG } from '../core/constants.ts';
import { SHIP_SHAPE, shapeToPixels } from '../core/hull.ts';
import { ensurePixelFont, PixelText } from '../ui/font.ts';
import { ensureSprites } from '../ui/sprites.ts';

/** 開機動畫：小船飛入、標題亮起，自動進選單（按鍵可跳過） */
export class BootScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('boot');
  }

  create(): void {
    this.started = false;
    this.cameras.main.setBackgroundColor(NOKIA_BG);
    ensurePixelFont(this);
    ensureSprites(this);

    const ship = this.add.container(-10, GAME_HEIGHT / 2 - 2);
    for (const p of shapeToPixels(SHIP_SHAPE)) {
      ship.add(new Phaser.GameObjects.Rectangle(this, p.x, p.y, 1, 1, NOKIA_FG).setOrigin(0, 0));
    }

    const title = new PixelText(this, 0, 36, 'PIXEL HULL');
    title.setX(Math.floor(GAME_WIDTH / 2 - title.textWidth / 2));
    title.setVisible(false);

    this.tweens.add({
      targets: ship,
      x: Math.floor(GAME_WIDTH / 2 - 3),
      y: 50,
      duration: 900,
      onComplete: () => {
        title.setVisible(true);
        // LCD 風格硬切閃爍（不用 alpha 漸變，維持嚴格雙色）
        this.time.addEvent({
          delay: 300,
          repeat: 3,
          callback: () => title.setVisible(!title.visible),
        });
      },
    });

    this.time.delayedCall(2400, () => this.startMenu());
    this.input.keyboard?.once('keydown', () => this.startMenu());
    this.input.once('pointerdown', () => this.startMenu());
  }

  private startMenu(): void {
    if (this.started) return;
    this.started = true;
    this.scene.start('menu');
  }
}
