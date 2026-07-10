/**
 * 隕石帶（純邏輯、種子化，terrain.ts 的姊妹篇）：
 * 中立隕石慢速左漂，擋「雙方」的子彈（與只撞玩家的地形互補）——
 * 可以躲在石頭後面回避彈幕，但它也擋你的火線；打碎有機率掉補給。
 * 專屬關全密度；深洞穴關疊加少量（走廊＋石頭雙重壓迫）。
 */

import { LEVEL_PLANS } from './waves.ts';

export interface AsteroidEvent {
  /** 進關後第幾毫秒出現 */
  t: number;
  /** 出生點垂直位置 0–1（乘上可用高度使用；地形關由 GameScene 擠進走廊帶） */
  y: number;
  /** 生成時預擲的補給掉落（擊碎時仍須過血量閘，見 GameScene） */
  drop: boolean;
}

/** 出石間隔範圍（ms）：專屬關全密度、疊加關（深洞穴）稀疏 */
export type AsteroidGap = readonly [number, number];
const GAP_FULL: AsteroidGap = [2200, 3600];
const GAP_SPARSE: AsteroidGap = [5200, 8000];

/** 擊碎掉補給的預擲機率（生成時擲 → 排程與玩家行為無關、daily 可重現） */
export const ASTEROID_DROP_CHANCE = 0.35;

/**
 * 哪些關卡有隕石帶、出石間隔多密；null = 無。
 * arcade：循環鏡射（同 terrainMaxFor 的取模邏輯），L4／L7 專屬全密度，
 *   L6 深洞穴關疊加少量；daily：每逢 ≡2 (mod 3) 關專屬，深地形關（≥6 的
 *   3 倍數關）疊加少量。皆為 level 的純函式、可重現。
 */
export function asteroidGapFor(mode: 'arcade' | 'daily', level: number): AsteroidGap | null {
  if (mode === 'arcade') {
    const eff = ((level - 1) % LEVEL_PLANS.length) + 1;
    if (eff === 4 || eff === 7) return GAP_FULL;
    if (eff === 6) return GAP_SPARSE;
    return null;
  }
  if (level % 3 === 2) return GAP_FULL;
  if (level % 3 === 0 && level >= 6) return GAP_SPARSE;
  return null;
}

/**
 * 生成隕石排程：從 0 起以 gap 範圍內的隨機間隔出石，直到超過 untilMs
 * （傳入出怪時間軸的最後一刻 → Boss 戰時殘石自然漂出，與地形收尾一致）。
 * rng 必須是種子化 PRNG（daily 走 STREAM_ASTEROIDS 子流、arcade 用關卡固定種子）。
 */
export function generateAsteroids(
  rng: () => number,
  untilMs: number,
  gap: AsteroidGap,
): AsteroidEvent[] {
  const out: AsteroidEvent[] = [];
  let t = 0;
  for (;;) {
    t += Math.round(gap[0] + rng() * (gap[1] - gap[0]));
    if (t > untilMs) break;
    out.push({
      t,
      y: Math.round(rng() * 100) / 100,
      drop: rng() < ASTEROID_DROP_CHANCE,
    });
  }
  return out;
}
