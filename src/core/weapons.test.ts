import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectWeapon,
  emptyWeapon,
  fireWeapon,
  switchWeapon,
  pickWeaponKind,
  WEAPON_SPECS,
} from './weapons.ts';

test('撿到武器：自動選用並給彈藥', () => {
  const w = emptyWeapon();
  collectWeapon(w, 'rocket');
  assert.equal(w.current, 'rocket');
  assert.equal(w.ammo.rocket, WEAPON_SPECS.rocket.ammo);
});

test('撿到同款武器：彈藥累加', () => {
  const w = emptyWeapon();
  collectWeapon(w, 'beam');
  collectWeapon(w, 'beam');
  assert.equal(w.ammo.beam, WEAPON_SPECS.beam.ammo * 2);
});

test('撿到不同款武器：各自獨立累加，不覆蓋、不搶走當前', () => {
  const w = emptyWeapon();
  collectWeapon(w, 'rocket');
  collectWeapon(w, 'wheel');
  assert.equal(w.current, 'rocket');
  assert.equal(w.ammo.rocket, WEAPON_SPECS.rocket.ammo);
  assert.equal(w.ammo.wheel, WEAPON_SPECS.wheel.ammo);
});

test('切換武器：在有彈藥的武器間循環、跳過沒彈藥的', () => {
  const w = emptyWeapon();
  collectWeapon(w, 'rocket'); // current=rocket
  collectWeapon(w, 'wheel'); // beam 沒彈藥
  switchWeapon(w);
  assert.equal(w.current, 'wheel');
  switchWeapon(w);
  assert.equal(w.current, 'rocket');
});

test('切換武器：只有一把有彈藥時維持不變', () => {
  const w = emptyWeapon();
  collectWeapon(w, 'beam');
  switchWeapon(w);
  assert.equal(w.current, 'beam');
});

test('發射消耗當前武器彈藥；打完自動切到下一把有彈藥的', () => {
  const w = emptyWeapon();
  collectWeapon(w, 'wheel'); // current=wheel
  collectWeapon(w, 'rocket'); // rocket 也有彈藥，但 current 仍 wheel
  for (let i = 0; i < WEAPON_SPECS.wheel.ammo; i++) {
    assert.equal(fireWeapon(w), 'wheel');
  }
  assert.equal(w.ammo.wheel, 0);
  assert.equal(w.current, 'rocket');
});

test('發射：所有彈藥打完回到預設槍（current=null）', () => {
  const w = emptyWeapon();
  collectWeapon(w, 'beam');
  for (let i = 0; i < WEAPON_SPECS.beam.ammo; i++) fireWeapon(w);
  assert.equal(w.current, null);
  assert.equal(fireWeapon(w), null);
});

test('沒武器時發射回傳 null', () => {
  assert.equal(fireWeapon(emptyWeapon()), null);
});

test('pickWeaponKind 由 rng 決定且可種子化', () => {
  assert.equal(
    pickWeaponKind(() => 0),
    'rocket',
  );
  assert.equal(
    pickWeaponKind(() => 0.5),
    'beam',
  );
  assert.equal(
    pickWeaponKind(() => 0.99),
    'wheel',
  );
  assert.equal(
    pickWeaponKind(() => 1),
    'wheel',
  );
});
