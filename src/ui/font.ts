import Phaser from 'phaser';
import { NOKIA_FG_CSS } from '../core/constants.ts';

/**
 * 自繪 3×5 點陣字型（雙色畫風、不用外部字型檔）。
 * 第一次使用時把所有字元畫進一張 canvas texture，每個字元一個 frame。
 */

const GLYPH_W = 3;
const GLYPH_H = 5;

// 中文點陣字寬高（與 3×5 英文共存於同一張 texture）
const CJK_W = 12;
const CJK_H = 12;

const GLYPHS: Record<string, readonly [string, string, string, string, string]> = {
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  C: ['.XX', 'X..', 'X..', 'X..', '.XX'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
  G: ['.XX', 'X..', 'X.X', 'X.X', '.XX'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..X', '..X', '..X', 'X.X', '.X.'],
  K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
  L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  M: ['X.X', 'XXX', 'X.X', 'X.X', 'X.X'],
  N: ['XX.', 'X.X', 'X.X', 'X.X', 'X.X'],
  O: ['.X.', 'X.X', 'X.X', 'X.X', '.X.'],
  P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
  Q: ['XX.', 'X.X', 'X.X', 'XX.', '..X'],
  R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  S: ['.XX', 'X..', '.X.', '..X', 'XX.'],
  T: ['XXX', '.X.', '.X.', '.X.', '.X.'],
  U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  V: ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  W: ['X.X', 'X.X', 'X.X', 'XXX', 'X.X'],
  X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
  Y: ['X.X', 'X.X', '.X.', '.X.', '.X.'],
  Z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
  '0': ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  '2': ['XX.', '..X', '.X.', 'X..', 'XXX'],
  '3': ['XXX', '..X', '.XX', '..X', 'XXX'],
  '4': ['X.X', 'X.X', 'XXX', '..X', '..X'],
  '5': ['XXX', 'X..', 'XX.', '..X', 'XX.'],
  '6': ['X..', 'X..', 'XXX', 'X.X', 'XXX'],
  '7': ['XXX', '..X', '.X.', '.X.', '.X.'],
  '8': ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  '9': ['XXX', 'X.X', 'XXX', '..X', '..X'],
  '.': ['...', '...', '...', '...', '.X.'],
  '-': ['...', '...', 'XXX', '...', '...'],
  ':': ['...', '.X.', '...', '.X.', '...'],
  '!': ['.X.', '.X.', '.X.', '...', '.X.'],
  '/': ['..X', '..X', '.X.', 'X..', 'X..'],
  '+': ['...', '.X.', 'XXX', '.X.', '...'],
  '?': ['XX.', '..X', '.X.', '...', '.X.'],
  '>': ['X..', '.X.', '..X', '.X.', 'X..'],
};

/**
 * 12×12 中文點陣字（開發期由文泉驛正黑渲染→unsharp→二值化烘焙，執行期零外部字型）。
 * 只收錄遊戲實際用到的字；上下各留 1px 空列當作天然行距。
 * 詞彙刻意挑低筆畫字，以在 126×72 低解析度下維持可讀性。
 */
// prettier-ignore
const CJK_GLYPHS: Record<string, readonly string[]> = {
  街: ['............', '...X.XX.....', '..X..XX.XXX.', '.XX..XX.....', '..XX.XX.XXX.', '..X..XX..X..', '.XX..XX..X..', '..X..XX..X..', '..X..XX..X..', '..X.XX...X..', '..X.....XX..', '............'],
  機: ['............', '..X..X.XXX..', '..X..XXXXX..', '.XXXXX.XXX..', '..X..XXXXXX.', '..XX...XXX..', '.XX..X.XXX..', '.XX..X.X.X..', '..X..XX.X...', '..X.XX.XXXX.', '..X...X..XX.', '............'],
  每: ['............', '...XX.......', '...XXXXXXX..', '..XX...XX...', '.X.X.X..X...', '...X.XX.X...', '.XXXXXXXXXX.', '..XX.X..X...', '..XXXXXXXX..', '.......XX...', '......XX....', '............'],
  日: ['............', '..XXXXXXX...', '..XX....XX..', '..X.....XX..', '..X.....XX..', '..XXXXXXXX..', '..X.....XX..', '..X.....XX..', '..XXXXXXXX..', '..XX.XX.XX..', '..X.....XX..', '............'],
  最: ['............', '..XXXXXXX...', '..XX....X...', '..XX....X...', '...X....X...', '.XXX.X.XXX..', '..XX.X.XXX..', '..XXXX.XXX..', '..XX.X.XX...', '.XXX.XXXXX..', '.....XX..XX.', '............'],
  高: ['............', '.XXXXXX.XX..', '.......X....', '...XX..X....', '...XX..X....', '............', '.XX......X..', '.XX.X.XX.X..', '.XXXX..X.X..', '.XX......X..', '.XX.....XX..', '............'],
  今: ['............', '.....XX.....', '.....XX.....', '....X.XX....', '...XX..XX...', '.XXX.X..XXX.', '.XX...X.....', '...XXXXXX...', '.......X....', '......XX....', '......X.....', '............'],
  連: ['............', '......XX....', '..X.XXXXXX..', '.....XXXX...', '.XX.XXXXXX..', '...X.XXXXX..', '...X.XXXXX..', '...X..XX....', '..XX..XX....', '.XXXXXXXXX..', '.....XXXXX..', '............'],
  勝: ['............', '..XXX..X....', '..X.XXXXXX..', '..XXX.XXXX..', '..X.X.XX....', '..X.X.X.XX..', '..XXXXXX.XX.', '..X.X.XXXX..', '..X.X.X..X..', '.XX.XXX.XX..', '...X.X..X...', '............'],
  必: ['............', '.....X..X...', '....XXX.X...', '....X..XX...', '..X.X..X....', '..X.X.XX.X..', '..X.XXX..XX.', '.XX.XX....X.', '...XX...X...', '..XXX...X...', '.XX.XXXXX...', '............'],
  殺: ['............', '.XX.X..XX...', '..XXX.X.XX..', '..XXX.X.XX..', '...X..X..XX.', '..XX.XXXXX..', '..XX..X..X..', '..XXX..XX...', '.XXX...XX...', '.X.X..XXXX..', '...X.XX..XX.', '............'],
  全: ['............', '.....XX.....', '....XXX.....', '....X..X....', '..XX....XX..', '.XXXXXXXXXX.', '.....X......', '..XXXXXXX...', '.....X......', '..XXXXXXXX..', '..X.....XX..', '............'],
  破: ['............', '.......X....', '.XXX..XXXX..', '..X..X.X.X..', '..X..X.X....', '.XXX.XXXXX..', '.XX..XX..X..', '.XX.XX.XX...', '..XXXX.XX...', '..XXXXXXXX..', '.....XX..XX.', '............'],
  失: ['............', '...X.XX.....', '...X.XX.....', '..XXXXXXXX..', '..X...X.....', '..X..XX.XX..', '..XX.XXXXX..', '.....XX.....', '....XX.X....', '..XXX..XX...', '.XX......XX.', '............'],
  敗: ['............', '..XXX..X....', '.XX.X..X....', '.XX.X.XXXXX.', '.XX.X.X..X..', '.XX.XXX.XX..', '.X..XX.XX...', '.XX.X..XX...', '..X.X..XX...', '.XX.XXXX.XX.', '.X...XX...X.', '............'],
  得: ['............', '...X..XXXX..', '..XX.XX..X..', '.XX..XX.XX..', '...X.XX.XX..', '..XX........', '.XXX....XX..', '..XX.XXXXXX.', '..XX.XX.X...', '..XX....X...', '..XX...XX...', '............'],
  分: ['............', '....X.XX....', '...XX..X....', '...X...XX...', '..XX....XX..', '.XXXXXXXXXX.', '....XX..X...', '....X...X...', '....X...X...', '..XX...XX...', '..X...XXX...', '............'],
  新: ['............', '...XX..XXXX.', '..X.XX.X....', '..XXX..X....', '..XXX.XXXXX.', '...XX..X.X..', '..XXX..X.X..', '..XXX..X.X..', '..X.XXX..X..', '.X.XX.X..X..', '...X.....X..', '............'],
  重: ['............', '..XXXXXXXX..', '.XX..XX.....', '...X.XX.XX..', '..XX.XX.XX..', '..XX.XX.XX..', '..XX.XX.XX..', '.....XX.X...', '..XX.XX.XX..', '.XXX.XXXXXX.', '............', '............'],
  來: ['............', '.....X......', '.XXXXXXXXX..', '...X.X..X...', '...X.X.XX...', '..XXXXXXXX..', '..X.XXX.....', '....XXXX....', '..XX.X.XX...', '.XX..X...XX.', '.....X......', '............'],
  返: ['............', '..X..XXXXX..', '.....X......', '.XX..XXXX...', '..XX.X..XX..', '...X.XX.X...', '...X.X.XX...', '...XX.XXX...', '..XXXX..XX..', '.XXXXXXXXX..', '.....XXXXX..', '............'],
  回: ['............', '..XXXXXXXX..', '.XX......X..', '.XX......X..', '.XX.X.XX.X..', '.XX.X..X.X..', '.XX.X..X.X..', '.XX.XXXX.X..', '.XX......X..', '.XXXXXXXXX..', '..X......X..', '............'],
  享: ['............', '..X.XXX.XX..', '..XXXXXXXX..', '...X...XX...', '...XX..XX...', '...XX.......', '......XXX...', '.X...XX.....', '.XXX.XX.XXX.', '.....XX.....', '....XX......', '............'],
  已: ['............', '..XXXXXXX...', '........X...', '........X...', '..X.....X...', '..XXXXXXX...', '..X.........', '..X.........', '..X......XX.', '..X......XX.', '..XXXXXXXX..', '............'],
  升: ['............', '....XXXXX...', '..XXX..XX...', '....X..XX...', '....X..XX...', '.XXXXXXXXXX.', '....X..XX...', '....X..XX...', '...XX..XX...', '..XX...XX...', '.XX....XX...', '............'],
  級: ['............', '...X.XXXX...', '..X..XX.X...', '.XXX..X.X...', '.XXX..XXXX..', '..XX..X..X..', '.XXXX.X.XX..', '.....XXXX...', '.XXXXX.XX...', '.X..XXXXXX..', '.....X...XX.', '............'],
  射: ['............', '...XX...XX..', '..XXXX..X...', '..XX.X..XX..', '..X..X..XX..', '..XX.XX.X...', '..X..XXXX...', '....XX..X...', '...XXX..XX..', '.XX..X..X...', '....XX.XX...', '............'],
  助: ['............', '..XXX..X....', '..X.X..X....', '..X.X.XXXX..', '..X.X..X.XX.', '..X.X..X.XX.', '..XXX..X.XX.', '..X.X..X.XX.', '.XX.XXX..XX.', '.XX..XX..XX.', '.....X..XX..', '............'],
  攻: ['............', '......XX....', '.XXXX.X.....', '..XX..XXXXX.', '...X.XX.XX..', '...X.XX.X...', '...X..X.X...', '...X...X....', '.XXX..XX....', '.....XX.XX..', '...XXX...X..', '............'],
  穿: ['............', '.....XX.....', '..X.X.XX.XX.', '..XXX..XX...', '..XX....XX..', '...X..XX....', '..XX..XX.X..', '.....XXX....', '....X..X....', '.XXX..XX....', '.XX..XX.....', '............'],
  甲: ['............', '.XXXXXXXX...', '.X...X..XX..', '.XX..X..XX..', '.XX..X..X...', '.X...X..XX..', '.XXXXXXXXX..', '.X...X......', '.....X......', '.....X......', '.....X......', '............'],
  吸: ['............', '.....XXXX...', '.X.X.XX.X...', '.X.X..X.X...', '.X.X.XXXXX..', '.X.X.XX..X..', '.X.X.XX.X...', '.X.X.X.XX...', '.X.XX..XX...', '...XXXX.XX..', '.....X...XX.', '............'],
  力: ['............', '.....X......', '.....X......', '.XXXXXXXXX..', '.....X..XX..', '.....X...X..', '.....X...X..', '....XX...X..', '...XX....X..', '..XX...XXX..', '.XX.....X...', '............'],
  血: ['............', '.....X......', '.....X......', '..XXXXXXX...', '..X.X.X.XX..', '..X.X.X.XX..', '..X.X.X.XX..', '..X.X.X.X...', '..X.X.X.X...', '.XXXXXXXXXX.', '............', '............'],
  開: ['............', '.XXXX..XXXX.', '.XX.X.XX.XX.', '.XX.X..X.XX.', '.XX.X..X.XX.', '.X..XXXX..X.', '.X..X.XX.XX.', '.XXXXXXXXXX.', '.X..X.XX.XX.', '.X..X.XX.XX.', '.X.X..X.XX..', '............'],
  火: ['............', '.....XX.....', '.....XX.....', '...X.X..XX..', '..XX.X..X...', '..X..XXXX...', '..X..XXX....', '....XX.X....', '...XX..XX...', '..XX....XX..', '.XX......XX.', '............'],
};

const FONT_KEY = 'pixel-font';

/** 字元的點陣與尺寸（英文 3×5 或中文 12×12）；空白／未知回傳 null */
function glyphData(ch: string): { rows: readonly string[]; w: number; h: number } | null {
  if (ch in GLYPHS) return { rows: GLYPHS[ch]!, w: GLYPH_W, h: GLYPH_H };
  if (ch in CJK_GLYPHS) return { rows: CJK_GLYPHS[ch]!, w: CJK_W, h: CJK_H };
  return null;
}

/** 產生字型 texture（英文＋中文同處一張，高度取最高字），整個遊戲只需執行一次 */
export function ensurePixelFont(scene: Phaser.Scene): void {
  if (scene.textures.exists(FONT_KEY)) return;
  const chars = [...Object.keys(GLYPHS), ...Object.keys(CJK_GLYPHS)];
  const totalW = chars.reduce((w, ch) => w + glyphData(ch)!.w + 1, 0);
  const tex = scene.textures.createCanvas(FONT_KEY, totalW, CJK_H);
  if (!tex) throw new Error('failed to create pixel font texture');
  const ctx = tex.getContext();
  ctx.fillStyle = NOKIA_FG_CSS;
  let ox = 0;
  for (const ch of chars) {
    const g = glyphData(ch)!;
    g.rows.forEach((row, y) => {
      for (let x = 0; x < g.w; x++) {
        if (row[x] === 'X') ctx.fillRect(ox + x, y, 1, 1);
      }
    });
    tex.add(ch, 0, ox, 0, g.w, g.h);
    ox += g.w + 1;
  }
  tex.refresh();
}

/**
 * 點陣字排版，可中英混排。英文 3×5、中文 12×12，各字依寬度排進；
 * 同一行若含中文，行高取 12px，英文字會垂直置中對齊中文。空白寬度同一個英文格。
 */
export class PixelText extends Phaser.GameObjects.Container {
  private content = '';
  private width_ = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, text = '') {
    super(scene, x, y);
    scene.add.existing(this);
    this.setText(text);
  }

  setText(text: string): this {
    if (text === this.content) return this;
    this.content = text;
    this.removeAll(true);
    const up = text.toUpperCase();
    // 行高：整行有任何中文就用 12px，純英文維持 5px（與舊版完全相同）
    let lineH = GLYPH_H;
    for (const ch of up) {
      if (ch in CJK_GLYPHS) {
        lineH = CJK_H;
        break;
      }
    }
    let cx = 0;
    for (const ch of up) {
      const g = glyphData(ch);
      if (g) {
        const gy = Math.floor((lineH - g.h) / 2);
        this.add(new Phaser.GameObjects.Image(this.scene, cx, gy, FONT_KEY, ch).setOrigin(0, 0));
        cx += g.w + 1;
      } else {
        cx += GLYPH_W + 1; // 空白／未知：留一個英文格
      }
    }
    this.width_ = Math.max(0, cx - 1);
    return this;
  }

  get textWidth(): number {
    return this.width_;
  }
}
