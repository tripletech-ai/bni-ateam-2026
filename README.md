# BNI A Team 2026 — 商務連結系統

台北市北區 Anderson Team／長輝白金分會商務連結 App：選人入場、AI 媒合、標記 1-1、分會／區域瀏覽。

| 項目 | 值 |
|------|-----|
| GitHub | [tripletech-ai/bni-ateam-2026](https://github.com/tripletech-ai/bni-ateam-2026) |
| 前端 | Netlify 靜態站 |
| 後端 | InsForge `https://a-team9204.zeabur.app` |
| 正式站 | https://bni-ateam-2026.netlify.app/ |
| 管理員 Gmail | `b1993614@gmail.com`、`tripletech.ai@gmail.com` |

---

## 目前模式：長輝擴大商機晚會（2026/7/23）

`src/config/appMode.js` → `DINNER_MODE = true`

### 今晚現場流程

1. 掃 QR → 正式站 `/`（活動 Landing，非關閉頁）
2. **開始入場** → 從本場名單選自己（會員／來賓）
3. 確認「我是本人」→ 進入全功能 App
4. AI 媒合：已自動帶入「我是／我提供」，只要填「想找什麼」
5. 可改個人資料、標記 1-1、看排行／動態

### 本場資料

| 項目 | 說明 |
|------|------|
| 長輝會員 | 約 45 人（多數已從 [evershine.tw/members](https://evershine.tw/members) 預填產業／簡介） |
| 來賓 | 約 35 人（產業／邀約人／意願來自接龍） |
| 餐食 | **不收集、不顯示** |
| 名單來源 | `src/data/changhuiDinner.js`（由 `scripts/build-changhui-dinner-roster.mjs` 產生） |
| 分會官網 | [evershine.tw](https://evershine.tw/)（Landing／首頁／找人脈皆有連結） |
| 現場 QR | `public/qr/changhui-dinner-2026-07-23.png` → 正式站 `/` |

### 今晚資料隔離（與年會分離）

| 項目 | 年會 | 今晚（`changhui-2026-0723`） |
|------|------|------------------------------|
| 公開名單／媒合 | `bni_get_public_members` | `bni_event_attendees` + `bni_get_event_public_members` |
| 標記表 | `bni_connection_marks` | `bni_event_connection_marks` |
| 排行榜 RPC | `bni_get_leaderboard` | `bni_get_event_leaderboard` |
| 開關 | `DINNER_MODE = false` | `DINNER_MODE = true` |

- 年會歷史分數與全台名單**不動**；晚宴媒合／標記只走活動表
- 晚宴 UI 不顯示年會 800／董顧舊活動；可保留區域資深董事與本場主席團
- 長輝夥伴若有年會資料：`node scripts/cue-yearend-into-dinner.mjs` 會把較完整欄位 cue 進本場出席列
- SQL：`scripts/dinner-event-roster.sql`、`scripts/dinner-event-leaderboard.sql`
- 重種本場出席：`node scripts/seed-dinner-event-attendees.mjs`

### 後端維護：從 evershine 同步長輝會員

```powershell
# 1) 抓官網公開會員
node scripts/fetch-evershine-members.mjs

# 2) 寫入 InsForge（更新既有、補齊缺漏；可加 --with-guests 同步晚宴來賓）
$env:BNI_API_BASE = "https://a-team9204.zeabur.app"
$env:BNI_API_KEY = "ik_你的管理員Key"
node scripts/sync-changhui-from-evershine.mjs --with-guests

# 3) 重建晚宴前端名單（預填用）
node scripts/build-changhui-dinner-roster.mjs
```

- DB  canonical 分會名：`長輝分會`（`長輝白金分會` 認領時會正規化為同一分會）
- 腳本只 enrich／insert，**不會清掉**已綁定的 `auth_user_id`
- 別名 SQL：`scripts/patch-changhui-branch-alias.sql`

### 晚宴模式 UI 差異

- 首頁：**不顯示「集齊 800 人」**，改為今晚活動卡
- 找人脈：**不顯示產業分布圓餅、不顯示全台分會名錄**
- 改顯示：本場長輝會員／本場來賓＋少數區域分會延伸

### 會後還原關閉頁

```js
// src/config/appMode.js
export const DINNER_MODE = false;
```

關閉後根路徑恢復活動結束蓋樓頁；`/show`（密碼 123）仍可演示。

---

## 年會功能資產：集齊 800 人資料（已封存於文件）

以下內容在**年會現場**非常有意義，晚宴模式先從首頁拿掉，避免與今晚目標混淆。程式仍保留在 `src/components/Collect800Game.js`，關掉 `DINNER_MODE` 後可再顯示。

### 文案與意義

- **標題**：集齊 800 人資料  
- **副標**：愈多人登入、資料愈完整，AI 媒合愈準 — 大家一起把商機做起來！  
- **進度**：已登入建檔／資料已完善（目標 800）  
- **現場任務**：
  1. 完善「我的」媒合資料  
  2. AI 找人，標記想約 1-1  
  3. 複製連結，邀請鄰座夥伴  

### 為什麼重要

| 目標 | 作法 |
|------|------|
| 提高媒合品質 | 產業、想認識、引薦欄位愈完整，AI 四步媒合愈準 |
| 現場集體參與 | 進度條讓大家看到「我們離 800 還有多近」 |
| 降低冷啟動 | 複製邀請語，快速拉鄰座掃碼加入 |
| 延續商務 | 標記 1-1／相互連結，活動後仍可追蹤 |

### 相關文案 key（i18n）

`collect800_title`、`collect800_sub`、`collect800_registered`、`collect800_enriched`、`collect800_msg_*`、`claim_game_quest_*`

---

## 快速開始（開發）

```powershell
git clone https://github.com/tripletech-ai/bni-ateam-2026.git
cd bni-ateam-2026
npm install
npx netlify-cli dev
```

本機預覽通常為 `http://localhost:8888`。需設定 Netlify `OPENAI_API_KEY` 才能測 AI 搜尋。

重建晚宴名單：

```powershell
# 先抓 evershine（可選）後：
node scripts/build-changhui-dinner-roster.mjs
```

---

## AI 媒合技術特色（摘要）

1. **AI 四步媒合**：更新名單 → 理解需求 → 展開同義詞 → 規劃合作／引薦  
2. **四層評分**：精準／同客群結盟／引薦路徑／可能相關  
3. **已登入簡化**：自動帶入身分與提供資源，使用者只填「想找」  
4. **後端**：GPT-4o-mini（Netlify Function）＋本機 fallback  

---

## 專案結構

```
index.html              入口、meta、字體／語言切換
src/main.js             啟動、路由、晚宴／關閉模式
src/config/appMode.js   DINNER_MODE / 關閉開關
src/data/changhuiDinner.js  今晚名單＋活動資訊
src/pages/              Home, Search, DinnerLanding, DinnerPickLogin…
src/components/         TabBar, PersonCard, Collect800Game…
src/services/auth.js    InsForge 登入與 RPC
netlify/functions/      AI 搜尋 Function
scripts/                名單建置、DB、測試
docs/                   部署與重建手冊
```

## 資料存放

| 資料 | 位置 |
|------|------|
| 會員名單 | InsForge `bni_members` |
| 今晚接龍＋evershine 預填 | `src/data/changhuiDinner.js` |
| 登入／綁定 | `bni_members` + 裝置 session |
| 使用者標記 | 瀏覽器 `localStorage` ＋後端 marks |
| AI 關鍵字 | Netlify Function（不存 DB） |

## 文件索引

| 文件 | 用途 |
|------|------|
| [docs/REBUILD-FROM-ZERO.md](./docs/REBUILD-FROM-ZERO.md) | 程式全失仍可依此重建 |
| [docs/DEPLOYMENT-INSFORGE.md](./docs/DEPLOYMENT-INSFORGE.md) | InsForge 日常部署 |
| [docs/UIUX-GUIDE.md](./docs/UIUX-GUIDE.md) | 介面結構、UX 原則 |
| [docs/EVENT-DAY-CHECKLIST.md](./docs/EVENT-DAY-CHECKLIST.md) | 年會當日營運檢查 |
| [docs/USER-SCENARIOS.md](./docs/USER-SCENARIOS.md) | 現場使用者情境 |

## 重建後端（管理員）

```powershell
$env:BNI_API_BASE = "https://a-team9204.zeabur.app"
$env:BNI_API_KEY = "ik_你的管理員Key"
node scripts/setup-bni-insforge.mjs
```

**勿**將 `BNI_API_KEY` commit 到 Git。

## 技術支援（Contributor）

- **王祈** — 三人科技顧問共同創辦人，AI 整合與系統架構  
- **李孟一** — 長輝分會魔術方塊教學，共同開發現場體驗與教學流程  
