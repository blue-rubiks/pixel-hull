import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashString, mulberry32 } from './prng.ts';

test('同種子必須產出同序列（種子確定性）', () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  for (let i = 0; i < 1000; i++) {
    assert.equal(a(), b());
  }
});

test('不同種子產出不同序列', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test('輸出範圍在 [0, 1)', () => {
  const rng = mulberry32(987654321);
  for (let i = 0; i < 10000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1);
  }
});

test('hashString 確定且對不同字串敏感', () => {
  assert.equal(hashString('2026-06-12'), hashString('2026-06-12'));
  assert.notEqual(hashString('2026-06-12'), hashString('2026-06-13'));
  const h = hashString('pixel-hull:2026-06-12');
  assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff);
});
