/**
 * 捲動地形（純邏輯、種子化，PLANNING.md §3.4 延伸）：
 * 特定關卡上下長出洞穴地形，壓縮活動空間——閃地形與閃彈幕是不同的技能。
 * 只對玩家判定碰撞（敵人與子彈視為飛在地形前方，原版 Space Impact 風格）；
 * 生成長度只覆蓋出怪時間軸，Boss 開打後殘餘地形自然捲出畫面。
 */

import { PLAY_H } from './constants.ts';
import { LEVEL_PLANS } from './waves.ts';

/** 一柱地形：上緣往下／下緣往上各佔幾 px（0 = 該側無地形） */
export interface TerrainColumn {
  top: number;
  bottom: number;
}

/** 柱寬（px）；越窄坡度越平滑 */
export const TERRAIN_SEG_W = 3;
/** 捲動速度（px/s）；比視差背景快、比多數敵人慢，讀起來是「近景地物」 */
export const TERRAIN_SPEED = 22;
/** 上下地形合計的上限：保證走廊至少此高度（船高 5，留足閃避空間） */
const MIN_CORRIDOR = 26;

/**
 * 哪些關卡有地形、最大高度多少（px）；null = 無地形。
 * arcade：循環鏡射（同 bossForLevel 的取模邏輯），L3 起伏小、L6 較深；
 * daily：每逢 3 的倍數關出現，後期加深。皆為 level 的純函式、可重現。
 */
export function terrainMaxFor(mode: 'arcade' | 'daily', level: number): number | null {
  if (mode === 'arcade') {
    const eff = ((level - 1) % LEVEL_PLANS.length) + 1;
    if (eff === 3) return 8;
    if (eff === 6) return 10;
    return null;
  }
  if (level % 3 !== 0) return null;
  return level < 6 ? 8 : 10;
}

/** 單側高度隨機走步：平地黏平地（做出平原與丘陵的節奏），坡度每柱最多 ±1 */
function step(h: number, maxH: number, rng: () => number): number {
  const r = rng();
  if (h === 0) return r < 0.55 ? 0 : 1;
  if (r < 0.33) return h - 1;
  if (r < 0.66) return h;
  return Math.min(maxH, h + 1);
}

/**
 * 生成 cols 柱地形。rng 必須是種子化 PRNG（daily 走 STREAM_TERRAIN 子流、
 * arcade 用關卡固定種子）→ 同種子同地形。上下獨立走步，合計超限時削去較高側。
 */
export function generateTerrain(rng: () => number, cols: number, maxH: number): TerrainColumn[] {
  const maxTotal = PLAY_H - MIN_CORRIDOR;
  const out: TerrainColumn[] = [];
  let top = 0;
  let bottom = 0;
  for (let i = 0; i < cols; i++) {
    top = step(top, maxH, rng);
    bottom = step(bottom, maxH, rng);
    if (top + bottom > maxTotal) {
      if (top >= bottom) top = maxTotal - bottom;
      else bottom = maxTotal - top;
    }
    out.push({ top, bottom });
  }
  return out;
}
