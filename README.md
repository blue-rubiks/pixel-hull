# 🎮 Pixel Hull - 像素船體太空射擊

> 致敬 Nokia 經典《Space Impact》的瀏覽器復古太空射擊 —— 你的船由像素構成，中彈就一顆顆剝落。

[![Phaser](https://img.shields.io/badge/Phaser-4.1-orange.svg)](https://phaser.io/)
[![Node.js](https://img.shields.io/badge/Node.js-26+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple.svg)](https://vite.dev/)
[![PWA](https://img.shields.io/badge/PWA-installable-success.svg)](https://web.dev/progressive-web-apps/)

**[🎮 線上試玩](https://blue-rubiks.github.io/pixel-hull/)** | [English](README_EN.md) | [繁體中文](README.md)

---

## 📖 專案簡介

**Pixel Hull** 是一款瀏覽器版復古太空射擊遊戲，致敬 Nokia 經典《Space Impact》。

它不是忠實 clone，而是把原版改寫成三個差異化亮點：

- **像素船體傷害模型** —— 用一艘會剝落的像素船取代傳統血條。
- **每日挑戰** —— 種子化波次 + Wordle 式 emoji 成績分享 + 連勝紀錄，純前端、無帳號、無後端。
- **Nokia 風手機殼** —— 整台復古手機外殼 + LCD 網格質感，以可安裝的 PWA 形式呈現。

## 📸 遊戲截圖

|                                               |                                               |
| :-------------------------------------------: | :-------------------------------------------: |
| ![](https://cdn.imgpile.com/f/hLrBVQ7_xl.png) | ![](https://cdn.imgpile.com/f/grEoudl_xl.png) |
|                                               |                                               |
| ![](https://cdn.imgpile.com/f/zXBEDpC_xl.png) | ![](https://cdn.imgpile.com/f/h4P4pdc_xl.png) |

## ✨ 核心特性

- 🟢 **像素船體機制** —— 船由十幾顆像素組成，中彈就剝落：船真的變小、火力變弱；吃補給補回。血條、視覺回饋、風險獎勵三合一。**殘體加成**：船越殘、得分倍率越高（滿血 ×1、最高約 ×2.9，HUD 即時顯示），要不要回血成了真正的抉擇。
- 📅 **每日挑戰** —— 以本地日期為種子，全球玩家同一天遇到完全相同的一局；保留每日最高分與連勝（streak），結算後一鍵複製 emoji 成績。
- 🎮 **兩種遊戲模式** —— Arcade 8 關難度爬升（破關後關卡續增、Boss 輪替、HP 續長）＋ Daily 每日一局；街機可選 EASY／NORMAL／HARD 三段難度。
- 👾 **8 種敵人 + 8 隻 Boss** —— 各有獨立移動行為；每關結尾一隻獨立造型 Boss，搭配輪替彈型與低血暴走。破關後的高圈數出現**菁英變體**：護盾菁英（週期開盾免疫，抓收盾窗口才打得掉）與分裂菁英（死亡分裂成兩隻群湧），擊殺分數加倍。**掠奪者**會撲向場上的補給、叼走就往右逃——先殺牠還是先撿，是新的抉擇。
- ⛰️ **洞穴地形關** —— 特定關卡（街機 L3／L6，每日每逢 3 的倍數關）上下長出捲動地形，壓縮活動空間；擦撞剝像素。閃地形與閃彈幕是兩種不同的技能。
- ⬆️ **升級卡系統** —— 每過一關從 3 張卡選 1（連射／助攻／穿甲／吸力／回血），Vampire Survivors 式成長循環。
- 🚀 **特殊武器** —— 飛彈（直線高傷）、光束（船鼻前緩速推進的貫穿光柱）、光輪（緩速穿透）；有限彈藥、可切換。
- 📱 **Nokia 風手機殼 + LCD 網格 + PWA** —— 可安裝到手機桌面、離線遊玩。
- 🎨 **嚴格雙色像素美術 + 自繪點陣字** —— 無外部字型檔，遊戲內 UI 全面繁體中文。
- 🔊 **程序化 chiptune BGM + 8-bit 音效** —— 8 關各有獨立地景與音樂（第 9 關起循環沿用）；可在選單切換靜音（音樂與音效一起），設定會記住。

## 🎮 遊戲操作

| 動作             | 桌面   | 手機殼   |
| ---------------- | ------ | -------- |
| 移動             | 方向鍵 | 虛擬搖桿 |
| 射擊             | 空白鍵 | 射擊 鍵  |
| 特殊武器         | X 或 1 | ✦ 鍵     |
| 切換武器         | Z      | ⇄ 鍵     |
| 分享成績（每日） | C      | 分享 鍵  |
| 選單             | M      | 選單 鍵  |

> 畫面上的點擊只用於「選升級卡」與「Game Over 後重開」；移動與射擊一律走按鍵或手機殼上的實體按鈕，刻意不做會遮畫面、容易誤觸的拖曳手勢。

## 🚀 快速開始

### 環境需求

| 工具    | 版本    |
| ------- | ------- |
| Node.js | 26.x    |
| npm     | 隨 Node |

### 安裝與啟動

```bash
# 1. 複製專案
git clone https://github.com/twtrubiks/pixel-hull.git
cd pixel-hull

# 2. 安裝相依套件（同時會裝好 husky pre-commit hook）
npm install

# 3. 啟動開發伺服器
npm run dev

# 4. 打開瀏覽器前往終端機顯示的網址（預設 http://localhost:5173）
```

> 💡 想讓**同一區網**的其他裝置（手機等）連進來測試，改用 `npm run dev -- --host`，再從終端機印出的區網網址存取——記得帶上 `/pixel-hull/` 路徑，例如 `http://192.168.x.x:5173/pixel-hull/`。

## 📁 專案結構

```
pixel-hull/
├── src/
│   ├── core/      # 純遊戲邏輯，無框架相依（hull 船體、waves 波次、
│   │              #   upgrades 升級、weapons 武器、daily 種子、storage、PRNG）+ 測試
│   ├── scenes/    # Phaser 場景（BootScene 開機、MenuScene 選單、GameScene 遊戲）
│   ├── ui/        # 點陣字、sprites、音效、手機殼接線、搖桿、背景
│   └── main.ts    # Phaser 遊戲設定與 PWA 註冊
├── public/        # PWA manifest、service worker、icons
├── scripts/       # 工具腳本（產生 icon）
└── vite.config.ts # base 設為 /pixel-hull/（須與 repo 名一致）
```

## 🎯 遊戲玩法

### 兩種模式

- **Arcade（街機）**：8 關難度爬升的戰役；打通第 8 關後關卡持續續增，Boss 輪替、HP 持續上升，雜兵也隨圈數微幅變快變肉。可在選單選 **EASY／NORMAL／HARD** 三段難度，調整敵人速度、出怪密度、Boss 血量與補給節奏（NORMAL 即原始平衡，設定會記住）；EASY 為避免洗分不記最高分。
- **Daily（每日挑戰）**：每個本地日曆日一局，種子固定。所有玩家拿到相同的波次、升級選項與道具掉落序列（實際掉落時機與數量會隨玩家血量、通關速度而異）；以 `localStorage` 保留每日最高分與連勝。難度固定 NORMAL，以維持全球同局的公平性。無帳號、無後端。

### 像素船體機制

玩家的船由十幾顆像素組成。**中彈就剝落像素** —— 船真的變小、火力下降；吃補給把像素補回。它同時就是血條，也是風險與獎勵的平衡點。在雙色畫風下，像素四散的剝落效果格外好看。

**殘體加成**：船體缺越多像素，擊殺得分倍率越高——滿血 ×1、缺一半 ×2、只剩 1 顆約 ×2.9，倍率即時顯示在分數右側（如 `X1.4`）。回血與補給因此從「無腦必拿」變成抉擇：修好船保命，還是保持殘體衝分。

### 洞穴地形

特定關卡的戰場上下會長出**捲動地形**（街機 L3／L6 與其循環對應關；每日挑戰每逢 3 的倍數關）。地形壓縮可活動的走廊，**擦撞會剝落像素**並被推回走廊（有短暫寬限，不會貼著斜坡被磨死）。地形種子化可重現：同一關（或同一天）所有人看到相同的洞穴。敵人與子彈視為飛在地形前方，只有玩家會撞。

### 敵人與 Boss

共 **8 種敵人**，各有獨立移動：drone、darter、bomber（會直線發射子彈）、diver（俯衝鎖定）、zigzag（鋸齒反彈）、turret（砲塔瞄準）、swarm（群湧）、thief（掠奪者，見下）。每關結尾一隻 Boss，**8 關各一隻獨立造型**（由關卡決定、可重現），各有輪替彈型序列與移動模式，低血時暴走加速。

**掠奪者（thief）**：L3 起，補給十字出現後有機率（35%）跟著進場——延遲兩秒從補給同一列切入，直撲最近的補給，叼到後 1.5 倍速往右逃。擊殺（或撞毀）牠，補給原地掉落還撿得回來；讓牠逃出右緣，補給就沒收了。「先殺牠還是先撿」成為受傷時的即時抉擇。是否派出掠奪者與補給走同一條種子子流，每日挑戰可重現。

**菁英變體**（打通一圈後出現，機率隨圈數 10% → 30%）：變體由敵種決定——drone／bomber 是**分裂菁英**（尾部識別點；死亡分裂成兩隻 swarm），其餘是**護盾菁英**（船頭盾條亮起時免疫，收盾窗口才打得掉）。菁英擊殺分數 ×2，再疊殘體加成。菁英與否烘在種子化時間軸裡：同一關（同一天）所有人遇到相同的菁英。

### 升級卡系統

每過一關，從 3 張隨機升級卡選 1：

| 升級 | 效果               |
| ---- | ------------------ |
| 連射 | 提高開火頻率       |
| 助攻 | 多一架副翼一起開火 |
| 穿甲 | 子彈可貫穿多個敵人 |
| 吸力 | 自動吸引補給       |
| 回血 | 補回部分像素船體   |

> 進場有 300ms 鎖定，且須先放開射擊鍵再按一次才會確認——避免承前一關按著射擊（或連點）而誤選。

### 道具與特殊武器

遊戲中會飄過兩種道具：

- **補給**（十字圖示）：補回船體像素。
- **武器**（固定間隔出現）：取得有限彈藥的特殊武器
  - 🚀 **飛彈** —— 直線高傷，命中即耗（3 發）
  - ⚡ **光束** —— 船鼻前豎起一道貫穿縱列的光柱，緩速往前推進掃過整列（1 發，傷害 2）
  - ⭕ **光輪** —— 緩速前進、穿透一切，每個目標只結算一次（1 發）

> 拾取同款補彈藥、不同款則切換並重設彈藥；切換鍵可在已持有的武器間循環；彈藥打完自動回到預設無限彈藥的主砲。HUD 在關卡數左側顯示武器圖示與剩餘彈藥。

## 🛠️ 技術棧

| 工具       | 版本  | 說明                                              |
| ---------- | ----- | ------------------------------------------------- |
| Node.js    | 26.x  | 僅作開發工具                                      |
| Vite       | 8.x   | Rolldown 打包器，幾近零 plugin                    |
| TypeScript | 6.0.x | 型別檢查獨立跑 `tsc --noEmit`                     |
| Phaser     | 4.1.x | 遊戲引擎：場景管理、sprite 繪製、整數倍縮放、輸入 |

技術重點：

- 內部解析度 **126×72**，整數倍放大輸出，全遊戲僅用 Nokia 雙色（亮綠背景 `#c7f0d8` + 深綠前景 `#43523d`）。
- `src/core/` 的遊戲邏輯完全不依賴框架、皆有單元測試；渲染與輸入則放在 `src/scenes/` 與 `src/ui/`。
- 遊戲內 UI 為繁體中文，使用自繪點陣字（`src/ui/font.ts`）：Latin/數字為手繪 3×5 字符，少數中文字烘焙成 12×12 字符，不載入任何外部字型檔，維持嚴格雙色。標題 `PIXEL HULL` 與單鍵提示（X／M／C）保留英文。

## 🧪 測試

`src/core/` 的純邏輯模組以 Node 內建測試執行：

```bash
npm test            # node --test（核心邏輯）
```

涵蓋 PRNG（種子確定性）、hull 船體、waves 波次、upgrades 升級、weapons 武器、daily 每日種子、storage 等模組。`src/core/` 模組使用 `.ts` import 路徑，讓 `node --test` 無需打包即可直接執行。

## 🎨 代碼品質

兩道防線：本地 commit 時自動把關（husky + lint-staged），CI 部署前再全量把關。

```bash
npm run lint          # ESLint 全專案檢查
npm run typecheck     # tsc --noEmit 型別檢查
npm run format        # Prettier 格式化
npm run format:check  # 只檢查不修改（CI 用）
```

> pre-commit hook 會對暫存區檔案自動執行 `eslint --fix` 與 `prettier --write`。

## 📝 開發指令

| 指令                    | 說明                         |
| ----------------------- | ---------------------------- |
| `npm install`           | 安裝相依並設定 husky hook    |
| `npm run dev`           | 啟動開發伺服器               |
| `npm run dev -- --host` | 啟動開發伺服器並開放區網連線 |
| `npm run build`         | 產生正式版到 `dist/`         |
| `npm run preview`       | 預覽正式版                   |
| `npm run lint`          | ESLint                       |
| `npm run typecheck`     | `tsc --noEmit`               |
| `npm test`              | `node --test`（核心邏輯）    |
| `npm run format`        | Prettier 格式化              |

## 🚀 部署

專案 build 後為純靜態檔案，採用 **GitHub Pages** 部署：

- `vite.config.ts` 設 `base: '/pixel-hull/'`，**必須與 repo 名一致**，否則資源路徑 404。
- `.github/workflows/deploy.yml` 會依序跑 Lint → Type check → Test → Build，push 到 `main` 後自動部署。
- repo 的 **Settings → Pages → Source 須設為「GitHub Actions」**（非 branch 模式）。

## 📄 授權與致敬

靈感來自《Space Impact》。Space Impact 與 Nokia 為其各自所有者之商標；本專案與其無任何隸屬或背書關係。所有像素美術皆為原創，命名刻意避開上述商標。

## 🙏 致謝

- 靈感來源：Nokia 經典遊戲《Space Impact》
- 遊戲引擎：[Phaser.js](https://phaser.io/)
- 像素編輯：[Piskel](https://www.piskelapp.com/)
- 音效生成：[jsfxr](https://sfxr.me/)

## Donation

文章都是我自己研究內化後原創，如果有幫助到您，也想鼓勵我的話，歡迎請我喝一杯咖啡 :laughing:

綠界科技ECPAY ( 不需註冊會員 )

![alt tag](https://payment.ecpay.com.tw/Upload/QRCode/201906/QRCode_672351b8-5ab3-42dd-9c7c-c24c3e6a10a0.png)

[贊助者付款](http://bit.ly/2F7Jrha)

歐付寶 ( 需註冊會員 )

![alt tag](https://i.imgur.com/LRct9xa.png)

[贊助者付款](https://payment.opay.tw/Broadcaster/Donate/9E47FDEF85ABE383A0F5FC6A218606F8)

## 贊助名單

[贊助名單](https://github.com/twtrubiks/Thank-you-for-donate)
