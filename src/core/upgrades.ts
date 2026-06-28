/**
 * 升級卡（純邏輯）。每過一關從 3 張隨機卡選 1（PLANNING.md §3.4）。
 * rng 可注入：M3 每日挑戰會傳入種子化 PRNG，確保全球玩家選項相同。
 */

export interface PlayerStats {
  /** 射擊冷卻倍率（越小越快） */
  fireRateMul: number;
  /** 僚機數（上下各一，最多 2） */
  wingmen: number;
  /** 子彈可貫穿的額外敵人數 */
  pierce: number;
  /** 補給磁吸 */
  magnet: boolean;
}

export function defaultStats(): PlayerStats {
  return { fireRateMul: 1, wingmen: 0, pierce: 0, magnet: false };
}

export interface UpgradeDef {
  id: 'rapid' | 'wingman' | 'pierce' | 'magnet' | 'repair';
  /** 顯示名稱（12×12 中文點陣字） */
  name: string;
  available(stats: PlayerStats): boolean;
  apply(stats: PlayerStats): void;
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'rapid',
    name: '連射',
    available: () => true,
    apply: (s) => {
      s.fireRateMul *= 0.8;
    },
  },
  {
    id: 'wingman',
    name: '助攻',
    available: (s) => s.wingmen < 2,
    apply: (s) => {
      s.wingmen += 1;
    },
  },
  {
    id: 'pierce',
    name: '穿甲',
    available: (s) => s.pierce < 3,
    apply: (s) => {
      s.pierce += 1;
    },
  },
  {
    id: 'magnet',
    name: '吸力',
    available: (s) => !s.magnet,
    apply: (s) => {
      s.magnet = true;
    },
  },
  {
    // 特例：回補船體像素，由場景處理（stats 不動）
    id: 'repair',
    name: '回血',
    available: () => true,
    apply: () => {},
  },
];

/** 從目前可用的升級中抽 count 張不重複的卡（Fisher–Yates） */
export function pickUpgradeChoices(stats: PlayerStats, rng: () => number, count = 3): UpgradeDef[] {
  const pool = UPGRADES.filter((u) => u.available(stats));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
