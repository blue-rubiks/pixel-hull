import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVEL_PLANS,
  levelTimeline,
  generateTimeline,
  enemyLoopScaling,
  type EnemyKind,
} from './waves.ts';
import { mulberry32 } from './prng.ts';

test('arcade 每關用固定種子：同一關兩次生成完全相同', () => {
  for (let lv = 1; lv <= LEVEL_PLANS.length; lv++) {
    assert.deepEqual(levelTimeline(lv), levelTimeline(lv));
  }
});

test('時間軸時間遞增（非遞減）', () => {
  for (let lv = 1; lv <= LEVEL_PLANS.length; lv++) {
    const tl = levelTimeline(lv);
    for (let i = 1; i < tl.length; i++) {
      assert.ok(tl[i]!.t >= tl[i - 1]!.t, `L${lv} 時間軸必須維持遞增`);
    }
  }
});

test('每關只會出現該關計畫內的敵種（群湧的 swarm 例外）', () => {
  LEVEL_PLANS.forEach((plan, idx) => {
    const allowed = new Set<EnemyKind>(plan.pool);
    if (plan.swarmEvery) allowed.add('swarm');
    for (const ev of levelTimeline(idx + 1)) {
      assert.ok(allowed.has(ev.kind), `L${idx + 1} 不該出現 ${ev.kind}`);
    }
  });
});

test('打通最後一關後沿用最後一關計畫，敵種仍在池內', () => {
  const last = LEVEL_PLANS[LEVEL_PLANS.length - 1]!;
  const allowed = new Set<EnemyKind>(last.pool);
  allowed.add('swarm');
  for (const ev of levelTimeline(LEVEL_PLANS.length + 4)) {
    assert.ok(allowed.has(ev.kind));
  }
});

test('daily：同種子必產出同一張時間軸', () => {
  assert.deepEqual(generateTimeline(mulberry32(123), 3), generateTimeline(mulberry32(123), 3));
});

test('daily：敵種隨關卡解鎖（第 1 關只有雜兵）', () => {
  const banned = new Set<string>(['bomber', 'swarm', 'zigzag', 'diver', 'turret']);
  for (const ev of generateTimeline(mulberry32(7), 1)) {
    assert.ok(!banned.has(ev.kind), `第 1 關不該出現 ${ev.kind}`);
  }
});

test('雜兵加成：第一圈（L1–L8）完全不加成', () => {
  for (let lv = 1; lv <= LEVEL_PLANS.length; lv++) {
    assert.deepEqual(enemyLoopScaling(lv), { hpBonus: 0, speedMul: 1 });
  }
});

test('雜兵加成：速度每圈 +8%、血量每兩圈 +1', () => {
  assert.deepEqual(enemyLoopScaling(LEVEL_PLANS.length + 1), { hpBonus: 0, speedMul: 1.08 }); // loop 1
  assert.deepEqual(enemyLoopScaling(LEVEL_PLANS.length * 2 + 1), { hpBonus: 1, speedMul: 1.16 }); // loop 2
});

test('雜兵加成：血量封頂 +2、速度封頂 +40%', () => {
  const deep = enemyLoopScaling(LEVEL_PLANS.length * 12 + 1); // loop 12
  assert.equal(deep.hpBonus, 2);
  assert.equal(deep.speedMul, 1.4);
});
