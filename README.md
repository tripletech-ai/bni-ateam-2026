# BNI A Team 2026 — 年會商務連結系統

台北市北區 Anderson Team 年會現場媒合 App：Google 登入、AI 找人、標記 1-1、800 人現場挑戰。

| 項目 | 值 |
|------|-----|
| GitHub | [tripletech-ai/bni-ateam-2026](https://github.com/tripletech-ai/bni-ateam-2026) |
| 前端 | Netlify 靜態站 |
| 後端 | InsForge `https://a-team9204.zeabur.app` |
| 管理員 Gmail | `b1993614@gmail.com`、`tripletech.ai@gmail.com` |

## 快速開始（開發）

```powershell
git clone https://github.com/tripletech-ai/bni-ateam-2026.git
cd bni-ateam-2026
npm install
npx netlify-cli dev
```

本機預覽通常為 `http://localhost:8888`。需設定 Netlify `OPENAI_API_KEY` 才能測 AI 搜尋。

## 使用者流程（週六現場）

1. 掃 QR → 開啟網站
2. **Google 登入**
3. **綁定舊會員**（在名單上）或 **認領新會員**（填寫資料）
4. **7 步新手教學**（內容來自資料庫，可後台更新）
5. 首頁：**800 人刷人脈**、AI 搜尋、分會瀏覽
6. 搜尋分頁：關鍵字 / AI 媒合、分會名單
7. 標記分頁：1-1、商務合作（存本機）
8. **完善個人資料**（`#profile`）：產業別、引薦對象（好／理想／夢幻）

## 專案結構

```
index.html              入口、meta、字體／語言切換
src/main.js             啟動、路由、登入閘道
src/pages/              各分頁（Home, Search, Marks, ProfileEdit…）
src/components/         TabBar, PersonCard, EventPulseGame…
src/services/auth.js    InsForge 登入與 RPC
src/config/insforge.js  後端 URL + anon JWT（公開）
scripts/                DB 建置、種子、測試
netlify/functions/      AI 關鍵字 Function
docs/                   部署與重建手冊
```

## 資料存放

| 資料 | 位置 |
|------|------|
| 會員名單 | InsForge `bni_members` |
| 登入／綁定／教學 | `bni_members` + `bni_onboarding` |
| 教學步驟文案 | `bni_tutorial_steps` |
| 現場 800 人挑戰 | `bni_event_pulse` |
| 使用者標記 | 瀏覽器 `localStorage` |
| AI 關鍵字 | Netlify Function（不存 DB） |

## 週六前檢查清單

- [ ] Google OAuth（InsForge + Google Console + Netlify redirect）
- [ ] Netlify `OPENAI_API_KEY`
- [ ] `node scripts/edge-case-tests.mjs`
- [ ] `node scripts/user-simulation-10-rounds.mjs`
- [ ] 管理員實機登入測「管理」分頁
- [ ] 現場 Wi‑Fi 壓力測試（建議 10+ 人同時搜尋）

詳見 [docs/EVENT-DAY-CHECKLIST.md](./docs/EVENT-DAY-CHECKLIST.md) 與 [docs/UIUX-GUIDE.md](./docs/UIUX-GUIDE.md)。

## 文件索引

| 文件 | 用途 |
|------|------|
| [docs/REBUILD-FROM-ZERO.md](./docs/REBUILD-FROM-ZERO.md) | 程式全失仍可依此重建 |
| [docs/DEPLOYMENT-INSFORGE.md](./docs/DEPLOYMENT-INSFORGE.md) | InsForge 日常部署 |
| [docs/UIUX-GUIDE.md](./docs/UIUX-GUIDE.md) | 介面結構、UX 原則、已知限制 |
| [docs/CHANGELOG-2026-06-26.md](./docs/CHANGELOG-2026-06-26.md) | **2026-06-26 功能／UX 變更紀錄** |
| [docs/EVENT-DAY-CHECKLIST.md](./docs/EVENT-DAY-CHECKLIST.md) | 年會當日營運檢查 |
| [docs/USER-SCENARIOS.md](./docs/USER-SCENARIOS.md) | 現場十種使用者情境（志工／驗收） |

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
