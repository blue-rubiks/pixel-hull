import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyArcadeResult, applyDailyResult, dayDifference, defaultSave } from './storage.ts';

test('dayDifference 計算本地日曆日差', () => {
  assert.equal(dayDifference('2026-06-11', '2026-06-12'), 1);
  assert.equal(dayDifference('2026-06-12', '2026-06-12'), 0);
  assert.equal(dayDifference('2026-05-31', '2026-06-01'), 1); // 跨月
  assert.equal(dayDifference('2025-12-31', '2026-01-01'), 1); // 跨年
  assert.equal(dayDifference('2026-06-10', '2026-06-12'), 2);
});

test('arcade 結算只在破紀錄時更新最高分', () => {
  let save = applyArcadeResult(defaultSave(), 100);
  assert.equal(save.highScore, 100);
  save = applyArcadeResult(save, 50);
  assert.equal(save.highScore, 100);
});

test('每日挑戰：第一次玩 streak 為 1', () => {
  const save = applyDailyResult(defaultSave(), '2026-06-12', 500, 3);
  assert.equal(save.daily.streak, 1);
  assert.equal(save.daily.bestScore, 500);
  assert.equal(save.daily.lastDate, '2026-06-12');
});

test('每日挑戰：連續天數累計、中斷重設', () => {
  let save = applyDailyResult(defaultSave(), '2026-06-10', 100, 2);
  save = applyDailyResult(save, '2026-06-11', 200, 2);
  assert.equal(save.daily.streak, 2);
  save = applyDailyResult(save, '2026-06-12', 300, 2);
  assert.equal(save.daily.streak, 3);
  // 跳過 6/13，6/14 再玩 → 重設為 1
  save = applyDailyResult(save, '2026-06-14', 400, 2);
  assert.equal(save.daily.streak, 1);
});

test('同一天重玩：streak 不變、保留當日最佳', () => {
  let save = applyDailyResult(defaultSave(), '2026-06-12', 500, 3);
  save = applyDailyResult(save, '2026-06-12', 300, 2);
  assert.equal(save.daily.streak, 1);
  assert.equal(save.daily.bestScore, 500);
  assert.equal(save.daily.lastScore, 300);
});
