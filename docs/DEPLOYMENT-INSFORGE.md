# BNI A Team — 獨立 InsForge 後端

此專案的會員資料與登入**只**存在下方 InsForge 實例，與其他 InsForge 專案（例如 UIC）**完全分離**。

| 項目 | 值 |
|------|-----|
| API | `https://a-team9204.zeabur.app` |
| 部署 | Zeabur（InsForge 自架） |
| 前端 | Netlify（`netlify.toml`） |

## 架構

```
使用者 → Netlify 靜態站 + AI Function
              ↓ 會員 / 登入 / 綁定
         a-team9204.zeabur.app（獨立 InsForge）
```

## 初次或重建資料庫

```powershell
$env:BNI_API_KEY = "你的 ik_... 管理員 API Key"
$env:BNI_API_BASE = "https://a-team9204.zeabur.app"
node scripts/setup-bni-insforge.mjs
node scripts/seed-sql-batches.mjs   # 若名單未滿 116 筆時執行
```

`BNI_API_KEY` 僅用於本機腳本，**不要** commit 或放進前端。

## InsForge 後台必設

1. **Google OAuth**  
   在 InsForge 管理後台啟用 Google，並把 Netlify 正式網址加入 `allowedRedirectUrls`。

2. **管理員（僅此兩個 Gmail）**  
   - `b1993614@gmail.com`  
   - `tripletech.ai@gmail.com`  
   由資料庫函式 `bni_is_admin()` 鎖定，其他帳號無法進「管理」分頁。

3. **Cursor MCP（可選）**  
   ```json
   {
     "mcpServers": {
       "insforge": {
         "command": "npx",
         "args": ["-y", "@insforge/mcp@latest"],
         "env": {
           "API_KEY": "ik_...",
           "API_BASE_URL": "https://a-team9204.zeabur.app"
         }
       }
     }
   }
   ```

## 前端設定

`src/config/insforge.js` 已指向 `a-team9204.zeabur.app`。若重建 anon token，更新其中的 `INSFORGE_ANON_KEY`（由 `POST /api/auth/tokens/anon` 取得）。

## 使用者流程

掃 QR → Google 登入 → 綁定舊會員 / 認領新會員 → 新手教學 → 搜尋與媒合

## 管理後台

授權管理員登入後，底部「管理」分頁可：

- **使用現況**：綁定數、教學完成率、最近綁定列表  
- **會員管理**：編輯名單、解除錯誤 Google 綁定
