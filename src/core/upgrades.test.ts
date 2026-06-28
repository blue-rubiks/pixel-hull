import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultStats, pickUpgradeChoices, UPGRADES } from './upgrades.ts';

/** 簡單的假 PRNG：固定序列循環 */
function fakeRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length]!;
}

test('抽 3 張不重複的卡', () => {
  const cards = pickUpgradeChoices(defaultStats(), fakeRng([0.1, 0.5, 0.9]));
  assert.equal(cards.length, 3);
  assert.equal(new Set(cards.map((c) => c.id)).size, 3);
});

test('相同 rng 序列抽出相同的卡（可種子化）', () => {
  const a = pickUpgradeChoices(defaultStats(), fakeRng([0.3, 0.7, 0.2]));
  const b = pickUpgradeChoices(defaultStats(), fakeRng([0.3, 0.7, 0.2]));
  assert.deepEqual(
    a.map((c) => c.id),
    b.map((c) => c.id),
  );
});

test('已拿滿的升級不會再出現', () => {
  const stats = defaultStats();
  stats.magnet = true;
  stats.wingmen = 2;
  for (let i = 0; i < 20; i++) {
    const cards = pickUpgradeChoices(stats, fakeRng([i / 20, 0.5, 0.8]));
    assert.ok(!cards.some((c) => c.id === 'magnet' || c.id === 'wingman'));
  }
});

test('upgrade apply 正確修改 stats', () => {
  const stats = defaultStats();
  for (const u of UPGRADES) u.apply(stats);
  assert.equal(stats.fireRateMul, 0.8);
  assert.equal(stats.wingmen, 1);
  assert.equal(stats.pierce, 1);
  assert.equal(stats.magnet, true);
});
