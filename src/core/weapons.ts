/**
 * 特殊武器（純邏輯）。致敬原版 Space Impact 的三種特殊武器：
 * 飛彈（直線高傷）、光束（瞬間橫貫整行）、光輪（緩速穿透輾壓）。
 * 預設武器彈藥無限；特殊武器彈藥有限，吃武器道具獲得。
 * 三款各自獨立記彈藥、可手動切換，互不覆蓋。
 * rng 可注入：每日挑戰傳入種子化 PRNG，確保全球玩家掉落相同。
 */

export type WeaponKind = 'rocket' | 'beam' | 'wheel';

export const WEAPON_KINDS: readonly WeaponKind[] = ['rocket', 'beam', 'wheel'];

export interface WeaponSpec {
  /** 一個道具給的彈藥數 */
  ammo: number;
  /** 單次命中傷害（普通敵人 hp 1–3、Boss 25+） */
  damage: number;
}

export const WEAPON_SPECS: Record<WeaponKind, WeaponSpec> = {
  rocket: { ammo: 3, damage: 3 },
  beam: { ammo: 1, damage: 2 }, // 一發一柱；damage 2：不秒清 3hp bomber，仍掃 1hp 雜兵
  wheel: { ammo: 1, damage: 6 },
};

export interface WeaponState {
  /** 三款各自的彈藥（獨立、互不覆蓋） */
  ammo: Record<WeaponKind, number>;
  /** 目前選用的武器；null = 回到預設槍 */
  current: WeaponKind | null;
}

export function emptyWeapon(): WeaponState {
  return { ammo: { rocket: 0, beam: 0, wheel: 0 }, current: null };
}

/** 從 from 之後（循環）找下一把有彈藥的武器；找不到回 null（from 自己沒彈藥就不會被選回） */
function nextOwned(state: WeaponState, from: WeaponKind | null): WeaponKind | null {
  const start = from ? WEAPON_KINDS.indexOf(from) : -1;
  for (let i = 1; i <= WEAPON_KINDS.length; i++) {
    const k = WEAPON_KINDS[(start + i) % WEAPON_KINDS.length]!;
    if (state.ammo[k] > 0) return k;
  }
  return null;
}

/** 撿到武器道具：該款彈藥獨立累加；目前沒選用武器時自動選上這款 */
export function collectWeapon(state: WeaponState, kind: WeaponKind): void {
  state.ammo[kind] += WEAPON_SPECS[kind].ammo;
  if (!state.current) state.current = kind;
}

/** 切換到下一把有彈藥的武器（循環）；都沒彈藥則 null */
export function switchWeapon(state: WeaponState): void {
  state.current = nextOwned(state, state.current);
}

/** 發射目前武器一發：回傳發射的武器種類；沒彈藥回 null。打完當前那把自動切到下一把有彈藥的。 */
export function fireWeapon(state: WeaponState): WeaponKind | null {
  const kind = state.current;
  if (!kind || state.ammo[kind] <= 0) return null;
  state.ammo[kind]--;
  if (state.ammo[kind] === 0) state.current = nextOwned(state, kind);
  return kind;
}

/** 道具種類由 rng 均勻決定 */
export function pickWeaponKind(rng: () => number): WeaponKind {
  const i = Math.min(WEAPON_KINDS.length - 1, Math.floor(rng() * WEAPON_KINDS.length));
  return WEAPON_KINDS[i]!;
}
