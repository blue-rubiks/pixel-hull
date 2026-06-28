import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  NOKIA_BG,
  NOKIA_FG,
  PLAY_TOP,
  PLAY_BOTTOM,
  PLAY_H,
} from '../core/constants.ts';
import { Hull } from '../core/hull.ts';
import {
  enemyLoopScaling,
  generateTimeline,
  levelTimeline,
  LEVEL_PLANS,
  type EnemyKind,
  type SpawnEvent,
} from '../core/waves.ts';
import {
  defaultStats,
  pickUpgradeChoices,
  type PlayerStats,
  type UpgradeDef,
} from '../core/upgrades.ts';
import {
  collectWeapon,
  emptyWeapon,
  fireWeapon,
  pickWeaponKind,
  switchWeapon,
  WEAPON_KINDS,
  WEAPON_SPECS,
  type WeaponKind,
  type WeaponState,
} from '../core/weapons.ts';
import {
  dailySeed,
  levelRng,
  localDateString,
  shareText,
  STREAM_PICKUPS,
  STREAM_UPGRADES,
  STREAM_WAVES,
  STREAM_WEAPONS,
} from '../core/daily.ts';
import { applyArcadeResult, applyDailyResult, loadSave, persistSave } from '../core/storage.ts';
import { ensurePixelFont, PixelText } from '../ui/font.ts';
import { ensureSprites } from '../ui/sprites.ts';
import { sfx, music } from '../ui/sound.ts';
import { Backdrop } from '../ui/backdrop.ts';
import { joystickVector } from '../ui/joystick.ts';

export type GameMode = 'arcade' | 'daily';

const PLAYER_SPEED = 55; // px/s
const BULLET_SPEED = 110;
const PICKUP_SPEED = 18;
const SHIP_W = 6;
const SHIP_H = 5;
const FIRE_COOLDOWN_FULL = 240; // 滿血射速（ms）
const FIRE_COOLDOWN_EMPTY = 600; // 殘血射速：船越小武器越弱
const PICKUP_SPAWN_MS = 13000;
const PICKUP_HEALTH_GATE = 0.7; // 存活率高於此值不生成補給（只在受傷時才掉）
const PICKUP_SPAWN_CHANCE = 0.7; // 到生成時機時，實際生成的機率（非必掉）
const PEEL_PER_CRASH = 3; // 被敵人撞到剝落的像素數
const PEEL_PER_SHOT = 2; // 被敵彈打中剝落的像素數
const RESTORE_PER_PICKUP = 2; // 一個補給回補的像素數
const RESTORE_PER_REPAIR = 6; // REPAIR 升級卡回補的像素數
const MAGNET_RADIUS = 40;
const MAGNET_PULL = 45; // px/s
const WEAPON_DROP_SPAWN_MS = 35000;
const ROCKET_SPEED = 90;
const WHEEL_SPEED = 30;
const WHEEL_SPIN_MS = 120; // 光輪兩幀交替的旋轉週期
const BEAM_SPEED = 36; // 光束光牆緩速往前（右）推進的速度
const SPECIAL_COOLDOWN = 200; // 防止連按瞬間倒光彈藥

/** 敵人移動模式：每種 kind 綁一個（見 moveEnemies 的 dispatch） */
type EnemyBehavior = 'straight' | 'sine' | 'zigzag' | 'diver' | 'turret';

const ENEMY_SPECS: Record<
  EnemyKind,
  {
    w: number;
    h: number;
    hp: number;
    speed: number;
    score: number;
    behavior: EnemyBehavior;
    fireMs?: number;
    /** zigzag 的垂直速度 / diver 的俯衝速度（px/s） */
    vy?: number;
  }
> = {
  drone: { w: 5, h: 4, hp: 1, speed: 28, score: 10, behavior: 'straight' },
  darter: { w: 4, h: 4, hp: 1, speed: 40, score: 15, behavior: 'sine' },
  bomber: { w: 7, h: 6, hp: 3, speed: 14, score: 30, behavior: 'straight', fireMs: 1600 },
  diver: { w: 5, h: 4, hp: 1, speed: 34, score: 20, behavior: 'diver', vy: 46 },
  zigzag: { w: 4, h: 4, hp: 1, speed: 30, score: 18, behavior: 'zigzag', vy: 42 },
  turret: { w: 6, h: 5, hp: 2, speed: 26, score: 25, behavior: 'turret', fireMs: 900 },
  swarm: { w: 3, h: 3, hp: 1, speed: 54, score: 8, behavior: 'straight' },
};

const ENEMY_BULLET_SPEED = 50;
// 砲塔：推進到此 x 停住、連射一段時間後離場
const TURRET_HOLD_X = 80;
const TURRET_HOLD_MS = 2600;

const BOSS_BASE_HP = 25;
const BOSS_HP_PER_LEVEL = 8;
const BOSS_SCORE = 100;
const BOSS_BULLET_SPEED = 55;
const BOSS_ENRAGE_HP = 0.4; // 血量低於此比例進入暴走
const BOSS_ENRAGE_FIRE_MUL = 0.65; // 暴走後開火間隔縮短

type BossAttack = 'aimed' | 'spread' | 'volley' | 'ring' | 'burst' | 'wall' | 'fan' | 'cross';
type BossMovement = 'sine' | 'slow' | 'fast' | 'hover';

interface BossDef {
  sprite: string;
  /** HP 在基礎×關卡之上再乘的倍率（讓重型 Boss 更肉） */
  hpMul: number;
  fireMs: number;
  /** 每次開火依序輪替的攻擊（不再單一固定，逼玩家應付多種彈型） */
  attacks: readonly BossAttack[];
  movement: BossMovement;
}

// 8 關各一隻：獨立像素圖（見 sprites.ts）＋各自一組輪替攻擊；打通後 bossForLevel 取模輪替
const BOSS_ROSTER: readonly BossDef[] = [
  { sprite: 'spr-boss', hpMul: 1.0, fireMs: 1100, attacks: ['aimed', 'spread'], movement: 'sine' }, // L1
  {
    sprite: 'spr-boss2',
    hpMul: 1.1,
    fireMs: 1200,
    attacks: ['spread', 'aimed', 'volley'],
    movement: 'sine',
  }, // L2
  {
    sprite: 'spr-boss3',
    hpMul: 1.3,
    fireMs: 1500,
    attacks: ['volley', 'aimed', 'wall'],
    movement: 'slow',
  }, // L3
  { sprite: 'spr-boss4', hpMul: 1.2, fireMs: 1700, attacks: ['ring', 'aimed'], movement: 'hover' }, // L4
  { sprite: 'spr-boss5', hpMul: 1.0, fireMs: 1500, attacks: ['burst', 'fan'], movement: 'fast' }, // L5
  {
    sprite: 'spr-boss6',
    hpMul: 1.5,
    fireMs: 1600,
    attacks: ['wall', 'volley', 'aimed'],
    movement: 'slow',
  }, // L6
  {
    sprite: 'spr-boss7',
    hpMul: 1.2,
    fireMs: 1300,
    attacks: ['fan', 'spread', 'aimed'],
    movement: 'sine',
  }, // L7
  {
    sprite: 'spr-boss8',
    hpMul: 1.6,
    fireMs: 1400,
    attacks: ['cross', 'wall', 'ring', 'burst'],
    movement: 'hover',
  }, // L8
];

/** movement → [sin 頻率, 振幅倍率] */
const BOSS_MOVE: Record<BossMovement, [number, number]> = {
  sine: [0.0015, 1],
  slow: [0.001, 1],
  fast: [0.0026, 1],
  hover: [0.0018, 0.4],
};

/** 第 level 關的 Boss：level 的純函式（不可用亂數），daily 同種子可重現 */
function bossForLevel(level: number): BossDef {
  return BOSS_ROSTER[(level - 1) % BOSS_ROSTER.length]!;
}

// LEVEL UP 畫面進場後的確認鎖定：吃掉打 Boss 時殘留的發射輸入，避免誤選最上面那張
const CHOOSE_LOCKOUT_MS = 300;
// 升級選卡版面（中文 12px 高；3 項須落在 14..70 的面板框內）
const CHOOSE_OPT_Y = 32;
const CHOOSE_OPT_GAP = 12;
const CHOOSE_CURSOR_DY = 3; // 英文游標垂直置中對齊中文列

type Phase = 'playing' | 'boss' | 'choosing' | 'gameover';

/** 場上物件可以是色塊（子彈）或像素美術圖（敵人、補給） */
type SpriteObj = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;

interface Mover {
  rect: SpriteObj;
  vx: number;
  vy?: number;
  pierce?: number;
  /** 單發傷害（預設 1；飛彈用） */
  damage?: number;
  blink?: Phaser.Time.TimerEvent;
}

interface WeaponDrop extends Mover {
  kind: WeaponKind;
}

interface Wheel {
  rect: Phaser.GameObjects.Image;
  /** 已輾過的敵人（穿透但每隻只結算一次） */
  hit: Set<Enemy>;
  hitBoss: boolean;
  spin: Phaser.Time.TimerEvent;
}

interface Beam {
  rect: Phaser.GameObjects.Rectangle;
  /** 已掃過的敵人（穿透但每隻只結算一次） */
  hit: Set<Enemy>;
  hitBoss: boolean;
}

interface Enemy {
  rect: SpriteObj;
  kind: EnemyKind;
  hp: number;
  /** 移動速度倍率（隨圈數微幅變快；第一圈為 1） */
  speedMul: number;
  age: number;
  baseY: number;
  /** 下次開火的 age（ms）；不開火的怪用不到 */
  nextFireAt: number;
  /** zigzag：當前帶正負號的垂直速度（撞邊界翻號） */
  vy?: number;
  /** diver：出生時鎖定的玩家高度，俯衝過去攔截 */
  targetY?: number;
  /** turret：0 推進 / 1 停住連射 / 2 離場 */
  state?: number;
  /** turret：停住連射到此 age 為止 */
  holdUntil?: number;
}

interface Boss {
  rect: SpriteObj;
  hp: number;
  maxHp: number;
  age: number;
  nextFireAt: number;
  bar: Phaser.GameObjects.Rectangle;
  def: BossDef;
  /** 進場停駐的 x（依 Boss 寬度而定） */
  holdX: number;
  /** 進場結束、開始上下漂浮的 age；用來讓 sin 從 0 起算、避免定位瞬間 y 跳一段 */
  holdAge: number | null;
  /** 攻擊輪替索引 */
  patternIdx: number;
  /** 是否已進入暴走（低血加速） */
  enraged: boolean;
}

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'arcade';
  private seed = 0;
  private dateStr = '';
  private pickupRng: () => number = Math.random;
  private keyC!: Phaser.Input.Keyboard.Key;
  private keyM!: Phaser.Input.Keyboard.Key;
  private copyHint: PixelText | null = null;
  /** 分享鍵在不可分享情境下的暫顯提示（1.5 秒後自動消失） */
  private shareHint: PixelText | null = null;
  /** 遊戲中「選單」鍵須在此期限（ms）前再按一次才返回選單，避免誤觸放棄這一局 */
  private menuArmedUntil = 0;
  private finalStreak = 0;
  private hull!: Hull;
  private stats!: PlayerStats;
  private ship!: Phaser.GameObjects.Container;
  private wingmanRects: Phaser.GameObjects.Rectangle[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private bullets: Mover[] = [];
  private enemyBullets: Mover[] = [];
  private enemies: Enemy[] = [];
  private pickups: Mover[] = [];
  private weaponRng: () => number = Math.random;
  private weapon: WeaponState = emptyWeapon();
  private weaponDrops: WeaponDrop[] = [];
  private wheels: Wheel[] = [];
  private beams: Beam[] = [];
  private keySpecialX!: Phaser.Input.Keyboard.Key;
  private keySpecial1!: Phaser.Input.Keyboard.Key;
  private keySwitch!: Phaser.Input.Keyboard.Key;
  private weaponHudObjs: Phaser.GameObjects.GameObject[] = [];
  private nextSpecialAt = 0;
  private specialHintShown = false;
  private boss: Boss | null = null;
  private backdrop!: Backdrop;
  private phase: Phase = 'playing';
  private level = 1;
  private timeline: SpawnEvent[] = [];
  private timelineIdx = 0;
  private elapsed = 0;
  private score = 0;
  private scoreText!: PixelText;
  private levelText!: PixelText;
  private nextFireAt = 0;
  private chooseUi: Phaser.GameObjects.GameObject[] = [];
  private chooseOptions: UpgradeDef[] = [];
  private chooseTexts: PixelText[] = [];
  private chooseCursor!: PixelText;
  private chooseIdx = 0;
  /** 早於此時間的確認輸入一律忽略（進場鎖定，防誤觸） */
  private chooseReadyAt = 0;
  /** 進升級畫面後須先放開空白鍵才解鎖確認，避免一直按著射擊的人一進畫面就誤選 */
  private chooseSpaceArmed = false;

  constructor() {
    super('game');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? 'arcade';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(NOKIA_BG);
    ensurePixelFont(this);
    ensureSprites(this);
    this.backdrop = new Backdrop(this);

    this.hull = new Hull();
    this.stats = defaultStats();
    this.wingmanRects = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.weapon = emptyWeapon();
    this.weaponDrops = [];
    this.wheels = [];
    this.beams = [];
    this.weaponHudObjs = [];
    this.nextSpecialAt = 0;
    this.specialHintShown = false;
    this.boss = null;
    this.phase = 'playing';
    this.level = 1;
    this.score = 0;
    this.nextFireAt = 0;
    this.chooseUi = [];
    this.copyHint = null;
    this.shareHint = null;
    this.menuArmedUntil = 0;
    if (this.mode === 'daily') {
      this.dateStr = localDateString();
      this.seed = dailySeed(this.dateStr);
    }
    this.startLevel();
    music.start(this.level);
    this.events.once('shutdown', () => music.stop());

    this.ship = this.add.container(8, PLAY_TOP + (PLAY_H - SHIP_H) / 2);
    this.redrawShip();

    this.scoreText = new PixelText(this, 2, 2, '0');
    this.levelText = new PixelText(this, 0, 2, 'L1');
    this.levelText.setX(GAME_WIDTH - 2 - this.levelText.textWidth);

    if (!this.input.keyboard) throw new Error('keyboard input unavailable');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyC = this.input.keyboard.addKey('C');
    this.keyM = this.input.keyboard.addKey('M');
    this.keySpecialX = this.input.keyboard.addKey('X');
    this.keySpecial1 = this.input.keyboard.addKey('ONE');
    this.keySwitch = this.input.keyboard.addKey('Z');

    // 畫面點擊只用於 GAME OVER 重開與升級選卡；移動／射擊一律走按鍵（鍵盤或手機殼按鍵）
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));

    // 補給固定間隔出現；位置在每日挑戰用種子子流、一般模式用 Math.random
    this.time.addEvent({ delay: PICKUP_SPAWN_MS, loop: true, callback: () => this.spawnPickup() });
    // 武器道具較稀有，間隔更長
    this.time.addEvent({
      delay: WEAPON_DROP_SPAWN_MS,
      loop: true,
      callback: () => this.spawnWeaponDrop(),
    });
  }

  /** 進入第 this.level 關：建時間軸、重設補給流、換背景與曲目 */
  private startLevel(): void {
    this.backdrop.setLevel(this.level);
    music.setLevel(this.level);
    this.timeline =
      this.mode === 'daily'
        ? generateTimeline(levelRng(this.seed, this.level, STREAM_WAVES), this.level)
        : levelTimeline(this.level);
    this.timelineIdx = 0;
    this.elapsed = 0;
    this.pickupRng =
      this.mode === 'daily' ? levelRng(this.seed, this.level, STREAM_PICKUPS) : Math.random;
    this.weaponRng =
      this.mode === 'daily' ? levelRng(this.seed, this.level, STREAM_WEAPONS) : Math.random;
  }

  update(time: number, delta: number): void {
    this.handleShareKey();
    if (this.phase === 'gameover') {
      this.updateGameOver();
      return;
    }
    if (this.phase === 'choosing') {
      this.updateChoosing(time);
      return;
    }

    this.backdrop.update(delta / 1000);
    if (Phaser.Input.Keyboard.JustDown(this.keyM)) this.handleMenuKey(time);

    this.movePlayer(delta);
    if (this.cursors.space.isDown && time >= this.nextFireAt) {
      this.fire(time);
    }
    if (
      (Phaser.Input.Keyboard.JustDown(this.keySpecialX) ||
        Phaser.Input.Keyboard.JustDown(this.keySpecial1)) &&
      time >= this.nextSpecialAt
    ) {
      this.fireSpecial(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keySwitch)) {
      this.cycleWeapon();
    }

    this.advanceTimeline(delta);
    this.updateBoss(delta);
    this.moveAll(this.bullets, delta, (m) => m.rect.x > GAME_WIDTH + 2);
    this.moveAll(this.enemyBullets, delta, (m) => m.rect.x < -4);
    this.moveEnemies(delta);
    this.movePickups(delta);
    this.moveWeaponDrops(delta);
    this.moveWheels(delta);
    this.moveBeams(delta);
    this.handleBulletHits();
    this.handleWheelHits();
    this.handleBeamHits();
    this.handlePlayerCollisions();
  }

  // ---- 觸控 ----

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.phase === 'gameover') {
      this.scene.restart({ mode: this.mode });
      return;
    }
    if (this.phase === 'choosing') {
      if (this.time.now < this.chooseReadyAt) return;
      const idx = Math.floor((p.y - 38) / 9);
      if (idx >= 0 && idx < this.chooseOptions.length) {
        this.chooseIdx = idx;
        this.confirmChoice(this.time.now);
      }
    }
  }

  // ---- 玩家 ----

  private movePlayer(delta: number): void {
    const step = (PLAYER_SPEED * delta) / 1000;
    // 鍵盤（桌面）；搖桿有輸入時改用搖桿的類比方向（手機），固定速度只取方向
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx -= 1;
    if (this.cursors.right.isDown) dx += 1;
    if (this.cursors.up.isDown) dy -= 1;
    if (this.cursors.down.isDown) dy += 1;
    if (joystickVector.x !== 0 || joystickVector.y !== 0) {
      dx = joystickVector.x;
      dy = joystickVector.y;
    }
    this.ship.x += dx * step;
    this.ship.y += dy * step;
    this.ship.x = Phaser.Math.Clamp(this.ship.x, 0, GAME_WIDTH - SHIP_W);
    this.ship.y = Phaser.Math.Clamp(this.ship.y, PLAY_TOP, PLAY_BOTTOM - SHIP_H);
    for (let i = 0; i < this.wingmanRects.length; i++) {
      const w = this.wingmanRects[i]!;
      w.setPosition(this.ship.x + 1, i === 0 ? this.ship.y - 5 : this.ship.y + SHIP_H + 3);
    }
  }

  private fire(time: number): void {
    // 船越小、射速越慢：武器強度跟船體像素數綁在一起
    const cooldown =
      Phaser.Math.Linear(FIRE_COOLDOWN_EMPTY, FIRE_COOLDOWN_FULL, this.hull.ratio) *
      this.stats.fireRateMul;
    this.nextFireAt = time + cooldown;
    sfx.shoot();
    this.spawnBullet(this.ship.x + SHIP_W, this.ship.y + 2);
    for (const w of this.wingmanRects) this.spawnBullet(w.x + 2, w.y);
  }

  private spawnBullet(x: number, y: number): void {
    const rect = this.add.rectangle(x, y, 2, 1, NOKIA_FG).setOrigin(0, 0);
    this.bullets.push({ rect, vx: BULLET_SPEED, pierce: this.stats.pierce });
  }

  private updateWingmen(): void {
    while (this.wingmanRects.length < this.stats.wingmen) {
      this.wingmanRects.push(this.add.rectangle(0, 0, 2, 2, NOKIA_FG).setOrigin(0, 0));
    }
  }

  // ---- 特殊武器（致敬原版的三種：飛彈／光束／光輪） ----

  private spawnWeaponDrop(): void {
    if (this.phase === 'choosing' || this.phase === 'gameover') return;
    const kind = pickWeaponKind(this.weaponRng);
    const y = PLAY_TOP + this.weaponRng() * (PLAY_H - 7);
    // 不閃爍，與補給十字區分；場上用 7×7 精緻版（HUD 仍用同造型的 5×5 spr-wpn-*）
    const rect = this.add.image(GAME_WIDTH + 2, y, `spr-drop-${kind}`).setOrigin(0, 0);
    this.weaponDrops.push({ rect, vx: -PICKUP_SPEED, kind });
  }

  private moveWeaponDrops(delta: number): void {
    for (let i = this.weaponDrops.length - 1; i >= 0; i--) {
      const d = this.weaponDrops[i]!;
      d.rect.x += (d.vx * delta) / 1000;
      if (d.rect.x < -8) {
        d.rect.destroy();
        this.weaponDrops.splice(i, 1);
      }
    }
  }

  private fireSpecial(time: number): void {
    const kind = fireWeapon(this.weapon);
    if (!kind) return;
    this.nextSpecialAt = time + SPECIAL_COOLDOWN;
    this.updateWeaponHud();
    if (kind === 'rocket') this.fireRocket();
    else if (kind === 'beam') this.fireBeam();
    else this.fireWheel();
  }

  /** 切換到下一把有彈藥的特殊武器（桌面 Z／手機殼 ⇄ 鍵） */
  private cycleWeapon(): void {
    switchWeapon(this.weapon);
    this.updateWeaponHud();
    if (this.weapon.current) sfx.key();
  }

  /** 飛彈：直線高傷，命中即耗（不穿透） */
  private fireRocket(): void {
    sfx.rocket();
    const rect = this.add
      .image(this.ship.x + SHIP_W, this.ship.y + 1, 'spr-rocket')
      .setOrigin(0, 0);
    this.bullets.push({ rect, vx: ROCKET_SPEED, damage: WEAPON_SPECS.rocket.damage });
  }

  /** 光束：一道貫穿戰鬥區的垂直光牆，緩速往前推進、穿透一切，每個目標只結算一次 */
  private fireBeam(): void {
    sfx.beam();
    const rect = this.add
      .rectangle(this.ship.x + SHIP_W, PLAY_TOP, 2, PLAY_H, NOKIA_FG)
      .setOrigin(0, 0);
    this.beams.push({ rect, hit: new Set(), hitBoss: false });
  }

  private moveBeams(delta: number): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]!;
      b.rect.x += (BEAM_SPEED * delta) / 1000;
      if (b.rect.x > GAME_WIDTH + 2) {
        b.rect.destroy();
        this.beams.splice(i, 1);
      }
    }
  }

  private handleBeamHits(): void {
    const dmg = WEAPON_SPECS.beam.damage;
    for (const b of this.beams) {
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei]!;
        if (b.hit.has(e) || !this.overlaps(b.rect, e.rect)) continue;
        b.hit.add(e);
        this.damageEnemy(e, ei, dmg);
      }
      const boss = this.boss;
      if (!b.hitBoss && boss && boss.rect.x <= boss.holdX + 2 && this.overlaps(b.rect, boss.rect)) {
        b.hitBoss = true;
        this.damageBoss(boss, dmg);
      }
    }
  }

  /** 光輪：緩速前進、穿透一切，每個目標只結算一次 */
  private fireWheel(): void {
    sfx.wheel();
    const rect = this.add.image(this.ship.x + SHIP_W, this.ship.y, 'spr-wheel-a').setOrigin(0, 0);
    const spin = this.time.addEvent({
      delay: WHEEL_SPIN_MS,
      loop: true,
      callback: () =>
        rect.setTexture(rect.texture.key === 'spr-wheel-a' ? 'spr-wheel-b' : 'spr-wheel-a'),
    });
    this.wheels.push({ rect, hit: new Set(), hitBoss: false, spin });
  }

  private moveWheels(delta: number): void {
    for (let i = this.wheels.length - 1; i >= 0; i--) {
      const w = this.wheels[i]!;
      w.rect.x += (WHEEL_SPEED * delta) / 1000;
      if (w.rect.x > GAME_WIDTH + 2) {
        w.spin.remove();
        w.rect.destroy();
        this.wheels.splice(i, 1);
      }
    }
  }

  private handleWheelHits(): void {
    const dmg = WEAPON_SPECS.wheel.damage;
    for (const w of this.wheels) {
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei]!;
        if (w.hit.has(e) || !this.overlaps(w.rect, e.rect)) continue;
        w.hit.add(e);
        this.damageEnemy(e, ei, dmg);
      }
      const boss = this.boss;
      if (!w.hitBoss && boss && boss.rect.x <= boss.holdX + 2 && this.overlaps(w.rect, boss.rect)) {
        w.hitBoss = true;
        this.damageBoss(boss, dmg);
      }
    }
  }

  /** HUD：關卡數左側顯示武器圖示＋剩餘彈藥 */
  /** HUD：頂部置中列出「持有的武器（有彈藥的）」圖示＋彈藥；當前那把底下加底線 */
  private updateWeaponHud(): void {
    for (const o of this.weaponHudObjs) o.destroy();
    this.weaponHudObjs = [];
    const owned = WEAPON_KINDS.filter((k) => this.weapon.ammo[k] > 0);
    if (owned.length === 0) return;
    const ICON_W = 5;
    const GAP_IN = 1; // 圖示與數字之間
    const GAP_OUT = 5; // 武器與武器之間
    const widths = owned.map((k) => ICON_W + GAP_IN + (String(this.weapon.ammo[k]).length * 4 - 1));
    const total = widths.reduce((a, b) => a + b, 0) + GAP_OUT * (owned.length - 1);
    let x = Math.round((GAME_WIDTH - total) / 2);
    owned.forEach((k, i) => {
      this.weaponHudObjs.push(this.add.image(x, 2, `spr-wpn-${k}`).setOrigin(0, 0));
      this.weaponHudObjs.push(
        new PixelText(this, x + ICON_W + GAP_IN, 2, String(this.weapon.ammo[k])),
      );
      if (k === this.weapon.current) {
        this.weaponHudObjs.push(this.add.rectangle(x, 7, widths[i]!, 1, NOKIA_FG).setOrigin(0, 0));
      }
      x += widths[i]! + GAP_OUT;
    });
  }

  /** 第一次撿到武器時提示發射鍵（每局一次） */
  private showSpecialHint(): void {
    if (this.specialHintShown) return;
    this.specialHintShown = true;
    const touch = this.sys.game.device.input.touch;
    const hint = this.centerText(58, touch ? '1 必殺' : 'X 必殺');
    this.time.delayedCall(1800, () => hint.destroy());
  }

  // ---- 波次與敵人 ----

  private advanceTimeline(delta: number): void {
    if (this.phase !== 'playing') return;
    this.elapsed += delta;
    while (this.timelineIdx < this.timeline.length) {
      const ev = this.timeline[this.timelineIdx]!;
      if (ev.t > this.elapsed) break;
      this.spawnEnemy(ev.kind, ev.y);
      this.timelineIdx++;
    }
    if (this.timelineIdx >= this.timeline.length && this.enemies.length === 0) {
      this.startBoss();
    }
  }

  private spawnEnemy(kind: EnemyKind, yRatio: number): void {
    const spec = ENEMY_SPECS[kind];
    const { hpBonus, speedMul } = enemyLoopScaling(this.level);
    const y = PLAY_TOP + yRatio * (PLAY_H - spec.h);
    const rect = this.add.image(GAME_WIDTH + 2, y, `spr-${kind}`).setOrigin(0, 0);
    const e: Enemy = {
      rect,
      kind,
      hp: spec.hp + hpBonus,
      speedMul,
      age: 0,
      baseY: y,
      nextFireAt: spec.fireMs ?? 0,
    };
    if (spec.behavior === 'zigzag') {
      // 上半場往下、下半場往上：朝中央走再撞邊反彈，路徑必跨整個高度
      e.vy = (y < GAME_HEIGHT / 2 ? spec.vy! : -spec.vy!) * speedMul;
    } else if (spec.behavior === 'diver') {
      e.targetY = Phaser.Math.Clamp(this.ship.y, PLAY_TOP, PLAY_BOTTOM - spec.h);
    } else if (spec.behavior === 'turret') {
      e.state = 0;
    }
    this.enemies.push(e);
  }

  private moveEnemies(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      const spec = ENEMY_SPECS[e.kind];
      e.age += delta;
      this.stepEnemy(e, spec, dt);
      // 砲塔只在停住（state 1）時連射，其餘有 fireMs 的怪一進畫面就射
      if (spec.fireMs && e.rect.x < GAME_WIDTH && e.age >= e.nextFireAt) {
        const canFire = spec.behavior !== 'turret' || e.state === 1;
        if (canFire) {
          e.nextFireAt = e.age + spec.fireMs;
          this.enemyFire(e);
        }
      }
      if (e.rect.x < -8) {
        e.rect.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  /** 依 behavior 推進單一敵人的位置 */
  private stepEnemy(e: Enemy, spec: (typeof ENEMY_SPECS)[EnemyKind], dt: number): void {
    const maxY = PLAY_BOTTOM - e.rect.height;
    const speed = spec.speed * e.speedMul;
    switch (spec.behavior) {
      case 'sine':
        e.rect.x -= speed * dt;
        e.rect.y = Phaser.Math.Clamp(e.baseY + Math.sin(e.age * 0.005) * 10, PLAY_TOP, maxY);
        break;
      case 'zigzag': {
        e.rect.x -= speed * dt;
        e.rect.y += (e.vy ?? 0) * dt;
        if (e.rect.y <= PLAY_TOP) {
          e.rect.y = PLAY_TOP;
          e.vy = Math.abs(e.vy ?? 0);
        } else if (e.rect.y >= maxY) {
          e.rect.y = maxY;
          e.vy = -Math.abs(e.vy ?? 0);
        }
        break;
      }
      case 'diver': {
        e.rect.x -= speed * dt;
        const dy = (e.targetY ?? e.rect.y) - e.rect.y;
        const step = (spec.vy ?? 0) * e.speedMul * dt;
        e.rect.y += Math.abs(dy) <= step ? dy : Math.sign(dy) * step;
        break;
      }
      case 'turret':
        if (e.state === 0) {
          e.rect.x -= speed * dt;
          if (e.rect.x <= TURRET_HOLD_X) {
            e.state = 1;
            e.holdUntil = e.age + TURRET_HOLD_MS;
            e.nextFireAt = e.age + 300;
          }
        } else if (e.state === 1) {
          if (e.age >= (e.holdUntil ?? 0)) e.state = 2;
        } else {
          e.rect.x -= speed * 1.4 * dt; // 離場加速
        }
        break;
      default: // straight（drone / bomber / swarm）
        e.rect.x -= speed * dt;
    }
  }

  /** 小兵開火：砲塔朝玩家瞄準，其餘固定直線往左；子彈沿用 enemyBullets 管線 */
  private enemyFire(e: Enemy): void {
    const spec = ENEMY_SPECS[e.kind];
    const sx = e.rect.x - 2;
    const sy = e.rect.y + spec.h / 2;
    if (spec.behavior === 'turret') {
      const dx = this.ship.x + SHIP_W / 2 - sx;
      const dy = this.ship.y + SHIP_H / 2 - sy;
      const len = Math.max(1, Math.hypot(dx, dy));
      this.spawnEnemyBullet(
        sx,
        sy,
        (dx / len) * ENEMY_BULLET_SPEED,
        (dy / len) * ENEMY_BULLET_SPEED,
      );
      return;
    }
    this.spawnEnemyBullet(sx, sy, -ENEMY_BULLET_SPEED, 0);
  }

  // ---- Boss ----

  private startBoss(): void {
    this.phase = 'boss';
    const def = bossForLevel(this.level);
    const maxHp = Math.round((BOSS_BASE_HP + (this.level - 1) * BOSS_HP_PER_LEVEL) * def.hpMul);
    const rect = this.add.image(GAME_WIDTH + 2, 0, def.sprite).setOrigin(0, 0);
    rect.y = PLAY_TOP + (PLAY_H - rect.height) / 2;
    const holdX = GAME_WIDTH - rect.width - 4;
    // 血條跟著 Boss 顯示在牠正下方（離開頂部 HUD，不與武器 HUD 衝突）
    const bar = this.add
      .rectangle(rect.x, rect.y + rect.height + 1, rect.width, 2, NOKIA_FG)
      .setOrigin(0, 0);
    this.boss = {
      rect,
      hp: maxHp,
      maxHp,
      age: 0,
      nextFireAt: 1500,
      bar,
      def,
      holdX,
      holdAge: null,
      patternIdx: 0,
      enraged: false,
    };
  }

  private updateBoss(delta: number): void {
    const boss = this.boss;
    if (!boss) return;
    boss.age += delta;
    // 進場：從右側滑入定位點
    if (boss.rect.x > boss.holdX) {
      boss.rect.x -= (20 * delta) / 1000;
    } else {
      // 進場結束才記下基準 age，讓 sin 從 0 起算（漂浮從正中央平滑展開，不會瞬移）
      if (boss.holdAge === null) boss.holdAge = boss.age;
      const [freq, ampMul] = BOSS_MOVE[boss.def.movement];
      const span = (PLAY_H - boss.rect.height) / 2;
      boss.rect.y = PLAY_TOP + span + Math.sin((boss.age - boss.holdAge) * freq) * span * ampMul;
      if (boss.age >= boss.nextFireAt) {
        const fireMs = boss.enraged ? boss.def.fireMs * BOSS_ENRAGE_FIRE_MUL : boss.def.fireMs;
        boss.nextFireAt = boss.age + fireMs;
        this.bossFire(boss);
      }
    }
    // 血條跟著 Boss（在牠正下方），離開頂部 HUD 區
    boss.bar.x = boss.rect.x;
    boss.bar.y = boss.rect.y + boss.rect.height + 1;
  }

  /** Boss 攻擊：依該 Boss 的 attack 模式發射 */
  private bossFire(boss: Boss): void {
    const sx = boss.rect.x - 1;
    const sy = boss.rect.y + boss.rect.height / 2;
    const rowY = (r: number, n: number) => PLAY_TOP + r * (PLAY_H / (n - 1));
    // 依序輪替攻擊：同一隻 Boss 每次開火打不同彈型
    const attack = boss.def.attacks[boss.patternIdx % boss.def.attacks.length]!;
    boss.patternIdx++;
    switch (attack) {
      case 'spread':
        for (const off of [-0.35, 0, 0.35]) this.bossAimed(sx, sy, off);
        break;
      case 'fan':
        for (let a = -2; a <= 2; a++) this.bossAimed(sx, sy, a * 0.28);
        break;
      case 'volley': // 橫向彈幕：多列直線往左齊射
        for (let r = 0; r < 5; r++) this.spawnEnemyBullet(sx, rowY(r, 5), -BOSS_BULLET_SPEED, 0);
        break;
      case 'wall': {
        // 直線彈牆、留一個隨時間輪動的缺口（對齊缺口才躲得過）
        const gap = Math.floor(boss.age / boss.def.fireMs) % 6;
        for (let r = 0; r < 6; r++) {
          if (r === gap) continue;
          this.spawnEnemyBullet(sx, rowY(r, 6), -BOSS_BULLET_SPEED * 0.8, 0);
        }
        break;
      }
      case 'ring':
        this.bossRing(sx, sy);
        break;
      case 'cross':
        this.bossRing(sx, sy);
        this.bossAimed(sx, sy, 0);
        break;
      case 'burst': // 瞄準三連發
        this.bossAimed(sx, sy, 0);
        for (const d of [160, 320]) {
          this.time.delayedCall(d, () => {
            if (this.boss === boss) {
              this.bossAimed(boss.rect.x - 1, boss.rect.y + boss.rect.height / 2, 0);
            }
          });
        }
        break;
      default: // aimed：瞄準單發
        this.bossAimed(sx, sy, 0);
    }
  }

  /** 朝玩家發射一發，angleOffset 為相對瞄準方向的弧度偏移（散射用） */
  private bossAimed(sx: number, sy: number, angleOffset: number): void {
    const dx = this.ship.x + SHIP_W / 2 - sx;
    const dy = this.ship.y + SHIP_H / 2 - sy;
    const ang = Math.atan2(dy, dx) + angleOffset;
    this.spawnEnemyBullet(
      sx,
      sy,
      Math.cos(ang) * BOSS_BULLET_SPEED,
      Math.sin(ang) * BOSS_BULLET_SPEED,
    );
  }

  /** 八方環狀散射 */
  private bossRing(sx: number, sy: number): void {
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      this.spawnEnemyBullet(
        sx,
        sy,
        Math.cos(ang) * BOSS_BULLET_SPEED,
        Math.sin(ang) * BOSS_BULLET_SPEED,
      );
    }
  }

  private spawnEnemyBullet(x: number, y: number, vx: number, vy: number): void {
    const rect = this.add.rectangle(x, y, 2, 2, NOKIA_FG).setOrigin(0, 0);
    this.enemyBullets.push({ rect, vx, vy });
  }

  /** 暴走：開火加速，並用震動＋硬切閃爍預告（不靠 alpha，維持嚴格雙色） */
  private enrageBoss(boss: Boss): void {
    boss.enraged = true;
    this.cameras.main.shake(140, 0.012);
    boss.rect.setVisible(false);
    for (const [d, vis] of [
      [80, true],
      [160, false],
      [240, true],
    ] as const) {
      this.time.delayedCall(d, () => {
        if (boss.rect.active) boss.rect.setVisible(vis);
      });
    }
  }

  private damageBoss(boss: Boss, amount: number): void {
    boss.hp -= amount;
    boss.bar.scaleX = Math.max(0, boss.hp / boss.maxHp);
    if (boss.hp > 0) {
      if (!boss.enraged && boss.hp <= boss.maxHp * BOSS_ENRAGE_HP) this.enrageBoss(boss);
      return;
    }
    sfx.explode();
    this.burst(boss.rect.x + boss.rect.width / 2, boss.rect.y + boss.rect.height / 2, 20);
    boss.rect.destroy();
    boss.bar.destroy();
    this.boss = null;
    for (const b of this.enemyBullets) b.rect.destroy();
    this.enemyBullets = [];
    this.addScore(BOSS_SCORE + (this.level - 1) * 50);
    // 打通最後一關：慶祝一下再進升級，之後 Boss roster 輪替續爬
    if (this.level === LEVEL_PLANS.length) {
      const banner = this.centerText(34, '全破!');
      this.time.delayedCall(1600, () => {
        banner.destroy();
        this.startChoosing();
      });
    } else {
      this.startChoosing();
    }
  }

  // ---- 補給 ----

  private spawnPickup(): void {
    if (this.phase === 'choosing' || this.phase === 'gameover') return;
    // C：存活率夠高時不生成，補給只在受傷時才來（風險回報）
    if (this.hull.ratio > PICKUP_HEALTH_GATE) return;
    // D：到了生成時機也非必掉，再過一道機率閘增加不確定性
    if (this.pickupRng() > PICKUP_SPAWN_CHANCE) return;
    const y = PLAY_TOP + this.pickupRng() * (PLAY_H - 6);
    const rect = this.add.image(GAME_WIDTH + 2, y, 'spr-pickup').setOrigin(0, 0);
    // LCD 風格硬切閃爍（不用 alpha 漸變，維持嚴格雙色）
    const blink = this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => rect.setVisible(!rect.visible),
    });
    this.pickups.push({ rect, vx: -PICKUP_SPEED, blink });
  }

  private movePickups(delta: number): void {
    const cx = this.ship.x + SHIP_W / 2;
    const cy = this.ship.y + SHIP_H / 2;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]!;
      p.rect.x += (p.vx * delta) / 1000;
      if (this.stats.magnet) {
        const dx = cx - p.rect.x;
        const dy = cy - p.rect.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist < MAGNET_RADIUS) {
          p.rect.x += ((dx / dist) * MAGNET_PULL * delta) / 1000;
          p.rect.y += ((dy / dist) * MAGNET_PULL * delta) / 1000;
        }
      }
      if (p.rect.x < -8) {
        this.destroyPickup(i);
      }
    }
  }

  private destroyPickup(index: number): void {
    const p = this.pickups[index]!;
    p.blink?.remove();
    p.rect.destroy();
    this.pickups.splice(index, 1);
  }

  // ---- 移動與碰撞 ----

  private moveAll(list: Mover[], delta: number, offscreen: (m: Mover) => boolean): void {
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]!;
      m.rect.x += (m.vx * delta) / 1000;
      if (m.vy) m.rect.y += (m.vy * delta) / 1000;
      if (offscreen(m) || m.rect.y < -4 || m.rect.y > GAME_HEIGHT + 4) {
        m.rect.destroy();
        list.splice(i, 1);
      }
    }
  }

  private handleBulletHits(): void {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi]!;
      let spent = false;
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei]!;
        if (!this.overlaps(b.rect, e.rect)) continue;
        this.damageEnemy(e, ei, b.damage ?? 1);
        if (b.pierce && b.pierce > 0) {
          b.pierce--;
        } else {
          spent = true;
          break;
        }
      }
      if (!spent && this.boss && this.boss.rect.x <= this.boss.holdX + 2) {
        if (this.overlaps(b.rect, this.boss.rect)) {
          this.damageBoss(this.boss, b.damage ?? 1);
          spent = true;
        }
      }
      if (spent) {
        b.rect.destroy();
        this.bullets.splice(bi, 1);
      }
    }
  }

  private damageEnemy(e: Enemy, index: number, amount = 1): void {
    e.hp -= amount;
    if (e.hp > 0) {
      // 未死：硬切閃爍表示受擊（不用 alpha 漸變，維持嚴格雙色）
      e.rect.setVisible(false);
      this.time.delayedCall(60, () => {
        if (e.rect.active) e.rect.setVisible(true);
      });
      return;
    }
    const spec = ENEMY_SPECS[e.kind];
    sfx.explode();
    this.burst(e.rect.x + spec.w / 2, e.rect.y + spec.h / 2, 5);
    e.rect.destroy();
    this.enemies.splice(index, 1);
    this.addScore(spec.score);
  }

  private handlePlayerCollisions(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (this.hitsHull(e.rect)) {
        this.burst(e.rect.x + 2, e.rect.y + 2, 5);
        e.rect.destroy();
        this.enemies.splice(i, 1);
        this.damagePlayer(PEEL_PER_CRASH);
        if (this.phase === 'gameover') return;
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i]!;
      if (this.hitsHull(b.rect)) {
        b.rect.destroy();
        this.enemyBullets.splice(i, 1);
        this.damagePlayer(PEEL_PER_SHOT);
        if (this.phase === 'gameover') return;
      }
    }
    if (this.boss && this.hitsHull(this.boss.rect)) {
      // 撞 Boss：剝落並被往左彈開
      this.ship.x = Math.max(0, this.ship.x - 12);
      this.damagePlayer(PEEL_PER_CRASH);
      if (this.phase === 'gameover') return;
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]!;
      if (this.hitsHull(p.rect)) {
        this.destroyPickup(i);
        sfx.pickup();
        this.hull.restore(RESTORE_PER_PICKUP);
        this.redrawShip();
      }
    }
    for (let i = this.weaponDrops.length - 1; i >= 0; i--) {
      const d = this.weaponDrops[i]!;
      if (this.hitsHull(d.rect)) {
        d.rect.destroy();
        this.weaponDrops.splice(i, 1);
        sfx.pickup();
        collectWeapon(this.weapon, d.kind);
        this.updateWeaponHud();
        this.showSpecialHint();
      }
    }
  }

  /** 對「實際存活的每顆船體像素」做碰撞，船變小受擊面積就真的變小 */
  private hitsHull(rect: SpriteObj): boolean {
    for (const p of this.hull.pixels()) {
      if (
        rect.x < this.ship.x + p.x + 1 &&
        rect.x + rect.width > this.ship.x + p.x &&
        rect.y < this.ship.y + p.y + 1 &&
        rect.y + rect.height > this.ship.y + p.y
      ) {
        return true;
      }
    }
    return false;
  }

  private overlaps(a: SpriteObj, b: SpriteObj): boolean {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  private damagePlayer(amount: number): void {
    const removed = this.hull.peel(amount);
    for (const p of removed) {
      this.burst(this.ship.x + p.x, this.ship.y + p.y, 1);
    }
    sfx.hit();
    this.redrawShip();
    this.cameras.main.shake(60, 0.01);
    if (this.hull.isDestroyed) this.die();
  }

  private die(): void {
    this.phase = 'gameover';
    music.stop();
    sfx.gameover();
    this.ship.setVisible(false);
    for (const w of this.wingmanRects) w.destroy();
    this.wingmanRects = [];
    this.burst(this.ship.x + SHIP_W / 2, this.ship.y + SHIP_H / 2, 14);
    const save = loadSave();
    if (this.mode === 'arcade') {
      const updated = applyArcadeResult(save, this.score);
      persistSave(updated);
      this.centerText(14, '失敗');
      this.centerText(28, `得分 ${this.score}`);
      this.centerText(42, this.score >= updated.highScore ? '新高!' : `最高 ${updated.highScore}`);
      this.centerText(58, '開火重來  M 返回');
    } else {
      const updated = applyDailyResult(save, this.dateStr, this.score, this.level);
      persistSave(updated);
      this.finalStreak = updated.daily.streak;
      // 中文較高，每日結算 5 行：失敗／得分／連勝／開火重來／C 分享 M 返回
      this.centerText(8, '失敗');
      this.centerText(20, `得分 ${this.score}`);
      this.centerText(32, `連勝 ${this.finalStreak}`);
      this.centerText(44, '開火重來');
      this.copyHint = this.centerText(56, 'C 分享  M 返回');
    }
  }

  private updateGameOver(): void {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      this.scene.restart({ mode: this.mode });
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
      this.scene.start('menu');
      return;
    }
  }

  /**
   * 分享鍵（手機殼「分享」或 C）：只有每日結算畫面能真的分享；
   * 其餘情境（街機、遊戲中）給明確暫顯提示，而不是默默無效。
   */
  private handleShareKey(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.keyC)) return;
    if (this.mode !== 'daily') {
      this.flashHint('DAILY ONLY');
      return;
    }
    if (this.phase !== 'gameover') {
      this.flashHint('FINISH FIRST');
      return;
    }
    this.shareResult();
  }

  /** 每日結算分享：手機優先用原生分享面板，不支援再退回剪貼簿，都不行則提示失敗 */
  private shareResult(): void {
    const text = shareText(this.dateStr, this.score, this.level, this.finalStreak);
    if (navigator.share) {
      navigator
        .share({ text })
        .then(() => this.setCopyHint('已分享'))
        .catch((err: unknown) => {
          // 使用者主動取消分享面板：保持原提示；其他失敗才退回剪貼簿
          if (err instanceof Error && err.name === 'AbortError') return;
          this.copyToClipboard(text);
        });
      return;
    }
    this.copyToClipboard(text);
  }

  private copyToClipboard(text: string): void {
    if (!navigator.clipboard) {
      this.setCopyHint('分享失敗');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => this.setCopyHint('已分享'))
      .catch(() => this.setCopyHint('分享失敗'));
  }

  /** 更新結算畫面的分享提示文字並維持水平置中 */
  private setCopyHint(text: string): void {
    if (!this.copyHint) return;
    this.copyHint.setText(text);
    this.copyHint.setX(Math.floor(GAME_WIDTH / 2 - this.copyHint.textWidth / 2));
  }

  /** 暫顯一行提示，1.5 秒後消失；重複按下會取代上一則 */
  private flashHint(text: string): void {
    this.shareHint?.destroy();
    // 結算畫面下半已被失敗／得分／最高／頁尾佔滿，提示改放最上方空白處避免疊字
    const y = this.phase === 'gameover' ? 8 : 58;
    const hint = this.centerText(y, text);
    this.shareHint = hint;
    this.time.delayedCall(1500, () => {
      if (this.shareHint === hint) this.shareHint = null;
      hint.destroy();
    });
  }

  /** 遊戲中按「選單」鍵：先閃「M 返回」，1.5 秒內再按一次才返回選單（防誤觸） */
  private handleMenuKey(time: number): void {
    if (time < this.menuArmedUntil) {
      this.scene.start('menu');
      return;
    }
    this.menuArmedUntil = time + 1500;
    this.flashHint('M 返回');
  }

  // ---- 升級三選一 ----

  private startChoosing(): void {
    this.phase = 'choosing';
    // 每日挑戰用種子子流：同樣的升級路線必然看到同樣的選項
    const rng =
      this.mode === 'daily' ? levelRng(this.seed, this.level, STREAM_UPGRADES) : Math.random;
    this.chooseOptions = pickUpgradeChoices(this.stats, rng);
    this.chooseIdx = 0;
    this.chooseReadyAt = this.time.now + CHOOSE_LOCKOUT_MS;
    this.chooseSpaceArmed = false;
    const panelX = (GAME_WIDTH - 100) / 2;
    const optX = Math.floor(GAME_WIDTH / 2 - 12); // 2 字中文置中
    const panel = this.add
      .rectangle(panelX, 14, 100, 56, NOKIA_BG)
      .setOrigin(0, 0)
      .setStrokeStyle(1, NOKIA_FG);
    const title = this.centerText(18, '升級');
    this.chooseTexts = this.chooseOptions.map(
      (u, i) => new PixelText(this, optX, CHOOSE_OPT_Y + i * CHOOSE_OPT_GAP, u.name),
    );
    this.chooseCursor = new PixelText(this, optX - 7, CHOOSE_OPT_Y + CHOOSE_CURSOR_DY, '>');
    this.chooseUi = [panel, title, this.chooseCursor, ...this.chooseTexts];
  }

  private updateChoosing(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.chooseIdx = (this.chooseIdx + this.chooseOptions.length - 1) % this.chooseOptions.length;
      sfx.key();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.chooseIdx = (this.chooseIdx + 1) % this.chooseOptions.length;
      sfx.key();
    }
    this.chooseCursor.setY(CHOOSE_OPT_Y + this.chooseIdx * CHOOSE_OPT_GAP + CHOOSE_CURSOR_DY);
    // 須先觀察到空白鍵放開一次才解鎖；之後再按下才算數（一直按著射擊不會誤觸）
    if (this.cursors.space.isUp) this.chooseSpaceArmed = true;
    if (time >= this.chooseReadyAt && this.chooseSpaceArmed && this.cursors.space.isDown) {
      this.confirmChoice(time);
    }
  }

  private confirmChoice(time: number): void {
    sfx.upgrade();
    const choice = this.chooseOptions[this.chooseIdx]!;
    choice.apply(this.stats);
    if (choice.id === 'repair') {
      this.hull.restore(RESTORE_PER_REPAIR);
      this.redrawShip();
    }
    this.updateWingmen();
    for (const obj of this.chooseUi) obj.destroy();
    this.chooseUi = [];

    this.level++;
    this.levelText.setText(`L${this.level}`);
    this.levelText.setX(GAME_WIDTH - 2 - this.levelText.textWidth);
    this.startLevel();
    this.nextFireAt = time + 400;
    this.phase = 'playing';
  }

  // ---- 共用 ----

  private addScore(points: number): void {
    this.score += points;
    this.scoreText.setText(String(this.score));
  }

  private centerText(y: number, text: string): PixelText {
    const t = new PixelText(this, 0, y, text);
    t.setX(Math.floor(GAME_WIDTH / 2 - t.textWidth / 2));
    return t;
  }

  private redrawShip(): void {
    this.ship.removeAll(true);
    for (const p of this.hull.pixels()) {
      this.ship.add(
        new Phaser.GameObjects.Rectangle(this, p.x, p.y, 1, 1, NOKIA_FG).setOrigin(0, 0),
      );
    }
  }

  /** 像素四散效果（純視覺，不影響玩法判定，用 Math.random 無妨；不做 alpha 淡出，維持嚴格雙色） */
  private burst(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const r = this.add.rectangle(x, y, 1, 1, NOKIA_FG).setOrigin(0, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 14;
      this.tweens.add({
        targets: r,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        duration: 350 + Math.random() * 200,
        onComplete: () => r.destroy(),
      });
    }
  }
}
