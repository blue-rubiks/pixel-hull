import type Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants.ts';
import { sfx } from './sound.ts';

/**
 * 手機殼接線：實體按鍵 → 合成鍵盤事件（彩蛋級操作，見 PLANNING.md §3.6），
 * 以及 LCD 網格間距與畫面縮放的同步。
 */

const KEY_CODES: Record<string, number> = {
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  fire: 32, // space
  special: 49, // 1（特殊武器，同原版用數字鍵發射）
  switch: 90, // Z（切換特殊武器）
  copy: 67, // C
  menu: 77, // M
};

export function initShell(game: Phaser.Game): void {
  wireKeys();
  game.events.once('ready', () => syncScreen(game));
  window.addEventListener('resize', () => syncScreen(game));
}

function wireKeys(): void {
  for (const btn of document.querySelectorAll<HTMLElement>('[data-key]')) {
    const code = KEY_CODES[btn.dataset['key'] ?? ''];
    if (!code) continue;
    const press = (e: Event): void => {
      e.preventDefault();
      sfx.key();
      dispatchKey('keydown', code);
    };
    const release = (): void => dispatchKey('keyup', code);
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
  }
}

/** Phaser 的鍵盤管理讀 event.keyCode，而 KeyboardEvent 建構子不允許設定它，只能用 defineProperty */
function dispatchKey(type: 'keydown' | 'keyup', keyCode: number): void {
  const ev = new KeyboardEvent(type, { bubbles: true });
  Object.defineProperty(ev, 'keyCode', { value: keyCode });
  window.dispatchEvent(ev);
}

/** 依目前螢幕大小選整數倍縮放，並讓 LCD 網格間距對齊實際像素 */
function syncScreen(game: Phaser.Game): void {
  const parent = document.getElementById('game');
  if (!parent) return;
  const zoom = Math.max(
    1,
    Math.floor(Math.min(parent.clientWidth / GAME_WIDTH, parent.clientHeight / GAME_HEIGHT)),
  );
  game.scale.setZoom(zoom);
  const grid = document.querySelector<HTMLElement>('.lcd-grid');
  grid?.style.setProperty('--px', `${zoom}px`);
}
