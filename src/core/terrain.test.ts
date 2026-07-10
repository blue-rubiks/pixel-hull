import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './prng.ts';
import { generateTerrain, terrainMaxFor } from './terrain.ts';
import { PLAY_H } from './constants.ts';

test('terrainMaxFor：arcade 只在 L3/L6 出現、循環鏡射；daily 每逢 3 的倍數關', () => {
  assert.equal(terrainMaxFor('arcade', 1), null);
  assert.equal(terrainMaxFor('arcade', 3), 8);
  assert.equal(terrainMaxFor('arcade', 6), 10);
  assert.equal(terrainMaxFor('arcade', 8), null);
  assert.equal(terrainMaxFor('arcade', 11), 8); // L11 = 第二圈的 L3 位置
  assert.equal(terrainMaxFor('arcade', 14), 10);
  assert.equal(terrainMaxFor('daily', 2), null);
  assert.equal(terrainMaxFor('daily', 3), 8);
  assert.equal(terrainMaxFor('daily', 6), 10);
  assert.equal(terrainMaxFor('daily', 7), null);
  assert.equal(terrainMaxFor('daily', 9), 10);
});

test('generateTerrain：同種子同地形（可重現）', () => {
  const a = generateTerrain(mulberry32(42), 200, 10);
  const b = generateTerrain(mulberry32(42), 200, 10);
  assert.deepEqual(a, b);
});

test('generateTerrain：長度正確、高度在界內、保證走廊', () => {
  const cols = generateTerrain(mulberry32(7), 500, 12);
  assert.equal(cols.length, 500);
  for (const c of cols) {
    assert.ok(c.top >= 0 && c.top <= 12);
    assert.ok(c.bottom >= 0 && c.bottom <= 12);
    assert.ok(PLAY_H - c.top - c.bottom >= 26, `走廊過窄: ${c.top}+${c.bottom}`);
  }
});

test('generateTerrain：坡度每柱最多 ±1（不會出現直角斷崖）', () => {
  const cols = generateTerrain(mulberry32(99), 300, 10);
  for (let i = 1; i < cols.length; i++) {
    assert.ok(Math.abs(cols[i]!.top - cols[i - 1]!.top) <= 1);
    assert.ok(Math.abs(cols[i]!.bottom - cols[i - 1]!.bottom) <= 1);
  }
});
