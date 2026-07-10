import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './prng.ts';
import { asteroidGapFor, generateAsteroids } from './asteroids.ts';

test('asteroidGapFor：arcade L4/L7 專屬、L6 疊加稀疏、循環鏡射', () => {
  assert.equal(asteroidGapFor('arcade', 1), null);
  assert.equal(asteroidGapFor('arcade', 3), null); // 地形關（淺）不疊加
  assert.notEqual(asteroidGapFor('arcade', 4), null);
  assert.notEqual(asteroidGapFor('arcade', 6), null); // 深洞穴關疊加
  assert.notEqual(asteroidGapFor('arcade', 7), null);
  assert.equal(asteroidGapFor('arcade', 8), null);
  assert.notEqual(asteroidGapFor('arcade', 12), null); // L12 = 第二圈的 L4 位置
  assert.notEqual(asteroidGapFor('arcade', 15), null); // L15 = 第二圈的 L7 位置
  // 疊加關間隔比專屬關稀疏
  const full = asteroidGapFor('arcade', 4)!;
  const sparse = asteroidGapFor('arcade', 6)!;
  assert.ok(sparse[0] > full[1]);
});

test('asteroidGapFor：daily 每逢 ≡2 (mod 3) 專屬、深地形關（≥6）疊加', () => {
  assert.equal(asteroidGapFor('daily', 1), null);
  assert.notEqual(asteroidGapFor('daily', 2), null);
  assert.equal(asteroidGapFor('daily', 3), null); // 淺地形關不疊加
  assert.equal(asteroidGapFor('daily', 4), null);
  assert.notEqual(asteroidGapFor('daily', 5), null);
  assert.notEqual(asteroidGapFor('daily', 6), null); // 深地形關疊加
  assert.notEqual(asteroidGapFor('daily', 9), null);
});

test('generateAsteroids：同種子同排程（可重現）', () => {
  const a = generateAsteroids(mulberry32(42), 60000, [2200, 3600]);
  const b = generateAsteroids(mulberry32(42), 60000, [2200, 3600]);
  assert.deepEqual(a, b);
});

test('generateAsteroids：時間遞增、不超過 untilMs、間隔與 y 都在界內', () => {
  const events = generateAsteroids(mulberry32(7), 120000, [2200, 3600]);
  assert.ok(events.length > 0);
  let prev = 0;
  for (const ev of events) {
    const gap = ev.t - prev;
    assert.ok(gap >= 2200 && gap <= 3600, `間隔超界: ${gap}`);
    assert.ok(ev.t <= 120000);
    assert.ok(ev.y >= 0 && ev.y <= 1);
    prev = ev.t;
  }
});

test('generateAsteroids：掉落預擲約 35%（同種子下比例穩定）', () => {
  const events = generateAsteroids(mulberry32(99), 2_000_000, [2200, 3600]);
  const drops = events.filter((e) => e.drop).length;
  const ratio = drops / events.length;
  assert.ok(ratio > 0.25 && ratio < 0.45, `掉落率偏離: ${ratio}`);
});
