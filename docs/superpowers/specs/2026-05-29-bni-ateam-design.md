# BNI A Team 商務連結平台 設計規格

**日期：** 2026-05-29  
**活動日期：** 2026-06-27  
**狀態：** 已確認，準備實作

---

## 架構決策

| 項目 | 決策 | 原因 |
|------|------|------|
| 框架 | Vanilla JS，無框架 | 活動用完即棄，零依賴最穩定 |
| 資料 | members.js 寫死（101 位夥伴） | 固定名單，不需 CRUD |
| AI 搜尋 | Netlify Function → OpenAI GPT-4o mini | API Key 保護 |
| 標記儲存 | localStorage | 當天使用，不需跨裝置 |
| 部署 | Netlify | 免費，零設定 |

## 目錄結構

```
bni-ateam/
├── index.html
├── src/
│   ├── data/members.js       ✅ 101 位夥伴資料（已完成）
│   ├── data/branches.js      分會統計資料
│   ├── pages/ (Home, Search, Marks, Result, Yang)
│   ├── components/ (TabBar, PersonCard, AiSearchBox)
│   ├── utils/ (storage.js, search.js, aiSearch.js)
│   └── styles/main.css       Design Tokens + 元件樣式
├── netlify/functions/ai-search.js
└── netlify.toml
```

## 5 個頁面

1. **Home** - Hero Banner → AI 搜尋框 → 統計 → 楊董欄 → 影片 → 分會陣容
2. **Search** - AI 輸入 → 關鍵字 tag → 搜尋結果卡片 → 分會瀏覽
3. **Marks** - localStorage 標記列表，加 LINE / 移除
4. **Result** - 4 格統計 + 進度條（目標 5）
5. **Yang** - 楊董大圖 + 電子名片（資料待提供）

## Design System

- 主色：navy `#042C53`，金色 `#BA7517`，三蘆綠 `#3B6D11`
- 字型：Noto Serif TC（標題）+ Noto Sans TC（內文）
- 手機優先，max-width 430px

## AI 搜尋流程

```
使用者輸入 → POST /api/ai-search → GPT-4o mini → keywords[]
→ 前端比對 MEMBERS（name/profession/have/wantMeet/wantReferral/tags）
→ 按命中數排序 → 顯示 PersonCard
```

Fallback：8 秒逾時 → localExtract（本地斷詞）

## 標記系統

- `bni_ateam_marks_2026` localStorage key
- 每位夥伴可標記：想約 1-1（one）、有合作可能（biz）
- 加 LINE 邏輯：lineLink → window.open；lineId only → 複製 + 跳轉

## 注意事項

- API Key 只在 Netlify 環境變數，前端不得直接呼叫 OpenAI
- count=0 分會不顯示
- 楊董資料（聯絡資訊、影片連結）待補
