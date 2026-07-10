import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY_MODS } from './difficulty.ts';
import { THIEF_CHANCE } from './waves.ts';

test('normal 即原始調校值：倍率全為 1、機率與原常數一致', () => {
  const n = DIFFICULTY_MODS.normal;
  assert.equal(n.enemySpeedMul, 1);
  assert.equal(n.spawnGapMul, 1);
  assert.equal(n.bossHpMul, 1);
  assert.equal(n.pickupIntervalMul, 1);
  assert.equal(n.thiefChance, THIEF_CHANCE);
});

test('難度單調：easy 各項不比 normal 難、hard 各項不比 normal 簡單', () => {
  const { easy, normal, hard } = DIFFICULTY_MODS;
  // 越大越難的項目
  for (const k of ['enemySpeedMul', 'bossHpMul', 'pickupIntervalMul', 'thiefChance'] as const) {
    assert.ok(easy[k] <= normal[k] && normal[k] <= hard[k], `${k} 應隨難度遞增`);
  }
  // 越大越簡單的項目
  for (const k of ['spawnGapMul', 'restorePerPickup'] as const) {
    assert.ok(easy[k] >= normal[k] && normal[k] >= hard[k], `${k} 應隨難度遞減`);
  }
});
