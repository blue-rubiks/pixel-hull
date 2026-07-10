import Phaser from 'phaser';
import { GAME_WIDTH, NOKIA_BG } from '../core/constants.ts';
import { DIFFICULTIES, type Difficulty } from '../core/difficulty.ts';
import { loadSave, persistSave } from '../core/storage.ts';
import { ensurePixelFont, PixelText } from '../ui/font.ts';
import { isMuted, setMuted, sfx } from '../ui/sound.ts';
import type { GameMode } from './GameScene.ts';

const OPTIONS: { label: string; mode: GameMode }[] = [
  { label: '街機', mode: 'arcade' },
  { label: '每日', mode: 'daily' },
];
const DIFF_ROW = OPTIONS.length; // 難度列接在遊戲模式之後（只作用於街機）
const AUDIO_ROW = OPTIONS.length + 1;
const ROW_COUNT = OPTIONS.length + 2; // 可選列總數（含難度列與音效列）
const OPTION_X = Math.floor(GAME_WIDTH / 2 - 13); // 2 字中文寬約 25px，水平置中
const OPTION_Y = 16; // 四列選項的緊湊排版：再上移 2px 才塞得下難度列
const OPTION_GAP = 11; // 中文 12px 高、行距壓到 1px（四列＋紀錄行的極限）
const CURSOR_DY = 3; // 英文 3×5 游標垂直置中對齊中文行（難度／音效列為純英文，剛好同高）

export class MenuScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private cursor!: PixelText;
  private diffLabel!: PixelText;
  private audioLabel!: PixelText;
  private keyC!: Phaser.Input.Keyboard.Key;
  private idx = 0;
  /** 在選單按「分享」時的暫顯提示（分享僅在每日結算可用） */
  private shareHint: PixelText | null = null;

  constructor() {
    super('menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(NOKIA_BG);
    ensurePixelFont(this);
    this.idx = 0;
    this.shareHint = null;

    this.centerText(8, 'PIXEL HULL');

    const save = loadSave();
    setMuted(save.muted); // 啟動時把持久化的靜音設定回填到音訊層

    OPTIONS.forEach((o, i) => new PixelText(this, OPTION_X, OPTION_Y + i * OPTION_GAP, o.label));
    // 難度列與音效列為英文 5px，置中於 12px 列高（與游標同 y）才不會偏上
    this.diffLabel = new PixelText(
      this,
      OPTION_X,
      OPTION_Y + DIFF_ROW * OPTION_GAP + CURSOR_DY,
      this.diffText(save.difficulty),
    );
    this.audioLabel = new PixelText(
      this,
      OPTION_X,
      OPTION_Y + AUDIO_ROW * OPTION_GAP + CURSOR_DY,
      this.audioText(),
    );
    this.cursor = new PixelText(this, OPTION_X - 7, OPTION_Y + CURSOR_DY, '>');

    // 紀錄壓成一行置於下半部；最高(街機)＋連勝(每日)併排，
    // 兩組數字在 126px 寬內安全（三組會溢出，故省略每日「今日」分數）
    const bits: string[] = [];
    if (save.highScore > 0) bits.push(`最高 ${save.highScore}`);
    if (save.daily.streak > 0) bits.push(`連勝 ${save.daily.streak}`);
    if (bits.length) this.centerText(59, bits.join('  '));

    if (!this.input.keyboard) throw new Error('keyboard input unavailable');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyC = this.input.keyboard.addKey('C');

    // 觸控：直接點選項開局
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const idx = Math.floor((p.y - (OPTION_Y - 2)) / OPTION_GAP);
      if (idx >= 0 && idx < ROW_COUNT) this.select(idx);
    });
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.idx = (this.idx + ROW_COUNT - 1) % ROW_COUNT;
      sfx.key();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.idx = (this.idx + 1) % ROW_COUNT;
      sfx.key();
    }
    this.cursor.setY(OPTION_Y + this.idx * OPTION_GAP + CURSOR_DY);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) this.select(this.idx);
    // 分享僅在每日結算可用；選單按下時提示，而不是默默無效
    if (Phaser.Input.Keyboard.JustDown(this.keyC)) this.flashShareHint();
  }

  /** 在標題上方空白處閃一行提示，1.5 秒後消失；重複按下會取代上一則 */
  private flashShareHint(): void {
    this.shareHint?.destroy();
    const hint = this.centerText(2, 'DAILY ONLY');
    this.shareHint = hint;
    this.time.delayedCall(1500, () => {
      if (this.shareHint === hint) this.shareHint = null;
      hint.destroy();
    });
  }

  private start(idx: number): void {
    sfx.key();
    this.scene.start('game', { mode: OPTIONS[idx]!.mode });
  }

  /** 依目前游標列分流：遊戲模式列開局，難度列循環切換，音效列切換靜音 */
  private select(idx: number): void {
    if (idx < OPTIONS.length) this.start(idx);
    else if (idx === DIFF_ROW) this.cycleDifficulty();
    else this.toggleAudio();
  }

  /** 循環切換街機難度（EASY→NORMAL→HARD）並持久化；每日挑戰不受影響 */
  private cycleDifficulty(): void {
    const save = loadSave();
    const next = DIFFICULTIES[(DIFFICULTIES.indexOf(save.difficulty) + 1) % DIFFICULTIES.length]!;
    persistSave({ ...save, difficulty: next });
    this.diffLabel.setText(this.diffText(next));
    sfx.key();
  }

  private diffText(d: Difficulty): string {
    return d.toUpperCase();
  }

  /** 切換全域靜音、持久化、更新顯示（未靜音時順帶嗶一聲回饋） */
  private toggleAudio(): void {
    setMuted(!isMuted());
    persistSave({ ...loadSave(), muted: isMuted() });
    this.audioLabel.setText(this.audioText());
    sfx.key();
  }

  private audioText(): string {
    return isMuted() ? 'SOUND OFF' : 'SOUND ON';
  }

  private centerText(y: number, text: string): PixelText {
    const t = new PixelText(this, 0, y, text);
    t.setX(Math.floor(GAME_WIDTH / 2 - t.textWidth / 2));
    return t;
  }
}
