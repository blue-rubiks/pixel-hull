/**
 * 8-bit 音效：WebAudio 方波直接合成，不用音檔（PLANNING.md §5——
 * 原版接近無聲，「按鍵嗶嗶聲」風格反而更對味）。
 */

let ctx: AudioContext | null = null;
let muted = false; // 全域靜音：音樂＋音效（啟動時由 storage 經 setMuted 回填）

function audio(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null; // 不支援 WebAudio：遊戲照玩、只是無聲
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function beep(freqFrom: number, freqTo: number, duration: number, volume = 0.04): void {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freqFrom, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), c.currentTime + duration);
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const sfx = {
  /** 射擊：短促下滑 */
  shoot: (): void => beep(880, 220, 0.06, 0.025),
  /** 敵人爆炸 */
  explode: (): void => beep(220, 40, 0.18),
  /** 玩家被打中（剝落） */
  hit: (): void => beep(150, 50, 0.15),
  /** 吃到補給：上行雙音 */
  pickup: (): void => {
    beep(660, 660, 0.06);
    setTimeout(() => beep(990, 990, 0.08), 70);
  },
  /** 選到升級：小琶音 */
  upgrade: (): void => {
    beep(523, 523, 0.07);
    setTimeout(() => beep(659, 659, 0.07), 80);
    setTimeout(() => beep(784, 784, 0.1), 160);
  },
  /** 飛彈：低音推進 */
  rocket: (): void => beep(320, 90, 0.18, 0.045),
  /** 光束：高頻 zap */
  beam: (): void => beep(1800, 500, 0.12, 0.04),
  /** 光輪：低鳴滾動 */
  wheel: (): void => beep(140, 260, 0.3, 0.05),
  /** 死亡：長下滑 */
  gameover: (): void => beep(440, 30, 0.6, 0.05),
  /** 按鍵嗶 */
  key: (): void => beep(1200, 1200, 0.03, 0.02),
};

/**
 * 每關背景音樂：方波 lead + 三角波 bass 的程序化 chiptune 循環（零音檔、不增打包）。
 * lookahead 排程器（每 25ms 預排未來 ~120ms 的音符），避免 setInterval 抖動造成破音。
 * 音量壓在 SFX(0.04) 之下，讓音效仍蓋得過去。
 */

const MIN_PENT = [0, 3, 5, 7, 10] as const;
const MAJ_PENT = [0, 2, 4, 7, 9] as const;

interface Track {
  bpm: number;
  root: number; // 半音偏移（自 A2 = 110Hz 起算）
  scale: readonly number[];
  lead: readonly number[]; // 16 個 16 分音符；值為 scale 索引，-1 = 休止
}

// 8 關各一段：調性、速度、旋律都不同；逐關升 root／加速＝越打越緊張
const TRACKS: readonly Track[] = [
  {
    bpm: 96,
    root: 0,
    scale: MAJ_PENT,
    lead: [0, -1, 2, -1, 1, -1, 2, -1, 0, -1, 2, -1, 3, -1, 2, -1],
  },
  {
    bpm: 104,
    root: 2,
    scale: MIN_PENT,
    lead: [0, 2, -1, 1, 2, -1, 3, 2, 0, 2, -1, 1, 4, -1, 3, -1],
  },
  { bpm: 112, root: 5, scale: MIN_PENT, lead: [0, -1, 1, 2, -1, 3, 2, 1, 0, -1, 1, 2, 4, 3, 2, 1] },
  { bpm: 120, root: 3, scale: MIN_PENT, lead: [0, 0, 2, 2, 1, 1, 3, 3, 0, 0, 2, 2, 4, 3, 2, -1] },
  {
    bpm: 116,
    root: 7,
    scale: MAJ_PENT,
    lead: [2, -1, 0, -1, 3, -1, 1, -1, 2, -1, 4, 3, 2, 1, 0, -1],
  },
  { bpm: 126, root: 5, scale: MIN_PENT, lead: [0, 3, 2, 1, 0, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1] },
  { bpm: 132, root: 8, scale: MIN_PENT, lead: [4, 3, 2, 1, 0, -1, 2, -1, 4, 3, 2, 1, 3, 2, 1, 0] },
  { bpm: 140, root: 10, scale: MIN_PENT, lead: [0, 2, 4, 2, 1, 3, 2, 4, 0, 2, 4, 2, 3, 4, 2, 1] },
];

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12; // s

let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let curTrack = 0;
let step = 0;
let nextNoteTime = 0; // AudioContext 時間

/** scale 第 degree 階（可超出八度自動進位）轉頻率 */
function noteFreq(root: number, scale: readonly number[], degree: number): number {
  const oct = Math.floor(degree / scale.length);
  const semis = root + scale[degree % scale.length]! + 12 * oct;
  return 110 * 2 ** (semis / 12);
}

function tone(
  c: AudioContext,
  freq: number,
  t: number,
  dur: number,
  peak: number,
  type: OscillatorType,
): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(musicGain!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function scheduleStep(c: AudioContext, s: number, t: number, spb: number): void {
  const tr = TRACKS[curTrack]!;
  const deg = tr.lead[s]!;
  if (deg >= 0) tone(c, noteFreq(tr.root + 12, tr.scale, deg), t, spb * 0.9, 0.03, 'square');
  if (s % 4 === 0) {
    const bass = (s / 4) % 2 === 0 ? 0 : 2; // 拍點交替走根音／第三階，做出律動
    tone(c, noteFreq(tr.root - 12, tr.scale, bass), t, spb * 3.5, 0.045, 'triangle');
  }
}

function scheduler(): void {
  const c = audio();
  if (!c) return;
  const spb = 60 / TRACKS[curTrack]!.bpm / 4; // 一個 16 分音符的秒數
  while (nextNoteTime < c.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(c, step, nextNoteTime, spb);
    nextNoteTime += spb;
    step = (step + 1) % 16;
  }
}

export const music = {
  /** 開始播放（第 level 關曲目）；重複呼叫安全 */
  start(level: number): void {
    const c = audio();
    if (!c) return;
    if (!musicGain) {
      musicGain = c.createGain();
      musicGain.gain.value = muted ? 0 : 1;
      musicGain.connect(c.destination);
    }
    curTrack = (level - 1) % TRACKS.length;
    step = 0;
    nextNoteTime = c.currentTime + 0.05;
    if (musicTimer === null) musicTimer = window.setInterval(scheduler, LOOKAHEAD_MS);
  },
  /** 切關換曲（不打斷排程器） */
  setLevel(level: number): void {
    curTrack = (level - 1) % TRACKS.length;
    step = 0;
  },
  /** 停止（清排程器；已排入的尾音會自然播完） */
  stop(): void {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  },
};

/** 全域靜音（音樂＋音效）；狀態持久化由呼叫端負責 */
export function setMuted(value: boolean): void {
  muted = value;
  if (musicGain) musicGain.gain.value = muted ? 0 : 1;
}

export function isMuted(): boolean {
  return muted;
}
