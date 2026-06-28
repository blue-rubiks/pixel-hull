/**
 * 波次（純資料驅動，見 PLANNING.md §3.4）。
 * arcade：8 關各有固定「敵群計畫」LEVEL_PLANS，用 level 當固定種子生成 →
 *   同一關每次都長一樣、但每關敵群不同；打通 8 關後沿用最後一關並隨圈數加速。
 * daily：仍用每日種子程序生成，敵池隨關卡解鎖（見 generateTimeline）。
 */

import { mulberry32 } from './prng.ts';

export type EnemyKind = 'drone' | 'darter' | 'bomber' | 'diver' | 'zigzag' | 'turret' | 'swarm';

export interface SpawnEvent {
  /** 進關後第幾毫秒出現 */
  t: number;
  kind: EnemyKind;
  /** 出生點垂直位置 0–1（乘上可用高度使用） */
  y: number;
}

/** 一關的敵群計畫：出哪些敵、幾隻、出怪間隔，是否插群湧陣形 */
export interface LevelPlan {
  pool: readonly EnemyKind[];
  count: number;
  gapMin: number;
  gapMax: number;
  /** 每隔幾隻插一波「群湧快兵」（一排 swarm）；省略＝不插 */
  swarmEvery?: number;
}

/** 8 關固定敵群：敵種逐關解鎖、出怪變密，最後一關全員總攻 */
export const LEVEL_PLANS: readonly LevelPlan[] = [
  { pool: ['drone', 'darter'], count: 16, gapMin: 850, gapMax: 1400 }, // L1 入門：只有雜兵
  { pool: ['drone', 'darter', 'bomber'], count: 18, gapMin: 800, gapMax: 1300 }, // L2 出現射手
  { pool: ['darter', 'bomber', 'zigzag'], count: 20, gapMin: 750, gapMax: 1200 }, // L3 鋸齒反彈
  { pool: ['drone', 'zigzag', 'diver'], count: 20, gapMin: 700, gapMax: 1150, swarmEvery: 6 }, // L4 俯衝＋群湧
  { pool: ['bomber', 'diver', 'turret'], count: 22, gapMin: 700, gapMax: 1100 }, // L5 砲塔連射
  {
    pool: ['darter', 'zigzag', 'diver', 'swarm'],
    count: 24,
    gapMin: 650,
    gapMax: 1050,
    swarmEvery: 5,
  }, // L6
  { pool: ['bomber', 'turret', 'zigzag', 'diver'], count: 26, gapMin: 620, gapMax: 1000 }, // L7
  {
    pool: ['drone', 'darter', 'bomber', 'diver', 'zigzag', 'turret'],
    count: 28,
    gapMin: 560,
    gapMax: 950,
    swarmEvery: 4,
  }, // L8 總攻
];

/** 出怪間隔的壓縮上限（最快 2 倍速） */
const MAX_SPEEDUP = 2;

function speedupFor(level: number): number {
  return Math.min(MAX_SPEEDUP, 1 + (level - 1) * 0.15);
}

/** 雜兵隨圈數加成的上限：血量最多 +2、速度最多 +40% */
const MAX_HP_BONUS = 2;
const MAX_SPEED_MUL = 1.4;

/**
 * 破完整圈（8 關）後，雜兵隨「圈數」微幅變強：速度先動、血量慢動。
 * 第一圈（L1–L8）loop=0、完全不加成，保留手工調校的手感。
 * 純函式（只吃 level）→ daily 同種子可重現。
 */
export function enemyLoopScaling(level: number): { hpBonus: number; speedMul: number } {
  const loop = Math.floor((level - 1) / LEVEL_PLANS.length); // 0 = 第一圈
  return {
    hpBonus: Math.min(MAX_HP_BONUS, Math.floor(loop / 2)), // 每兩圈 +1 HP
    speedMul: Math.min(MAX_SPEED_MUL, 1 + loop * 0.08), // 每圈 +8% 速度
  };
}

/**
 * arcade 第 level 關（1 起算）的時間軸：依該關計畫、用 level 當固定種子生成。
 * 同一關每次完全相同；打通最後一關後沿用最後一關計畫，並隨額外圈數加速。
 */
export function levelTimeline(level: number): SpawnEvent[] {
  const plan = LEVEL_PLANS[Math.min(level, LEVEL_PLANS.length) - 1]!;
  const lap = Math.max(1, level - LEVEL_PLANS.length + 1); // 第一圈內固定為 1，超過才 > 1
  const rng = mulberry32((0x9e3779b9 ^ Math.imul(level, 0x85ebca6b)) >>> 0);
  return buildTimeline(plan, speedupFor(lap), rng);
}

function buildTimeline(plan: LevelPlan, speedup: number, rng: () => number): SpawnEvent[] {
  const events: SpawnEvent[] = [];
  let t = 800;
  for (let i = 0; i < plan.count; i++) {
    t += Math.round((plan.gapMin + rng() * (plan.gapMax - plan.gapMin)) / speedup);
    if (plan.swarmEvery && i > 0 && i % plan.swarmEvery === 0) {
      // 群湧：一排快兵接連湧出，逼玩家閃位
      for (let k = 0; k < 3; k++) {
        events.push({ t: t + k * 110, kind: 'swarm', y: Math.round((0.2 + k * 0.3) * 100) / 100 });
      }
      continue;
    }
    const kind = plan.pool[Math.floor(rng() * plan.pool.length)]!;
    events.push({ t, kind, y: Math.round(rng() * 100) / 100 });
  }
  // 群湧會插入較早的 t，排序確保時間軸遞增（advanceTimeline 假設已排序）
  events.sort((a, b) => a.t - b.t);
  return events;
}

/** daily 敵池：隨關卡解鎖更多敵種，權重讓雜兵較常見、重兵較稀有 */
function dailyPool(level: number): EnemyKind[] {
  const pool: EnemyKind[] = ['drone', 'drone', 'darter', 'darter'];
  if (level >= 2) pool.push('bomber', 'swarm', 'swarm');
  if (level >= 3) pool.push('zigzag', 'zigzag');
  if (level >= 4) pool.push('diver', 'diver');
  if (level >= 5) pool.push('turret');
  return pool;
}

/**
 * 種子程序生成時間軸（每日挑戰用）：rng 必須是種子化 PRNG。
 * 出怪只由時間軸決定、與玩家輸入無關，同種子必產出同一張時間軸。
 */
export function generateTimeline(rng: () => number, level: number): SpawnEvent[] {
  const count = Math.min(40, 18 + level * 4);
  const speedup = speedupFor(level);
  const pool = dailyPool(level);
  const events: SpawnEvent[] = [];
  let t = 1000;
  for (let i = 0; i < count; i++) {
    t += Math.round((400 + rng() * 1100) / speedup);
    const kind = pool[Math.floor(rng() * pool.length)]!;
    events.push({ t, kind, y: Math.round(rng() * 100) / 100 });
  }
  return events;
}
