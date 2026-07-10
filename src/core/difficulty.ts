/**
 * 難度設定（只作用於街機模式）：
 * 每日挑戰固定用 normal——同一天全球同局、分數才可比較，難度不得介入。
 * normal 欄位即原始調校值（全部 ×1、數值同原常數），預設手感與加入難度前完全相同。
 */

export type Difficulty = 'easy' | 'normal' | 'hard';

/** 選單循環切換的順序 */
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export interface DifficultyMods {
  /** 敵人移動速度倍率（疊在圈數加成之上） */
  enemySpeedMul: number;
  /** 出怪間隔倍率（>1 = 較稀疏） */
  spawnGapMul: number;
  /** Boss 血量倍率 */
  bossHpMul: number;
  /** 補給生成間隔倍率（<1 = 較常出現） */
  pickupIntervalMul: number;
  /** 一個補給回補的像素數 */
  restorePerPickup: number;
  /** 補給生成時掠奪者跟隨進場的機率 */
  thiefChance: number;
}

export const DIFFICULTY_MODS: Record<Difficulty, DifficultyMods> = {
  easy: {
    enemySpeedMul: 0.85,
    spawnGapMul: 1.2,
    bossHpMul: 0.8,
    pickupIntervalMul: 0.75,
    restorePerPickup: 3,
    thiefChance: 0.175,
  },
  normal: {
    enemySpeedMul: 1,
    spawnGapMul: 1,
    bossHpMul: 1,
    pickupIntervalMul: 1,
    restorePerPickup: 2,
    thiefChance: 0.35,
  },
  hard: {
    enemySpeedMul: 1.15,
    spawnGapMul: 0.85,
    bossHpMul: 1.25,
    pickupIntervalMul: 1.3,
    restorePerPickup: 2,
    thiefChance: 0.5,
  },
};
