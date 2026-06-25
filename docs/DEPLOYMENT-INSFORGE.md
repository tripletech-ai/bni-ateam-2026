# BNI A Team — InsForge 部署說明

## 架構

| 層級 | 平台 | 說明 |
|------|------|------|
| 前端 | **Netlify**（既有 `netlify.toml`） | 靜態站 + AI 搜尋 Function |
| 資料庫 / 認證 | **InsForge** `https://6cepnfaz.us-east.insforge.app` | PostgreSQL、`bni_members`、Google OAuth |

週六 800 人同時使用：前端走 Netlify CDN；會員名單啟動時一次載入到記憶體，搜尋在瀏覽器本地執行，僅 AI 搜尋打 Netlify Function。

## 上線前必做（InsForge 後台）

1. **Google OAuth Redirect URL**  
   在 InsForge Auth 設定加入 Netlify 正式網址，例如：  
   `https://你的-netlify-網域.netlify.app`

2. **管理員（僅以下 Google 帳號）**  
   - `b1993614@gmail.com`  
   - `tripletech.ai@gmail.com`  
   後台已用資料庫函式 `bni_is_admin()` 鎖定上述信箱；其他帳號即使登入也看不到「管理」分頁。  
   `tripletech.ai` 需至少用 Google 登入過一次系統，之後即可進管理後台。

3. **種子資料**（若 `bni_members` 為空）  
   ```bash
   node scripts/seed-bni-members.mjs
   ```
   或請有 MCP 權限者執行 `scripts/seed-batch-*.sql`

## 使用者流程

1. 掃 QR → Google 登入  
2. 綁定舊會員（搜尋名單）或認領新會員（填表）  
3. 新手教學 → 搜尋 / AI 媒合 / 標記  

## 管理員

登入後底部導覽會出現「管理」分頁，可編輯會員欄位並即時同步資料庫。
