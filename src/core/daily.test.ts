import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeed, levelRng, localDateString, shareText } from './daily.ts';
import { generateTimeline } from './waves.ts';

test('localDateString 用本地日期、格式 YYYY-MM-DD', () => {
  // 本地午夜後 1 分鐘：不管時區，本地日期都是 6/12
  assert.equal(localDateString(new Date(2026, 5, 12, 0, 1)), '2026-06-12');
  assert.equal(localDateString(new Date(2026, 0, 3, 23, 59)), '2026-01-03');
});

test('同日期同種子、不同日期不同種子', () => {
  assert.equal(dailySeed('2026-06-12'), dailySeed('2026-06-12'));
  assert.notEqual(dailySeed('2026-06-12'), dailySeed('2026-06-13'));
});

test('levelRng：同 (種子, 關卡, 流) 同序列，任一參數不同則序列不同', () => {
  const base = Array.from({ length: 8 }, levelRng(42, 1, 1));
  assert.deepEqual(Array.from({ length: 8 }, levelRng(42, 1, 1)), base);
  assert.notDeepEqual(Array.from({ length: 8 }, levelRng(43, 1, 1)), base);
  assert.notDeepEqual(Array.from({ length: 8 }, levelRng(42, 2, 1)), base);
  assert.notDeepEqual(Array.from({ length: 8 }, levelRng(42, 1, 2)), base);
});

test('種子生成的時間軸完全確定且遞增', () => {
  const seed = dailySeed('2026-06-12');
  const a = generateTimeline(levelRng(seed, 1, 1), 1);
  const b = generateTimeline(levelRng(seed, 1, 1), 1);
  assert.deepEqual(a, b);
  for (let i = 1; i < a.length; i++) {
    assert.ok(a[i]!.t >= a[i - 1]!.t);
  }
});

test('關卡越高生成的敵人越多', () => {
  const seed = dailySeed('2026-06-12');
  const lv1 = generateTimeline(levelRng(seed, 1, 1), 1);
  const lv5 = generateTimeline(levelRng(seed, 5, 1), 5);
  assert.ok(lv5.length > lv1.length);
});

test('emoji 分享文字：過關數、分數、streak', () => {
  assert.equal(
    shareText('2026-06-12', 1280, 4, 5),
    'PIXEL HULL 2026-06-12\n🟩🟩🟩💥\n得分 1280 - LV4\n🔥 連勝 5',
  );
  // 第一天玩（streak 1）不顯示連勝行；第 1 關陣亡沒有綠格
  assert.equal(shareText('2026-06-12', 50, 1, 1), 'PIXEL HULL 2026-06-12\n💥\n得分 50 - LV1');
});
