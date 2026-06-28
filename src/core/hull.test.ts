import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hull, SHIP_SHAPE, shapeToPixels } from './hull.ts';

test('shapeToPixels 解析 X 為像素座標', () => {
  const pixels = shapeToPixels(['X.', '.X']);
  assert.deepEqual(pixels, [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]);
});

test('預設船形共 14 顆像素', () => {
  const hull = new Hull();
  assert.equal(hull.total, 14);
  assert.equal(hull.count, 14);
  assert.equal(hull.ratio, 1);
  assert.equal(hull.isDestroyed, false);
});

test('peel 從最外圍開始剝落、數量正確', () => {
  const hull = new Hull();
  const removed = hull.peel(3);
  assert.equal(removed.length, 3);
  assert.equal(hull.count, 11);
  // 預設船形最外圍是船頭尖端 (5,2)，必定最先剝落
  assert.deepEqual(removed[0], { x: 5, y: 2 });
});

test('peel 超過存活數時只剝落剩餘的像素', () => {
  const hull = new Hull(['XX']);
  const removed = hull.peel(5);
  assert.equal(removed.length, 2);
  assert.equal(hull.isDestroyed, true);
});

test('restore 從核心往外回補、不超過總數', () => {
  const hull = new Hull();
  const removed = hull.peel(5);
  const revived = hull.restore(99);
  assert.equal(revived.length, 5);
  assert.equal(hull.count, hull.total);
  // 回補順序 = 剝落順序的反轉（離核心近的先回來）
  assert.deepEqual(revived, [...removed].reverse());
});

test('剝落順序完全確定：兩個相同船形剝落結果一致', () => {
  const a = new Hull(SHIP_SHAPE);
  const b = new Hull(SHIP_SHAPE);
  assert.deepEqual(a.peel(7), b.peel(7));
  assert.deepEqual(a.pixels(), b.pixels());
});
