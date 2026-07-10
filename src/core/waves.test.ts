import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVEL_PLANS,
  levelTimeline,
  generateTimeline,
  enemyLoopScaling,
  eliteChanceFor,
  rollThief,
  THIEF_MIN_LEVEL,
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

test('菁英機率：第一圈為 0，之後每圈 +5%、從 10% 起跳、封頂 30%', () => {
  for (let lv = 1; lv <= LEVEL_PLANS.length; lv++) assert.equal(eliteChanceFor(lv), 0);
  assert.equal(eliteChanceFor(LEVEL_PLANS.length + 1), 0.1); // loop 1
  assert.equal(eliteChanceFor(LEVEL_PLANS.length * 2 + 1), 0.15); // loop 2
  assert.equal(eliteChanceFor(LEVEL_PLANS.length * 12 + 1), 0.3); // 封頂
});

test('菁英：第一圈時間軸完全沒有菁英（且不影響原有生成序列）', () => {
  for (let lv = 1; lv <= LEVEL_PLANS.length; lv++) {
    for (const ev of levelTimeline(lv)) assert.equal(ev.elite, undefined);
  }
  for (const ev of generateTimeline(mulberry32(123), 5)) assert.equal(ev.elite, undefined);
});

test('菁英：高圈數會出現、swarm 永不菁英、同種子可重現', () => {
  const arcade = levelTimeline(LEVEL_PLANS.length * 3 + 2); // loop 3
  assert.ok(
    arcade.some((ev) => ev.elite),
    '高圈數的 arcade 時間軸應出現菁英',
  );
  const daily = generateTimeline(mulberry32(9), 30);
  assert.ok(
    daily.some((ev) => ev.elite),
    '高關卡的 daily 時間軸應出現菁英',
  );
  for (const ev of [...arcade, ...daily]) {
    if (ev.kind === 'swarm') assert.equal(ev.elite, undefined);
  }
  assert.deepEqual(generateTimeline(mulberry32(9), 30), daily);
});

test('掠奪者：未達解鎖關卡必為 false 且不消耗 rng', () => {
  for (let lv = 1; lv < THIEF_MIN_LEVEL; lv++) {
    const rng = mulberry32(42);
    assert.equal(rollThief(lv, rng), false);
    // rng 未被消耗：序列與全新同種子 rng 一致
    assert.equal(rng(), mulberry32(42)());
  }
});

test('掠奪者：解鎖後同種子可重現，且兩種結果都出得來', () => {
  const roll = (seed: number) => rollThief(THIEF_MIN_LEVEL, mulberry32(seed));
  const results = new Set<boolean>();
  for (let seed = 0; seed < 50; seed++) {
    assert.equal(roll(seed), roll(seed));
    results.add(roll(seed));
  }
  assert.deepEqual([...results].sort(), [false, true]);
});

test('難度 gapMul：敵種序列不變、只縮放間隔，gapMul=1 與省略參數完全相同', () => {
  const base = levelTimeline(3); // L3 無群湧插隊，序列比較才不受排序影響
  const hard = levelTimeline(3, 0.85);
  const easy = levelTimeline(3, 1.2);
  const kinds = (tl: typeof base) => tl.map((ev) => [ev.kind, ev.y, ev.elite]);
  assert.deepEqual(kinds(hard), kinds(base));
  assert.deepEqual(kinds(easy), kinds(base));
  assert.ok(hard[hard.length - 1]!.t < base[base.length - 1]!.t, 'hard 應壓縮總時長');
  assert.ok(easy[easy.length - 1]!.t > base[base.length - 1]!.t, 'easy 應拉長總時長');
  assert.deepEqual(levelTimeline(3, 1), base);
});

test('掠奪者：機率可由難度覆寫（0 必不出、1 必出）', () => {
  assert.equal(rollThief(THIEF_MIN_LEVEL, mulberry32(1), 0), false);
  assert.equal(rollThief(THIEF_MIN_LEVEL, mulberry32(1), 1), true);
});

test('掠奪者：不進時間軸（arcade 與 daily 都不會從波次出現）', () => {
  for (let lv = 1; lv <= LEVEL_PLANS.length * 3; lv++) {
    for (const ev of levelTimeline(lv)) assert.notEqual(ev.kind, 'thief');
  }
  for (const ev of generateTimeline(mulberry32(9), 30)) assert.notEqual(ev.kind, 'thief');
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
