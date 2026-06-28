// Nokia 3310 Jam 標準雙色（全遊戲僅此兩色）
export const NOKIA_BG = 0xc7f0d8;
export const NOKIA_FG = 0x43523d;
export const NOKIA_FG_CSS = '#43523d';

// 內部解析度 126×72（原版 84×48 的 1.5 倍、保持 7:4）：視野比 168×96 窄，
// 敵人掃過更快、閃避空間更小 = 提高難度。504×288 能整除（×4），桌面顯示尺寸不變。
export const GAME_WIDTH = 126;
export const GAME_HEIGHT = 72;

// 戰鬥區垂直範圍：上下各讓出 4px 邊條給每關滾動地景（見 ui/backdrop.ts）。
// 上緣 12 = HUD(rows 0–7) 之下再讓 4px；下緣 68 = 底部讓 4px。
// 總邊距仍 16，可用高度 PLAY_H=56 與原本 GAME_HEIGHT-16 一致，只是整體下移、空間略縮。
export const PLAY_TOP = 12;
export const PLAY_BOTTOM = 68;
export const PLAY_H = PLAY_BOTTOM - PLAY_TOP;
