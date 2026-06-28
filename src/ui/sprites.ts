import Phaser from 'phaser';
import { NOKIA_FG_CSS } from '../core/constants.ts';

/**
 * 自繪雙色像素美術（PLANNING.md §6：所有像素美術自己重畫，不抄原版）。
 * 尺寸必須與 GameScene 的 ENEMY_SPECS / BOSS 常數一致。
 * 雙色限制下「精緻」靠剪影＋鏤空（座艙／引擎／砲口用負空間表現），不靠色階。
 */
const SPRITES: Record<string, readonly string[]> = {
  'spr-drone': [
    // 5×4 小飛碟：圓頂→碟盤→座艙窗→雙引擎燈
    '.XXX.',
    'XXXXX',
    'XX.XX',
    '.X.X.',
  ],
  'spr-darter': [
    // 4×4 突進箭頭（朝左）：乾淨的「<」尖端朝玩家
    '.XX.',
    'XX..',
    'XX..',
    '.XX.',
  ],
  'spr-bomber': [
    // 7×6 重型轟炸艇：上下對稱、中段雙砲口、底部雙噴口
    '..XXX..',
    '.XXXXX.',
    'XX.X.XX',
    'XXXXXXX',
    '.XXXXX.',
    '..X.X..',
  ],
  'spr-diver': [
    // 5×4 俯衝艇：機鼻偏上左、斜插下衝、尾端雙引擎
    'XX...',
    'XXXX.',
    '.XXXX',
    '..X.X',
  ],
  'spr-zigzag': [
    // 4×4 鋸齒兵：菱形環（鏤空），與 darter 的實心箭頭區隔
    '.XX.',
    'X..X',
    'X..X',
    '.XX.',
  ],
  'spr-turret': [
    // 6×5 砲塔：左側中段凸出長砲管、基座開兩個艙口
    '...XXX',
    '.XX.XX',
    'XXXXXX',
    '.XX.XX',
    '...XXX',
  ],
  'spr-swarm': [
    // 3×3 群湧快兵：迷你箭頭（朝左）
    '.XX',
    'XXX',
    '.XX',
  ],
  'spr-boss': [
    // 11×9 關底魔王：左右對稱、上下武器莢艙＋中央砲口＋雙引擎
    '...XXXXX...',
    '..XXXXXXX..',
    '.XX.XXX.XX.',
    'XXXXXXXXXXX',
    'XX.XXXXX.XX',
    'XXXXXXXXXXX',
    '.XX.XXX.XX.',
    '..XXXXXXX..',
    '...XX.XX...',
  ],
  'spr-boss2': [
    // 11×9 雙叉殲星艦（L2）：左側中段張開大口、散射
    '..XXXXXXXXX',
    '.XXXXXXXXXX',
    'XXXXXXXXXXX',
    'XX..XXXXXXX',
    'X...XXXXXXX',
    'XX..XXXXXXX',
    'XXXXXXXXXXX',
    '.XXXXXXXXXX',
    '..XXXXXXXXX',
  ],
  'spr-boss3': [
    // 13×9 寬體砲艇（L3）：圓角艦體＋上下兩排砲口、橫向彈幕
    '..XXXXXXXXX..',
    '.XXXXXXXXXXX.',
    'XXXXXXXXXXXXX',
    'XX.X.X.X.X.XX',
    'XXXXXXXXXXXXX',
    'XX.X.X.X.X.XX',
    'XXXXXXXXXXXXX',
    '.XXXXXXXXXXX.',
    '..XXXXXXXXX..',
  ],
  'spr-boss4': [
    // 11×11 核心球（L4）：圓盤中央懸浮單點核心、環狀散射
    '...XXXXX...',
    '.XXXXXXXXX.',
    '.XXXXXXXXX.',
    'XXXXXXXXXXX',
    'XXXX...XXXX',
    'XXXX.X.XXXX',
    'XXXX...XXXX',
    'XXXXXXXXXXX',
    '.XXXXXXXXX.',
    '.XXXXXXXXX.',
    '...XXXXX...',
  ],
  'spr-boss5': [
    // 9×9 攔截機（L5）：尖鼻朝左、後掠機翼、座艙鏤空，瞄準三連發
    '.....XXXX',
    '...XXXXXX',
    '.XXXXXXXX',
    'XXXX..XXX',
    'XXXXXXXXX',
    'XXXX..XXX',
    '.XXXXXXXX',
    '...XXXXXX',
    '.....XXXX',
  ],
  'spr-boss6': [
    // 13×11 要塞（L6）：上下城垛、角砲台、中央反應爐，彈牆留缺口
    'X.X.X.X.X.X.X',
    'XXXXXXXXXXXXX',
    'XXX.XXXXX.XXX',
    'XXXXXXXXXXXXX',
    'XX.XX.X.XX.XX',
    'XXXXX.X.XXXXX',
    'XX.XX.X.XX.XX',
    'XXXXXXXXXXXXX',
    'XXX.XXXXX.XXX',
    'XXXXXXXXXXXXX',
    'X.X.X.X.X.X.X',
  ],
  'spr-boss7': [
    // 11×9 翼艦（L7）：前後雙翼尖、中央座艙眼，五向扇形散射
    'XX.......XX',
    'XXX.....XXX',
    'XXXX...XXXX',
    'XXXXX.XXXXX',
    'XXXX.X.XXXX',
    'XXXXX.XXXXX',
    'XXXX...XXXX',
    'XXX.....XXX',
    'XX.......XX',
  ],
  'spr-boss8': [
    // 13×11 終焉無畏艦（L8）：指揮尖塔＋艦橋＋中央反應爐核心＋雙引擎艙，環射＋瞄準
    '......X......',
    '.....XXX.....',
    '....XXXXX....',
    '..XXXXXXXXX..',
    '.XXXXXXXXXXX.',
    'XXXXX...XXXXX',
    'XXXX.XXX.XXXX',
    'XXXXX...XXXXX',
    '.XXXXXXXXXXX.',
    'XX.XXXXXXX.XX',
    'XX..XXXXX..XX',
  ],
  'spr-pickup': [
    // 3×3 補給（十字）
    '.X.',
    'XXX',
    '.X.',
  ],
  // HUD 用的小圖（5×5）：與下方 spr-drop-* 同造型，撿到的＝HUD 顯示的
  'spr-wpn-rocket': [
    // 飛彈：雙箭頭（»）朝右
    'X.X..',
    '.X.X.',
    '..X.X',
    '.X.X.',
    'X.X..',
  ],
  'spr-wpn-beam': [
    // 光束：頂部發射口＋朝下豎貫
    'XXXXX',
    '.XXX.',
    '..X..',
    '..X..',
    '..X..',
  ],
  'spr-wpn-wheel': [
    // 光輪：乾淨空心環（拿掉中心點，與補血十字區分）
    '.XXX.',
    'X...X',
    'X...X',
    'X...X',
    '.XXX.',
  ],
  // 場上掉落物（7×7）：精緻版，與敵機同走「剪影＋負空間」語言
  'spr-drop-rocket': [
    // 飛彈：雙箭頭（»）朝右
    '.......',
    'X..XX..',
    'XX..XX.',
    'XXX..XX',
    'XX..XX.',
    'X..XX..',
    '.......',
  ],
  'spr-drop-beam': [
    // 光束：頂部發射口＋朝下豎貫
    '.......',
    '.XXXXX.',
    '..XXX..',
    '...X...',
    '...X...',
    '...X...',
    '...X...',
  ],
  'spr-drop-wheel': [
    // 光輪：空心環（鏤空中心，旋轉感靠外圈）
    '..XXX..',
    '.X...X.',
    'X.....X',
    'X.....X',
    'X.....X',
    '.X...X.',
    '..XXX..',
  ],
  'spr-rocket': [
    // 4×3 飛彈彈體
    '.XX.',
    'XXXX',
    '.XX.',
  ],
  'spr-wheel-a': [
    // 5×5 光輪彈體（十字輻條，與 b 幀交替表現旋轉）
    '.XXX.',
    'X.X.X',
    'XXXXX',
    'X.X.X',
    '.XXX.',
  ],
  'spr-wheel-b': [
    // 5×5 光輪彈體（斜向輻條）
    '.XXX.',
    'XX.XX',
    'X.X.X',
    'XX.XX',
    '.XXX.',
  ],
};

export function ensureSprites(scene: Phaser.Scene): void {
  for (const [key, rows] of Object.entries(SPRITES)) {
    if (scene.textures.exists(key)) continue;
    const w = rows[0]!.length;
    const tex = scene.textures.createCanvas(key, w, rows.length);
    if (!tex) throw new Error(`failed to create texture ${key}`);
    const ctx = tex.getContext();
    ctx.fillStyle = NOKIA_FG_CSS;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'X') ctx.fillRect(x, y, 1, 1);
      }
    });
    tex.refresh();
  }
}
