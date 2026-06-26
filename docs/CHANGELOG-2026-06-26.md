# 變更紀錄 — 2026-06-26

> BNI A Team 2026 商務連結 App  
> 本文件整理 2026-06-26 前後一輪 UX／功能調整，供開發、志工與驗收對照。  
> 已推送 commit：`baca384`（部分後續修改可能仍在工作區，部署前請 `git status` 確認）

---

## 1. 首頁

### 1.1 區塊順序與摺疊

| 順序 | 區塊 | 預設狀態 | 說明 |
|------|------|----------|------|
| 1 | **楊董**（`YangIntroCard`） | 展開 | 含照片、職稱、簡介、導向領導層 |
| 2 | **董顧** | 摺疊 | 李鴻毅區董卡片；標題列顯示「李鴻毅 · 區董」 |
| 3 | **顧問群** | 摺疊 | 內含中山區／三蘆區子 accordion（預設亦摺疊） |
| 4 | **系統開發者** | 摺疊 | 王祈、李孟一等開發者卡片 |

**相關檔案**

- `src/pages/Home.js`
- `src/pages/Leaders.js` — `homeLeadersSectionsHTML()`、`homeSectionAccordion()`
- `src/i18n/translations.js` — `home_section_donggu` / `home_section_advisors` / `home_section_developers`

### 1.2 楊董照片

- 正式照片：`assets/photos/楊日陞.png`
- 註冊表：`src/data/photos.js` → `'楊日陞': '楊日陞.png'`
- 分享預覽：`index.html` 的 `og:image` 改為 `/assets/photos/楊日陞.png`
- 顯示位置：首頁 `YangIntroCard`、領導層頁 `Yang.js`（若有）

**更換照片步驟**

1. 覆蓋 `assets/photos/楊日陞.png`
2. 重新部署 Netlify（靜態資源）
3. 現場若仍見舊圖：強制重新整理（Ctrl+F5）

### 1.3 李鴻毅（董顧）無法點開 — 已修復

**原因**：每次切換分頁再回首頁，`bindLeaderEvents()` 在 `#app` 上重複綁定 click，accordion 被 toggle 兩次（開→關），看似點不開。

**修復**

- `src/pages/Leaders.js` — 使用 `AbortController` 綁定前先解除舊 listener
- 董顧列可點整列開啟電子名片（有連結時）
- 鍵盤：`accordion-header`、`.leader-card-secondary.has-card-link` 支援 Enter／Space

---

## 2. 找人脈（AI 搜尋）

### 2.1 完整輸入格式（已恢復）

搜尋框改回**完整版**，方便現場照抄範例：

- 標題：「說清楚你是誰、想找誰 — AI 幫你精準媒合」
- **四行格式說明**：【我是】【我提供】【想找】【不要】
- 文字框 6 行、多行 placeholder
- **三個範例 chip**（律師、室內設計、只填想找）

**相關檔案**：`src/pages/Search.js`、`src/i18n/translations.js`（`search_label`、`search_format_*`、`search_example*`）

### 2.2 AI 三層思考（等待 UX）

媒合等待時：

1. 依序顯示 **三層思考**（約 0s → 1.4s → 2.8s）
2. 全程顯示 **「有 AI 相關開發請找王祈」**
3. 最少等待 **4.5 秒**（`MIN_THINKING_MS`），API 較快也會等夠再出結果
4. 結果頁保留三層思考摘要 + AI 理解 + 意圖標籤

**後端**

- `netlify/functions/ai-search.js` 回傳 JSON 欄位 `thinking_steps`（固定 3 句）
- `max_tokens` 900、前端 timeout 28 秒

**前端**

- `src/utils/aiSearch.js` — 解析 `thinking_steps`
- `src/pages/Search.js` — `searchThinkingLoadingHTML()`、`displaySearchResults()`
- `src/i18n/translations.js` — `search_thinking_*`、`search_waiting_dev`

### 2.3 媒合結果保留（切換分頁）

AI 媒合完成後，切到其他 Tab 再回「找人脈」，**自動還原**上次結果（含夥伴列表）。

| 項目 | 說明 |
|------|------|
| 儲存 | `sessionStorage` key：`bni_search_session` |
| 模組 | `src/utils/searchSession.js` |
| 清除 | 按「重新輸入」或新一次 AI 搜尋會覆寫 |
| 範圍 | 僅 AI 媒合；分會／產業瀏覽不寫入此 session |

### 2.4 瀏覽全部分會 — 更明顯

- 由小字 `<details>` 改為 **金色邊框卡片**，預設展開
- 標題「瀏覽全部分會」+ 副標「點分會名稱，查看該分會所有夥伴」
- 分會 chip 字級加大

**相關檔案**：`src/pages/Search.js`（`renderBranchBrowse`）、`src/styles/main.css`、`search_browse_all_branches_sub`

---

## 3. 登入／訪客

### 3.1 「先看看，不登入」

登入頁（`renderLoginGate`）新增：

- **「登入 vs 不登入，差在哪？」** 雙欄對照表
  - 登入後：可被搜尋、可標記、可聊天、參加 800 人挑戰
  - 不登入：只能看、別人找不到你、不能標記／聊天
- 「先看看，不登入」按鈕：金色邊框、置於對照表下方

**相關檔案**

- `src/pages/Onboard.js`
- `src/i18n/translations.js` — `login_guest_compare_*`、`login_signed_*`、`login_guest_li*`
- `src/styles/main.css`、`src/styles/dark-theme.css`

### 3.2 訪客模式（既有，未改邏輯）

- 進入後仍會彈 `GuestTrialIntro` 說明限制
- 頂部 `GuestTrialBanner` 提醒登入

---

## 4. 歡迎加入挑戰（認領完成彈窗）

`FirstRunHint.js` 強化可讀性：

- 標題：「歡迎加入 **800 人挑戰**！」
- 金色 badge、副標（已登入成功說明）
- **三步驟清單**：AI 找人 → 標記 1-1 → 邀請鄰座
- 保留 800 進度條、任務列表、邀請連結按鈕

**i18n**：`first_run_subtitle`、`first_run_badge`、`first_run_step1`～`3`

---

## 5. 其他（同批次或稍早）

| 項目 | 摘要 | 主要檔案 |
|------|------|----------|
| 鎏金 Hero 標題 | 首頁標題金色動效 | `Home.js`、`animations.css` |
| 登入偏好 | 語言／字體改在登入頁設定 | `LoginPrefsPanel.js`、`preferences.js` |
| 已綁定可重登 | 同裝置同身分可再登入 | `memberClaim.js`、`Onboard.js` |
| 聊天室優化 | 同一人訊息合併、區域標籤 | `FeedChat.js` |
| 黑屏修復 | TabBar 重複 import、chrome DOM | `TabBar.js`、`main.js` |

---

## 6. 部署與驗收清單

### 部署前

```powershell
git status
git log -1 --oneline
npx netlify-cli dev   # 本機驗收
```

- [ ] Netlify `OPENAI_API_KEY` 已設定（三層思考需新 prompt）
- [ ] `assets/photos/楊日陞.png` 已含在部署產物
- [ ] `index.html` 的 `og:url`、`og:image` 改為 **完整 https URL**（LINE 分享）

### 現場快速驗收（5 分鐘）

1. **首頁** — 楊董照片、董顧可展開、李鴻毅可開名片  
2. **登入頁** — 訪客對照表、先看看按鈕  
3. **找人脈** — 完整格式 + 三範例；AI 媒合見三層思考 + 王祈文案  
4. **找人脈** — 媒合後切 Tab 再回，結果仍在  
5. **認領** — 歡迎彈窗三步驟清楚  

---

## 7. 文件索引

| 文件 | 用途 |
|------|------|
| [UIUX-GUIDE.md](./UIUX-GUIDE.md) | 介面結構與互動（已同步部分章節） |
| [EVENT-DAY-CHECKLIST.md](./EVENT-DAY-CHECKLIST.md) | 年會當日營運 |
| [README.md](../README.md) | 專案總覽 |

---

*維護：功能再調整時，請在本檔或新增 dated changelog 追加段落，並更新 UIUX-GUIDE 對應章節。*
