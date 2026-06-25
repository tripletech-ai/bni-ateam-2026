# BNI A Team 2026 — 從零完整重建手冊

> **目的**：即使今天所有程式碼、本機檔案都不見了，只要依照本文件，仍可重建整套「年會商務連結系統」。

**最後更新**：2026-06-26  
**GitHub**：`tripletech-ai/bni-ateam-2026`  
**前端**：Netlify 靜態站  
**後端**：獨立 InsForge（Zeabur）`https://a-team9204.zeabur.app`

---

## 1. 系統總覽

```
┌─────────────────────────────────────────────────────────────┐
│  使用者手機瀏覽器                                            │
│  Netlify: index.html + src/* (ES modules)                   │
│  標記資料 → localStorage                                     │
└───────────────┬─────────────────────────┬───────────────────┘
                │ 會員 / Auth / RPC        │ POST /api/ai-search
                ▼                          ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│ InsForge (Zeabur)         │   │ Netlify Function            │
│ a-team9204.zeabur.app     │   │ netlify/functions/ai-search │
│ PostgreSQL + Auth + RLS   │   │ OPENAI_API_KEY              │
└───────────────────────────┘   └─────────────────────────────┘
```

| 資料 | 存放位置 | 說明 |
|------|----------|------|
| 116+ 會員名單 | `bni_members` | 主資料源，前端從 DB 載入 |
| 登入 / 綁定狀態 | `bni_members.auth_user_id` + `bni_onboarding` | Google OAuth |
| 新手教學內容 | `bni_tutorial_steps` | 7 步，前端動態讀取 |
| 教學完成旗標 | `bni_onboarding.tutorial_done` | RPC `bni_complete_tutorial` |
| 使用者標記 | `localStorage` | 不進 DB |
| AI 關鍵字 | Netlify Function | 不存 DB |

**重要**：本專案與 UIC 等其他 InsForge 專案（例如 `6cepnfaz.us-east.insforge.app`）**完全分離**，勿混用 API Key 或 URL。

---

## 2. 前置需求

- Node.js ≥ 18
- Git
- Netlify 帳號（連 GitHub repo）
- Zeabur 帳號（或任一可跑 InsForge 的環境）
- Google Cloud Console（OAuth 用）
- OpenAI API Key（AI 搜尋用）
- 管理員 Gmail：`b1993614@gmail.com`、`tripletech.ai@gmail.com`

---

## 3. 還原程式碼

```powershell
git clone https://github.com/tripletech-ai/bni-ateam-2026.git
cd bni-ateam-2026
npm install
```

若 repo 也不存在，需從備份還原以下**關鍵目錄**：

| 路徑 | 用途 |
|------|------|
| `index.html`, `404.html` | 入口 |
| `src/` | 全部前端邏輯 |
| `src/config/insforge.js` | 後端 URL + anon JWT |
| `assets/photos/` | 會員與 Contributor 照片 |
| `netlify/` + `netlify.toml` | AI Function 與部署設定 |
| `scripts/` | DB 建置、種子、測試腳本 |
| `docs/` | 本文件與部署說明 |

靜態會員備援：`src/data/members.js`（116 人，僅在 DB 載入失敗時 fallback）。

---

## 4. 重建 InsForge 後端（Zeabur）

### 4.1 部署 InsForge

1. 在 Zeabur 建立 InsForge 服務（或沿用現有 `a-team9204.zeabur.app`）。
2. 記下公開 URL，例如 `https://a-team9204.zeabur.app`。
3. 在 InsForge 管理後台取得 **Admin API Key**（`ik_...`），**僅存本機環境變數，勿 commit**。

### 4.2 一鍵建表、RLS、RPC、種子

```powershell
$env:BNI_API_BASE = "https://a-team9204.zeabur.app"
$env:BNI_API_KEY = "ik_你的管理員Key"
node scripts/setup-bni-insforge.mjs
```

此腳本會：

- 建立 `bni_members`、`bni_onboarding`、`bni_tutorial_steps`
- 套用 RLS 與 `bni_is_admin()`（僅兩個管理員 Gmail）
- 執行 `scripts/bni-rpc-functions.sql` 內所有 RPC
- 執行 `scripts/tutorial-steps-seed.sql`（7 步新手教學）
- 從 `src/data/members.js` 匯入會員（若尚未存在）
- 輸出新的 **Anon JWT** → 更新 `src/config/insforge.js` 的 `INSFORGE_ANON_KEY`

### 4.3 若名單未滿 116 筆

```powershell
node scripts/seed-sql-batches.mjs
```

SQL 檔：`scripts/seed-batch-1.sql` ~ `seed-batch-4.sql`。

### 4.4 僅更新教學步驟（不動會員）

```powershell
node -e "import('./scripts/insforge-admin-api.mjs').then(async m=>{const fs=await import('fs');await m.rawSql(fs.readFileSync('scripts/tutorial-steps-seed.sql','utf8'));console.log('tutorial ok');})"
```

### 4.5 產生 Anon Token（手動）

```powershell
curl -X POST "https://a-team9204.zeabur.app/api/auth/tokens/anon" `
  -H "Authorization: Bearer ik_你的Key" `
  -H "Content-Type: application/json" -d "{}"
```

將回傳的 `accessToken` 寫入 `src/config/insforge.js`。

---

## 5. Google OAuth 設定

1. **Google Cloud Console** → OAuth 2.0 用戶端 → 授權重新導向 URI：
   - `https://你的-netlify-網域.netlify.app`
   - 本機測試：`http://localhost:8888`（若用 netlify dev）
2. **InsForge 管理後台** → Auth → 啟用 Google Provider，填入 Client ID / Secret。
3. **allowedRedirectUrls** 加入 Netlify 正式網址（與 `signInWithOAuth` 的 `redirectTo` 一致）。

前端登入邏輯：`src/services/auth.js` → `signInWithGoogle()`。

---

## 6. Netlify 部署

### 6.1 連接 Repo

Netlify → Import from Git → `tripletech-ai/bni-ateam-2026`  
Build：無需 build command（靜態站）  
Publish directory：`/`（根目錄，見 `netlify.toml`）

### 6.2 環境變數

| 變數 | 用途 |
|------|------|
| `OPENAI_API_KEY` | `netlify/functions/ai-search.js` |

InsForge URL / anon key 在前端 `src/config/insforge.js`（公開 anon JWT 可進前端，RLS 保護寫入）。

### 6.3 本機預覽

```powershell
npx netlify-cli dev
```

---

## 7. 資料庫結構速查

### `bni_members`

| 欄位 | 說明 |
|------|------|
| `roster_id` | 名單序號（唯一） |
| `name`, `branch`, `region` | 基本資料 |
| `profession`, `have`, `want_meet`, `want_referral` | 媒合欄位 |
| `line_id`, `line_link`, `tags` | 聯絡與標籤 |
| `auth_user_id`, `google_email` | 綁定後填入 |
| `status` | `roster` / `claimed` / `self_registered` |
| `active` | 停用後 anon 不可見 |

### `bni_onboarding`

| 欄位 | 說明 |
|------|------|
| `auth_user_id` | PK，對應 InsForge Auth user |
| `tutorial_done` | 新手教學是否完成 |
| `bound_member_id` | 綁定的會員 UUID |

### `bni_tutorial_steps`

| 欄位 | 說明 |
|------|------|
| `step_order` | 排序 |
| `step_key` | 唯一鍵：`welcome`, `home`, `search`, `ai`, `marks`, `settings`, `goal` |
| `title_zh` / `title_en` | 標題 |
| `body_zh` / `body_en` | 正文，支援 `{name}` `{branch}` 替換 |
| `tip_zh` / `tip_en` | 提示小字 |
| `active` | 是否對外顯示 |

### RPC 函式

| 函式 | 誰可呼叫 | 用途 |
|------|----------|------|
| `bni_get_my_status` | anon + authenticated | 登入與綁定狀態 |
| `bni_bind_existing_member` | authenticated | 綁定名單上舊會員 |
| `bni_register_new_member` | authenticated | 自填認領新會員 |
| `bni_complete_tutorial` | authenticated | 標記教學完成 |
| `bni_is_admin` | admin only | 是否管理員 |
| `bni_admin_dashboard` | admin only | 後台統計 |
| `bni_admin_unbind_member` | admin only | 解除錯誤綁定 |

完整 SQL：`scripts/bni-rpc-functions.sql`。

---

## 8. 使用者流程（週六現場）

1. 掃 QR → Netlify 網站
2. Google 登入（`src/pages/Onboard.js`）
3. 綁定舊會員或認領新會員（搜尋 DB 未綁定名單）
4. **新手教學**（`src/pages/WelcomeTutorial.js`）— 從 `bni_tutorial_steps` 讀 7 步，完成寫入 `bni_onboarding`
5. 首頁 / 搜尋 / AI / 標記 / 管理（管理員）

啟動順序：`src/main.js` → `boot()`。

---

## 9. 驗證清單（週六前必跑）

```powershell
$env:BNI_API_KEY = "ik_..."
node scripts/edge-case-tests.mjs
node scripts/user-simulation-10-rounds.mjs   # 十回合使用者旅程模擬
```

手動檢查：

- [ ] Google 登入成功並回到原網址
- [ ] 綁定一名舊會員 → 教學出現且顯示姓名
- [ ] 完成教學後不再出現
- [ ] 管理員帳號可進「管理」分頁
- [ ] AI 搜尋有回傳關鍵字

---

## 10. 清理舊 InsForge 誤建資料

若曾在 UIC 專案 `6cepnfaz.us-east.insforge.app` 誤建 BNI 表：

```powershell
$env:LEGACY_INSFORGE_URL = "https://6cepnfaz.us-east.insforge.app"
$env:LEGACY_INSFORGE_API_KEY = "UIC專案的 ik_..."
node scripts/cleanup-legacy-insforge.mjs
```

---

## 11. 腳本目錄說明

| 腳本 | 用途 |
|------|------|
| `setup-bni-insforge.mjs` | 完整 DB 初始化（主腳本） |
| `seed-sql-batches.mjs` | 補 SQL 種子批次 2–4 |
| `tutorial-steps-seed.sql` | 教學步驟內容 |
| `bni-rpc-functions.sql` | RPC 定義 |
| `seed-batch-*.sql` | 會員 SQL 種子 |
| `edge-case-tests.mjs` | 架構邊緣案例測試 |
| `user-simulation-10-rounds.mjs` | 十回合使用者旅程模擬（尖峰並發） |
| `cleanup-legacy-insforge.mjs` | 清理舊 InsForge |
| `insforge-admin-api.mjs` | 管理 API 共用模組 |

---

## 12. 故障排除

| 症狀 | 可能原因 | 處理 |
|------|----------|------|
| 會員載入失敗 | anon JWT 過期 / URL 錯 | 重產 anon token，更新 `insforge.js` |
| Google 登入後跳轉失敗 | redirect URL 未白名單 | InsForge + Google Console 都加網址 |
| 綁定失敗 ALREADY_CLAIMED | 該名單已被認領 | 管理員後台解除綁定 |
| 教學空白 | `bni_tutorial_steps` 無資料 | 跑 `tutorial-steps-seed.sql` |
| AI 無回應 | 缺 `OPENAI_API_KEY` | Netlify 環境變數 |
| 403 push GitHub | 帳號無 repo 權限 | 用有權限的帳號 push |

---

## 13. 相關文件

- [DEPLOYMENT-INSFORGE.md](./DEPLOYMENT-INSFORGE.md) — 日常部署與 OAuth 摘要

---

## 14. 重建時間估算

| 步驟 | 時間 |
|------|------|
| Clone + npm install | 5 分鐘 |
| InsForge 建表 + 種子 | 10–15 分鐘 |
| Google OAuth | 15 分鐘 |
| Netlify 連接 + env | 10 分鐘 |
| 驗證測試 | 10 分鐘 |
| **合計** | **約 1 小時**（已有帳號與 key） |
