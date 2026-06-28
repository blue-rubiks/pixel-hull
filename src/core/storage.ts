/**
 * 成績存檔：localStorage 存每日成績、最高分、連續挑戰天數（streak）。
 * 純靜態、無帳號系統。狀態轉移是純函式，localStorage 只做薄薄一層讀寫。
 */

export interface DailyState {
  lastDate: string | null;
  lastScore: number;
  lastLevel: number;
  bestScore: number;
  streak: number;
}

export interface SaveData {
  /** 一般模式最高分 */
  highScore: number;
  daily: DailyState;
  /** 全域靜音（音樂＋音效） */
  muted: boolean;
}

const STORAGE_KEY = 'pixel-hull-save';

export function defaultSave(): SaveData {
  return {
    highScore: 0,
    daily: { lastDate: null, lastScore: 0, lastLevel: 0, bestScore: 0, streak: 0 },
    muted: false,
  };
}

/** a 到 b 相差幾天（本地日曆日，b 在後為正） */
export function dayDifference(a: string, b: string): number {
  return Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86400000);
}

function dateOf(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** 一般模式結算（純函式） */
export function applyArcadeResult(save: SaveData, score: number): SaveData {
  return { ...save, highScore: Math.max(save.highScore, score) };
}

/**
 * 每日挑戰結算（純函式）。
 * 同一天重玩：保留當日最佳、streak 不變；連續日：streak +1；中斷：重設為 1。
 */
export function applyDailyResult(
  save: SaveData,
  date: string,
  score: number,
  level: number,
): SaveData {
  const d = save.daily;
  const streak =
    d.lastDate === date
      ? d.streak
      : d.lastDate !== null && dayDifference(d.lastDate, date) === 1
        ? d.streak + 1
        : 1;
  return {
    ...save,
    daily: {
      lastDate: date,
      lastScore: score,
      lastLevel: level,
      bestScore: Math.max(d.bestScore, score),
      streak,
    },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...(JSON.parse(raw) as SaveData) };
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // 隱私模式等情況寫入失敗：遊戲照玩，只是不記分
  }
}
