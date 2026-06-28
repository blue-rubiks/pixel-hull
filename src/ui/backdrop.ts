import Phaser from 'phaser';
import { GAME_WIDTH, NOKIA_FG_CSS, PLAY_TOP, PLAY_BOTTOM } from '../core/constants.ts';

/**
 * 每關上下滾動地景（兩色：深色剪影錨在邊緣、淺底透出）。
 * 只佔戰鬥區之外的 4px 邊條（見 constants.PLAY_TOP/PLAY_BOTTOM），不干擾玩法辨識。
 * 用 TileSprite 平鋪 + tilePositionX 視差捲動；貼圖週期整除 TILE_W 以無縫平鋪。
 */

const BAND_H = 4; // 邊條厚度（= PLAY_TOP - 8，也 = GAME_HEIGHT - PLAY_BOTTOM）
const TILE_W = 84; // 地景貼圖寬度；正弦/齒寬週期須整除它才能無縫
const TOP_Y = PLAY_TOP - BAND_H; // 8：HUD 之下、戰鬥區之上
const BOTTOM_Y = PLAY_BOTTOM; // 68：戰鬥區之下
const TOP_SPEED = 6; // px/s（較慢＝較遠的天花板）
const BOTTOM_SPEED = 9; // px/s（地面捲得快一點，做出視差）

interface Motif {
  base: number; // 基礎厚度
  amp: number; // 起伏高度
  style: 'wave' | 'blocky' | 'spikes';
  periods?: [number, number]; // wave：兩個正弦週期（須整除 TILE_W）
  teeth?: number; // blocky 齒寬 / spikes 間距（須整除 TILE_W）
}

// 8 關地景：平原→丘陵→鋸齒山→隕石尖刺→高原→要塞方塊→雙峰→母艦結構
const MOTIFS: readonly Motif[] = [
  { base: 1, amp: 1, style: 'wave', periods: [42, 21] }, // L1 平原微起伏
  { base: 1, amp: 2, style: 'wave', periods: [28, 14] }, // L2 丘陵
  { base: 0, amp: 3, style: 'wave', periods: [12, 6] }, // L3 鋸齒山
  { base: 1, amp: 3, style: 'spikes', teeth: 12 }, // L4 隕石尖刺
  { base: 2, amp: 1, style: 'wave', periods: [42, 14] }, // L5 高原
  { base: 1, amp: 3, style: 'blocky', teeth: 6 }, // L6 要塞方塊
  { base: 1, amp: 3, style: 'wave', periods: [21, 7] }, // L7 雙峰
  { base: 2, amp: 2, style: 'blocky', teeth: 4 }, // L8 母艦結構
];

function heightAt(m: Motif, x: number): number {
  let h: number;
  if (m.style === 'blocky') {
    const teeth = m.teeth ?? 6;
    h = m.base + (Math.floor(x / teeth) % 2 === 0 ? m.amp : 0);
  } else if (m.style === 'spikes') {
    const gap = m.teeth ?? 12;
    h = m.base + (x % gap < 2 ? m.amp : 0); // 2px 寬尖刺，錨在邊緣不像浮點子彈
  } else {
    const [p1, p2] = m.periods ?? [42, 21];
    const w = 0.6 * Math.sin((2 * Math.PI * x) / p1) + 0.4 * Math.sin((2 * Math.PI * x) / p2);
    h = m.base + Math.round(((w + 1) / 2) * m.amp);
  }
  return Phaser.Math.Clamp(Math.round(h), 0, BAND_H);
}

function paint(
  scene: Phaser.Scene,
  key: string,
  heights: readonly number[],
  side: 'top' | 'bottom',
): void {
  const tex = scene.textures.createCanvas(key, TILE_W, BAND_H);
  if (!tex) throw new Error(`failed to create texture ${key}`);
  const ctx = tex.getContext();
  ctx.fillStyle = NOKIA_FG_CSS;
  for (let x = 0; x < TILE_W; x++) {
    const h = heights[x]!;
    for (let y = 0; y < h; y++) {
      // bottom：由底部往上長；top：由頂部往下長（倒掛）
      ctx.fillRect(x, side === 'bottom' ? BAND_H - 1 - y : y, 1, 1);
    }
  }
  tex.refresh();
}

/** 確保第 idx 關地景貼圖存在（上下各一張），回傳兩個 texture key */
function ensureTerrain(scene: Phaser.Scene, idx: number): { top: string; bottom: string } {
  const top = `bd-terrain-${idx}-t`;
  const bottom = `bd-terrain-${idx}-b`;
  if (!scene.textures.exists(bottom)) {
    const heights = Array.from({ length: TILE_W }, (_, x) => heightAt(MOTIFS[idx]!, x));
    paint(scene, top, heights, 'top');
    paint(scene, bottom, heights, 'bottom');
  }
  return { top, bottom };
}

export class Backdrop {
  private readonly top: Phaser.GameObjects.TileSprite;
  private readonly bottom: Phaser.GameObjects.TileSprite;

  constructor(private readonly scene: Phaser.Scene) {
    const { top, bottom } = ensureTerrain(scene, 0);
    this.top = scene.add
      .tileSprite(0, TOP_Y, GAME_WIDTH, BAND_H, top)
      .setOrigin(0, 0)
      .setDepth(-10);
    this.bottom = scene.add
      .tileSprite(0, BOTTOM_Y, GAME_WIDTH, BAND_H, bottom)
      .setOrigin(0, 0)
      .setDepth(-10);
  }

  /** 切到第 level 關地景（1 起算；超過 8 關循環沿用） */
  setLevel(level: number): void {
    const { top, bottom } = ensureTerrain(this.scene, (level - 1) % MOTIFS.length);
    this.top.setTexture(top);
    this.bottom.setTexture(bottom);
    this.top.tilePositionX = TILE_W / 2; // 上下相位錯開，避免看起來完全鏡像
    this.bottom.tilePositionX = 0;
  }

  /** dt：秒 */
  update(dt: number): void {
    this.top.tilePositionX += TOP_SPEED * dt;
    this.bottom.tilePositionX += BOTTOM_SPEED * dt;
  }
}
