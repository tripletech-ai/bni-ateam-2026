# 年會當日營運檢查清單

> BNI A Team 2026 商務連結系統 — 週六現場約 800 人使用

---

## A. 週五晚（或週六清晨）技術

### 後端 InsForge

- [ ] `https://a-team9204.zeabur.app` 可連線
- [ ] 會員筆數正確（`node scripts/edge-case-tests.mjs`）
- [ ] 教學步驟 7 筆存在
- [ ] `bni_get_event_pulse()` 可呼叫

```powershell
$env:BNI_API_KEY = "ik_..."
node scripts/edge-case-tests.mjs
node scripts/user-simulation-10-rounds.mjs
```

### 前端 Netlify

- [ ] 最新 `main` 已部署成功
- [ ] 環境變數 `OPENAI_API_KEY` 已設定
- [ ] 正式網址可開啟、可 Google 登入
- [ ] `index.html` 的 `og:url`、`og:image` 改為 **完整 https URL**（LINE 分享預覽）

### Google OAuth

- [ ] InsForge allowedRedirectUrls 含 Netlify 正式網址
- [ ] Google Console redirect URI 一致
- [ ] 測試帳號可完成：登入 → 綁定 → 教學 → 首頁

---

## B. 週六開場前（現場）

### 場地

- [ ] QR Code 指向 **正式 Netlify URL**（非 preview）
- [ ] 現場 Wi‑Fi 或 4G 可連外網
- [ ] 準備「登入教學」小海報：Google 登入 → 認領身分 → 刷人脈

### 資料品質

- [ ] 提醒夥伴填寫 **產業別** 與 **引薦對象**（首頁金色提示／UserBar「我的資料」）
- [ ] 幹部協助未在名單者走「認領新會員」

### 800 人挑戰

- [ ] 開場說明：目標 800 人登入並「刷一下」
- [ ] 鼓勵使用「提醒旁邊夥伴」複製邀請文案
- [ ] 可定時宣布進度（首頁數字）

---

## C. 尖峰時段（同時 100+ 人）

- [ ] 觀察 Netlify / Zeabur 儀表板
- [ ] AI 搜尋慢時：引導用 **分會 chips** 或 **關鍵字**（非 AI）
- [ ] 標記存本機 — 提醒勿清除瀏覽器快取

---

## D. 管理員

登入 Gmail：`b1993614@gmail.com` 或 `tripletech.ai@gmail.com`

- [ ] 「管理」分頁可開
- [ ] 查看綁定數、教學完成率
- [ ] 錯誤綁定可「解除綁定」
- [ ] 必要時在後台編輯會員欄位

### 志工培訓

- [ ] 印或投影 [USER-SCENARIOS.md](./USER-SCENARIOS.md) 十種情境
- [ ] 至少 2 人熟練「互相連結」規則（雙向按 1-1）

---

## E. 常見問題速查

| 狀況 | 處理 |
|------|------|
| 無法登入 Google | 檢查 OAuth redirect、換瀏覽器、改 Wi‑Fi |
| 找不到自己名字 | 改「認領新會員」或聯絡管理員 |
| 此人已被認領 | 管理員解除綁定或確認是否本人已登入其他帳號 |
| 搜尋沒結果 | 換產業關鍵字；鼓勵對方填產業別 |
| AI 一直轉圈 | 檢查 OpenAI key；改用手動分會瀏覽 |
| 標記不見了 | 可能清除快取或換手機 — 本機儲存 |
| 字太小 | 右上角 A 切換大字／特大 |

---

## F. 活動後

- [ ] 匯出管理後台綁定統計（截圖或記錄）
- [ ] 記錄現場問題供下一版改善
- [ ] （可選）備份 `bni_members` 與 `bni_event_pulse`

---

## 緊急聯絡

- 技術：王祈（三人科技顧問）
- 系統共同開發：李孟一
