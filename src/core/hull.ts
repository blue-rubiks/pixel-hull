/**
 * 像素船體模型（純邏輯、不依賴 Phaser，可用 node:test 直接測試）。
 * 船由固定佈局的像素組成：被擊中時從最外圍開始剝落，
 * 吃補給時從最靠近核心處開始回補。剝落/回補順序完全確定。
 */

export interface PixelPos {
  readonly x: number;
  readonly y: number;
}

/** 玩家船形狀（朝右），X = 實心像素，共 14 顆 */
export const SHIP_SHAPE: readonly string[] = ['.X....', '.XXX..', 'XXXXXX', '.XXX..', '.X....'];

export function shapeToPixels(shape: readonly string[]): PixelPos[] {
  const pixels: PixelPos[] = [];
  shape.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'X') pixels.push({ x, y });
    }
  });
  return pixels;
}

export class Hull {
  /** 全部佈局像素，依剝落優先序排列（離核心越遠排越前面） */
  private readonly layout: readonly PixelPos[];
  private readonly alive: boolean[];

  constructor(shape: readonly string[] = SHIP_SHAPE) {
    const pixels = shapeToPixels(shape);
    if (pixels.length === 0) throw new Error('hull shape has no pixels');
    const cx = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length;
    const cy = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length;
    const dist = (p: PixelPos): number => (p.x - cx) ** 2 + (p.y - cy) ** 2;
    // 距離相同時依原始掃描順序，確保順序完全確定
    this.layout = pixels
      .map((p, i) => ({ p, i }))
      .sort((a, b) => dist(b.p) - dist(a.p) || a.i - b.i)
      .map((entry) => entry.p);
    this.alive = this.layout.map(() => true);
  }

  get total(): number {
    return this.layout.length;
  }

  get count(): number {
    return this.alive.filter(Boolean).length;
  }

  /** 存活比例 0–1，用來縮放武器強度 */
  get ratio(): number {
    return this.count / this.total;
  }

  get isDestroyed(): boolean {
    return this.count === 0;
  }

  /** 目前存活的像素位置（船身局部座標） */
  pixels(): PixelPos[] {
    return this.layout.filter((_, i) => this.alive[i]);
  }

  /** 剝落最多 n 顆像素（最外圍先掉），回傳實際剝落的位置 */
  peel(n: number): PixelPos[] {
    const removed: PixelPos[] = [];
    for (let i = 0; i < this.layout.length && removed.length < n; i++) {
      if (this.alive[i]) {
        this.alive[i] = false;
        removed.push(this.layout[i]!);
      }
    }
    return removed;
  }

  /** 回補最多 n 顆像素（離核心近的先回來），回傳實際回補的位置 */
  restore(n: number): PixelPos[] {
    const revived: PixelPos[] = [];
    for (let i = this.layout.length - 1; i >= 0 && revived.length < n; i--) {
      if (!this.alive[i]) {
        this.alive[i] = true;
        revived.push(this.layout[i]!);
      }
    }
    return revived;
  }
}
