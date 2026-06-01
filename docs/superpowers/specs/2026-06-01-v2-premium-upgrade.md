# BNI A Team V2 Premium Upgrade — Design Spec

**日期：** 2026-06-01  
**狀態：** 已確認，準備實作

---

## 一、內容與資料更新

### 1.1 區域名稱
- 舊：「台北北區 & 新北西北B」
- 新：「台北市北區 Anderson Team / 新北市西北B區」

### 1.2 楊日陞（主要領導人）
- 姓名：楊日陞
- 職稱：區域資深董事
- 聯絡資訊：待補（預留 phone/email/line/card 欄位）

### 1.3 李鴻毅（第二領導人）
- 姓名：李鴻毅
- 職稱：區董、7+12 董顧
- 聯絡資訊：待補

### 1.4 董顧團隊（src/data/leaders.js）
```
中山區（7位）：曾惠君、張文婷、鐘坤宏、詹鴻鵠、陳麗惠、廖筱蘭、游姿菱
三蘆區（12位）：孫成育、張松源、郭愛珠、李赫茗、蕭淑蓉、周玉茹、
              張力文、王彥萍、江學洋、王執定、陳沛緹、洪岳裕
```
每位董顧有 `cardLink` 欄位（預設空字串，待補）

### 1.5 統計數字
- 報名夥伴：120 人

### 1.6 影片區塊
- 在 Home 頁加入 A-Team 影片佔位卡（深色卡片 + 播放圖示 SVG）
- `videoUrl` 預設空字串，有值時顯示真實影片縮圖

---

## 二、Tab Bar 第 5 項重構

- 舊：「我的」→ Yang.js（楊董個人）
- 新：「領導層」→ Leaders.js（整個 Anderson Team 領導群）
- Tab 圖示：改為 group/team SVG 圖示

### Leaders.js 頁面結構
```
① Hero：Anderson Team 區域領導群（深藍）
② 楊日陞 大卡（含電子名片按鈕）
③ 李鴻毅 卡
④ 中山區董顧（7張小卡，accordion 可折疊）
⑤ 三蘆區董顧（12張小卡，accordion 可折疊）
```

---

## 三、Premium 深色 UI

### 3.1 新色彩 Tokens（dark-theme.css 覆蓋 main.css）
```css
--dark-bg:       #0a0f1e;   /* 頁面背景 */
--dark-surface:  rgba(255,255,255,0.05);  /* 卡片背景 */
--dark-surface2: rgba(255,255,255,0.08);  /* hover/active */
--dark-border:   rgba(255,255,255,0.08);  /* 卡片邊框 */
--dark-text:     rgba(255,255,255,0.92);  /* 主文字 */
--dark-muted:    rgba(255,255,255,0.50);  /* 次文字 */
--gold-glow:     rgba(250,199,117,0.25);  /* 金色發光 */
```

### 3.2 卡片玻璃質感
- `background: var(--dark-surface)`
- `border: 1px solid var(--dark-border)`
- `backdrop-filter: blur(12px)`
- Fallback（不支援 backdrop-filter）：`background: rgba(20,28,50,0.85)`

### 3.3 AI 載入動畫（animations.css）
```
粒子光點：5個圓點以不同延遲和軌跡移動（純 CSS）
掃描光束：水平金色線條由左至右掃描
打字機：「AI 分析中，正在為你搜尋最佳夥伴…」逐字顯示
底部：金色 shimmer 進度條（無限循環）
```

### 3.4 頁面/卡片動畫
- 頁面切換：`fadeSlideUp 0.2s ease`
- 卡片進場：`stagger-fade`（每張 50ms delay，最多 6 張後停止 stagger）
- 按鈕按壓：`scale(0.96) 0.1s`
- 金色按鈕：按壓時 `box-shadow: 0 0 16px var(--gold-glow)`

---

## 四、功能修改

### 4.1 AI 搜尋流程修改
- 舊流程：AI 分析 → 顯示關鍵字 + 「搜尋這些夥伴」按鈕 → 手動點擊
- 新流程：AI 分析 → 顯示關鍵字 → **自動搜尋** → 只顯示「重新輸入」
- 關鍵字卡仍顯示（讓用戶看到 AI 拆出什麼詞）

### 4.2 英文切換
- 右上角固定 `EN / 中` 切換按鈕（position: fixed，z-index: 200）
- `window.BNI_LANG`（'zh' | 'en'），切換後 re-render 當前頁
- 翻譯範圍：Tab 標籤、頁面標題、按鈕、說明文字、搜尋例句、Hero 文案
- **不翻譯**：member 資料欄位（have/wantMeet/wantReferral）、人名、分會名

---

## 五、架構新增檔案

| 檔案 | 職責 |
|------|------|
| `src/styles/dark-theme.css` | 深色 token + 覆蓋 main.css |
| `src/styles/animations.css` | 所有 keyframe 動畫 |
| `src/i18n/translations.js` | 中英翻譯字串物件 |
| `src/data/leaders.js` | 楊日陞、李鴻毅、19 位董顧資料 |
| `src/pages/Leaders.js` | 區域領導頁（取代 Yang.js） |

**Yang.js 保留但不再從 main.js import**

---

## 六、自我審核

- [x] 英文切換只翻 UI，不翻 member 資料（中英混排有 `lang="zh"` 標記）
- [x] backdrop-filter 有 fallback
- [x] 動畫全部 CSS keyframe，零 JS 套件
- [x] stagger 最多 6 張後停止（避免第 20 張等 1 秒才出現）
- [x] Leaders 頁董顧名單可折疊（accordion）
- [x] 「搜尋這些夥伴」按鈕移除，自動搜尋
- [x] 統計數字改為 120
- [x] 影片佔位卡預留
