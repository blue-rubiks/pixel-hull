/**
 * 每日挑戰（PLANNING.md §3.3）：
 * 種子用「玩家本地日期」（同 Wordle，不用 UTC），同一天全球玩家遇到完全相同的局。
 * 波次、升級、補給各自從種子衍生獨立子流，玩家行為（如選單停留時間）不影響序列。
 */

import { hashString, mulberry32 } from './prng.ts';

/** 波次、升級、補給、武器道具的 rng 子流編號 */
export const STREAM_WAVES = 1;
export const STREAM_UPGRADES = 2;
export const STREAM_PICKUPS = 3;
export const STREAM_WEAPONS = 4;

/** 玩家本地日期 YYYY-MM-DD（刻意不用 UTC，避免亞洲玩家下午才換日） */
export function localDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 日期字串 → 當日種子 */
export function dailySeed(dateStr: string): number {
  return hashString(`pixel-hull:${dateStr}`);
}

/** 從種子衍生「第 level 關、第 stream 流」的獨立 PRNG */
export function levelRng(seed: number, level: number, stream: number): () => number {
  const mixed = (seed ^ Math.imul(level, 0x9e3779b9) ^ Math.imul(stream, 0x85ebca6b)) >>> 0;
  return mulberry32(mixed);
}

/** 結算用 emoji 分享文字（Wordle 式傳播）：🟩 = 過的關數，💥 = 陣亡 */
export function shareText(date: string, score: number, level: number, streak: number): string {
  const cleared = Math.min(level - 1, 10);
  const blocks = '🟩'.repeat(cleared) + '💥';
  const streakLine = streak > 1 ? `\n🔥 連勝 ${streak}` : '';
  return `PIXEL HULL ${date}\n${blocks}\n得分 ${score} - LV${level}${streakLine}`;
}
