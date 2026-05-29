# BNI A Team 商務連結平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 BNI 20 週年年會現場使用的商務連結平台，讓夥伴透過 AI 搜尋找人、標記潛在商業夥伴。

**Architecture:** Vanilla JS SPA（無框架），資料寫死在 members.js（101 位夥伴），AI 搜尋透過 Netlify Function 代理 OpenAI API，標記狀態存 localStorage。

**Tech Stack:** HTML5 / ES Modules / CSS Variables / Netlify Functions / OpenAI GPT-4o mini

---

## File Map

| 檔案 | 職責 |
|------|------|
| `index.html` | SPA 入口，載入 CSS / JS，提供 `#app` 掛載點和固定 TabBar |
| `src/styles/main.css` | Design Tokens、全域樣式、元件類別 |
| `src/data/members.js` | ✅ 已完成，101 位夥伴資料 |
| `src/data/branches.js` | 分會清單 + 人數統計 |
| `src/utils/storage.js` | localStorage 封裝（getMarks / setMark / removeMark） |
| `src/utils/search.js` | 本地關鍵字比對（searchMembers） |
| `src/utils/aiSearch.js` | fetch /api/ai-search + localExtract fallback |
| `src/utils/html.js` | 共用 escHtml / escAttr（避免各頁面重複定義）|
| `src/utils/toast.js` | showToast 獨立模組 |
| `src/components/TabBar.js` | 底部 5 tab 導覽列，render() + 監聽 hashchange |
| `src/components/PersonCard.js` | 夥伴卡片 HTML 字串產生器 + 事件綁定 |
| `src/pages/Home.js` | 首頁：Hero → AI 框 → 統計 → 分會陣容 |
| `src/pages/Search.js` | 找人脈頁：AI 輸入 → loading → 結果卡片 → 分會瀏覽 |
| `src/pages/Marks.js` | 我的標記：從 localStorage 讀取並渲染 |
| `src/pages/Result.js` | 我的成果：4 格統計 + 進度條 |
| `src/pages/Yang.js` | 楊董專欄（placeholder，資料待補） |
| `src/main.js` | Router：監聽 hash，渲染對應頁面 |
| `netlify/functions/ai-search.js` | Serverless Function，OpenAI GPT-4o mini |
| `netlify.toml` | build 設定 + /api/* redirect |
| `package.json` | openai dependency |

---

## Task 1: 基礎架構（index.html + main.css + main.js）

**Files:**
- Create: `index.html`
- Create: `src/styles/main.css`
- Create: `src/main.js`

- [ ] **Step 1: 建立 index.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>BNI A Team 商務連結</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="src/styles/main.css">
</head>
<body>
  <div id="app"></div>
  <nav id="tab-bar"></nav>
  <div id="toast" class="toast"></div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: 建立 src/styles/main.css**

```css
:root {
  --navy:        #042C53;
  --navy-mid:    #185FA5;
  --navy-light:  #E6F1FB;
  --gold:        #BA7517;
  --gold-mid:    #FAC775;
  --gold-light:  #FAEEDA;
  --green:       #3B6D11;
  --green-light: #EAF3DE;
  --red:         #A32D2D;
  --line-green:  #06C755;
  --surface:     #ffffff;
  --bg:          #F2F0ED;
  --text:        #0d1b2a;
  --muted:       #6B6860;
  --border:      rgba(13,27,42,0.09);
  --r:           16px;
  --r-sm:        10px;
  --shadow:      0 2px 16px rgba(4,44,83,0.07);
  --shadow-md:   0 6px 28px rgba(4,44,83,0.12);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; -webkit-text-size-adjust: 100%; }

body {
  font-family: 'Noto Sans TC', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding-bottom: 72px;
  max-width: 430px;
  margin: 0 auto;
}

h1, h2, h3, .serif { font-family: 'Noto Serif TC', serif; }

/* App container */
#app { min-height: calc(100vh - 72px); }

/* Tab Bar */
#tab-bar {
  position: fixed;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 100%; max-width: 430px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  z-index: 100;
  box-shadow: 0 -2px 12px rgba(4,44,83,0.08);
}
.tab-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 8px 4px 10px;
  cursor: pointer; gap: 3px;
  font-size: 10px; color: var(--muted);
  border: none; background: none;
  font-family: 'Noto Sans TC', sans-serif;
  transition: color 0.15s;
}
.tab-item.active { color: var(--navy); }
.tab-item svg { width: 22px; height: 22px; stroke-width: 1.8; }

/* Cards */
.card {
  background: var(--surface);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  overflow: hidden;
}

/* Person Card */
.person-card {
  background: var(--surface);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  margin: 0 16px 12px;
  overflow: hidden;
}
.person-card-header {
  display: flex; align-items: center;
  padding: 16px 16px 12px; gap: 12px;
}
.person-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--navy-light);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Noto Serif TC', serif;
  font-size: 18px; font-weight: 700;
  color: var(--navy); flex-shrink: 0;
}
.person-name { font-family: 'Noto Serif TC', serif; font-size: 17px; font-weight: 700; }
.person-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.match-badge {
  margin-left: auto; background: var(--gold-light);
  color: var(--gold); font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 20px; white-space: nowrap;
}
.person-section { padding: 0 16px 10px; }
.person-section-label { font-size: 11px; color: var(--muted); margin-bottom: 4px; font-weight: 500; }
.person-section-text {
  background: var(--bg); border-radius: var(--r-sm);
  padding: 8px 10px; font-size: 13px; line-height: 1.6;
  color: var(--text);
}
.person-keywords {
  padding: 0 16px 10px;
  font-size: 11px; color: var(--gold); font-weight: 600;
}
.person-actions {
  display: flex; gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--border);
}
.btn {
  border: none; cursor: pointer; border-radius: var(--r-sm);
  font-family: 'Noto Sans TC', sans-serif;
  font-weight: 500; font-size: 12px;
  padding: 8px 10px; transition: opacity 0.15s;
}
.btn:active { opacity: 0.75; }
.btn-line { background: var(--line-green); color: #fff; flex: 1.2; }
.btn-one { background: var(--navy-light); color: var(--navy); flex: 1; }
.btn-biz { background: #fdecea; color: var(--red); flex: 1; }
.btn-one.active { background: var(--navy); color: #fff; }
.btn-biz.active { background: var(--red); color: #fff; }

/* Hero */
.hero {
  background: var(--navy);
  color: #fff;
  padding: 40px 20px 32px;
  text-align: center;
}
.hero-title { font-size: 22px; font-weight: 900; line-height: 1.3; margin-bottom: 8px; }
.hero-sub { font-size: 14px; opacity: 0.8; line-height: 1.5; }

/* AI Search Box */
.ai-box { background: var(--navy); padding: 24px 16px; }
.ai-box-label { color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 10px; }
.ai-textarea {
  width: 100%; background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: var(--r-sm); color: #fff;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 15px; padding: 12px 14px;
  resize: none; min-height: 72px; line-height: 1.5;
}
.ai-textarea::placeholder { color: rgba(255,255,255,0.45); }
.ai-textarea:focus { outline: none; border-color: var(--gold-mid); }
.btn-ai {
  width: 100%; margin-top: 10px;
  background: var(--gold); color: #fff;
  padding: 13px; font-size: 15px; font-weight: 700;
  border-radius: var(--r-sm); border: none; cursor: pointer;
}
.ai-examples { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.ai-example-chip {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.75); font-size: 12px;
  padding: 7px 12px; border-radius: 20px; cursor: pointer;
  text-align: left;
}

/* Loading dots */
.loading-dots { text-align: center; padding: 32px 20px; }
.dots { display: inline-flex; gap: 6px; }
.dots span {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--gold); animation: bounce 1s infinite;
}
.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%,80%,100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
}

/* AI Result Card */
.ai-result-card {
  background: var(--gold-light);
  border: 1px solid var(--gold-mid);
  border-radius: var(--r); padding: 16px;
  margin: 16px;
}
.ai-result-query { font-size: 13px; color: var(--muted); margin-bottom: 10px; }
.keyword-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.keyword-tag {
  background: var(--gold); color: #fff;
  font-size: 12px; font-weight: 600;
  padding: 4px 10px; border-radius: 20px;
}
.btn-search-members {
  width: 100%; background: var(--navy); color: #fff;
  padding: 11px; font-size: 14px; font-weight: 700;
  border-radius: var(--r-sm); border: none; cursor: pointer; margin-bottom: 8px;
}
.btn-reset {
  width: 100%; background: transparent;
  border: 1px solid var(--border); color: var(--muted);
  padding: 9px; font-size: 13px;
  border-radius: var(--r-sm); cursor: pointer;
}

/* Stats strip */
.stats-strip {
  display: flex; background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.stat-item {
  flex: 1; text-align: center; padding: 16px 8px;
  border-right: 1px solid var(--border);
}
.stat-item:last-child { border-right: none; }
.stat-num { font-family: 'Noto Serif TC', serif; font-size: 28px; font-weight: 900; color: var(--navy); }
.stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* Section header */
.section-header { padding: 20px 16px 12px; }
.section-title { font-size: 17px; font-weight: 700; color: var(--navy); font-family: 'Noto Serif TC', serif; }

/* Results header */
.results-header {
  padding: 14px 16px 10px;
  font-size: 14px; font-weight: 600; color: var(--muted);
}
.results-header span { color: var(--navy); font-size: 20px; font-weight: 900; font-family: 'Noto Serif TC', serif; }

/* Branch chips */
.branch-section { padding: 16px; }
.branch-region-title { font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 10px; }
.branch-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.branch-chip {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 6px 14px; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; gap: 5px;
}
.branch-chip .chip-count { font-size: 11px; color: var(--muted); }
.branch-chip.sanlu { border-color: var(--green); color: var(--green); }
.branch-chip.zhongshan { border-color: var(--navy-mid); color: var(--navy-mid); }

/* Yang card */
.yang-card {
  background: var(--surface); margin: 16px;
  border-radius: var(--r); box-shadow: var(--shadow);
  overflow: hidden; display: flex; align-items: center; gap: 0;
}
.yang-photo {
  width: 90px; min-height: 110px;
  background: var(--navy-light);
  display: flex; align-items: center; justify-content: center;
  font-size: 36px; flex-shrink: 0;
}
.yang-info { padding: 16px; }
.yang-name { font-family: 'Noto Serif TC', serif; font-size: 18px; font-weight: 900; color: var(--navy); }
.yang-title { font-size: 12px; color: var(--muted); margin: 4px 0 10px; line-height: 1.5; }
.btn-yang { background: var(--navy); color: #fff; padding: 7px 14px; font-size: 13px; border-radius: var(--r-sm); border: none; cursor: pointer; }

/* Empty state */
.empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
.empty-state-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
.empty-state-sub { font-size: 13px; line-height: 1.6; }

/* Progress bar */
.progress-bar-wrap { background: var(--border); border-radius: 4px; height: 8px; margin: 8px 0; }
.progress-bar-fill { background: var(--gold); height: 8px; border-radius: 4px; transition: width 0.5s; }

/* Toast */
.toast {
  position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%);
  background: rgba(4,44,83,0.92); color: #fff;
  padding: 10px 20px; border-radius: 20px; font-size: 13px;
  opacity: 0; transition: opacity 0.3s; pointer-events: none;
  z-index: 200; white-space: nowrap; max-width: 90%;
}
.toast.show { opacity: 1; }

/* Marks list item compact */
.mark-card { background: var(--surface); border-radius: var(--r); box-shadow: var(--shadow); margin: 0 16px 10px; padding: 14px 16px; }
.mark-card-top { display: flex; align-items: center; gap: 10px; }
.mark-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--navy-light); display: flex; align-items: center; justify-content: center; font-family: 'Noto Serif TC', serif; font-weight: 700; font-size: 16px; color: var(--navy); flex-shrink: 0; }
.mark-name { font-weight: 700; font-size: 15px; }
.mark-meta { font-size: 12px; color: var(--muted); }
.mark-badges { display: flex; gap: 6px; margin: 8px 0; flex-wrap: wrap; }
.mark-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; }
.mark-badge.one { background: var(--navy-light); color: var(--navy); }
.mark-badge.biz { background: #fdecea; color: var(--red); }
.mark-actions { display: flex; gap: 8px; margin-top: 10px; }
.btn-sm { padding: 7px 12px; font-size: 12px; border-radius: var(--r-sm); border: none; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; font-weight: 500; }
.btn-remove { background: var(--bg); color: var(--muted); }
.btn-add-line { background: var(--line-green); color: #fff; }

/* Yang page */
.yang-hero { background: var(--navy); color: #fff; padding: 40px 20px 32px; text-align: center; }
.yang-hero-photo { width: 100px; height: 100px; border-radius: 50%; background: var(--navy-mid); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 44px; }
.yang-hero-name { font-family: 'Noto Serif TC', serif; font-size: 24px; font-weight: 900; }
.yang-hero-title { font-size: 13px; opacity: 0.8; margin-top: 6px; line-height: 1.5; }
.contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
.contact-btn { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 14px 10px; text-align: center; cursor: pointer; color: var(--navy); font-size: 13px; font-weight: 500; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.contact-btn svg { width: 24px; height: 24px; stroke: currentColor; }
.contact-btn.line { color: var(--line-green); border-color: var(--line-green); }

/* Result page */
.result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px 16px 0; }
.result-stat { background: var(--surface); border-radius: var(--r); padding: 16px; box-shadow: var(--shadow); }
.result-stat-num { font-family: 'Noto Serif TC', serif; font-size: 32px; font-weight: 900; color: var(--navy); }
.result-stat-label { font-size: 12px; color: var(--muted); margin-top: 4px; }
.result-progress { margin: 16px; background: var(--surface); border-radius: var(--r); padding: 16px; box-shadow: var(--shadow); }
```

- [ ] **Step 3: 建立 src/main.js（Router）**

```javascript
import { renderTabBar } from './components/TabBar.js';
import { renderHome } from './pages/Home.js';
import { renderSearch } from './pages/Search.js';
import { renderMarks } from './pages/Marks.js';
import { renderResult } from './pages/Result.js';
import { renderYang } from './pages/Yang.js';

const app = document.getElementById('app');

const routes = {
  '': renderHome,
  '#home': renderHome,
  '#search': renderSearch,
  '#marks': renderMarks,
  '#result': renderResult,
  '#yang': renderYang,
};

function navigate() {
  const hash = window.location.hash || '';
  const render = routes[hash] || renderHome;
  app.innerHTML = '';
  render(app);
  renderTabBar(document.getElementById('tab-bar'), hash);
}

window.addEventListener('hashchange', navigate);
navigate();
```

- [ ] **Step 4: 在瀏覽器開啟 index.html 確認頁面載入（暫時各頁面只需有標題）**

---

## Task 2: branches.js + storage.js + search.js + aiSearch.js

**Files:**
- Create: `src/data/branches.js`
- Create: `src/utils/storage.js`
- Create: `src/utils/search.js`
- Create: `src/utils/aiSearch.js`

- [ ] **Step 1: 建立 src/data/branches.js**

```javascript
export const BRANCHES = {
  zhongshan: [
    { name: "長悅", count: 8 },
    { name: "長佑", count: 7 },
    { name: "長翔", count: 8 },
    { name: "長城", count: 4 },
    { name: "長輝", count: 6 },
    { name: "長翼", count: 3 },
    { name: "長利", count: 2 },
    { name: "長和", count: 0 },
  ],
  sanlu: [
    { name: "金鑫",   count: 22 },
    { name: "金虎",   count: 7  },
    { name: "金暘",   count: 7  },
    { name: "金利",   count: 6  },
    { name: "金澎湃", count: 6  },
    { name: "金鈺",   count: 4  },
    { name: "金安",   count: 2  },
    { name: "金美",   count: 1  },
    { name: "金佑",   count: 2  },
    { name: "金盟",   count: 3  },
    { name: "金英",   count: 2  },
    { name: "金合",   count: 1  },
  ]
};
```

- [ ] **Step 2: 建立 src/utils/storage.js**

```javascript
const KEY = "bni_ateam_marks_2026";

export function getMarks() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function setMarks(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function memberKey(member) {
  return `${member.name}||${member.branch}`;
}

export function getMark(member) {
  const key = memberKey(member);
  const mark = getMarks().find(m => m.key === key);
  return { one: mark?.one || false, biz: mark?.biz || false };
}

export function setMark(member, type) {
  const key = memberKey(member);
  const list = getMarks();
  const idx = list.findIndex(m => m.key === key);
  if (idx === -1) {
    list.push({
      key, name: member.name, branch: member.branch,
      profession: member.profession, have: member.have || "",
      wantMeet: member.wantMeet || "", lineId: member.lineId || "",
      lineLink: member.lineLink || "",
      one: type === "one", biz: type === "biz",
    });
  } else {
    list[idx][type] = !list[idx][type];
  }
  setMarks(list);
}

export function removeMark(key) {
  setMarks(getMarks().filter(m => m.key !== key));
}

export function getMarkCount() {
  return getMarks().filter(m => m.one || m.biz).length;
}
```

- [ ] **Step 3: 建立 src/utils/search.js**

```javascript
import { MEMBERS } from "../data/members.js";

export function searchMembers(keywords) {
  if (!keywords || keywords.length === 0) return [];
  const lkw = keywords.map(k => k.toLowerCase());
  const results = [];
  for (const member of MEMBERS) {
    const searchText = [
      member.name, member.branch, member.profession,
      member.have, member.wantMeet, member.wantReferral,
      ...(member.tags || [])
    ].join(" ").toLowerCase();
    const matched = lkw.filter(k => searchText.includes(k));
    if (matched.length > 0) {
      results.push({ ...member, matchedKeywords: matched });
    }
  }
  return results.sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);
}

export function getMembersByBranch(branchName) {
  return MEMBERS.filter(m => m.branch === branchName);
}
```

- [ ] **Step 4: 建立 src/utils/aiSearch.js**

```javascript
export async function getKeywordsFromAI(input) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.ok && data.keywords?.length) return data.keywords;
    throw new Error("no keywords");
  } catch {
    return localExtract(input);
  }
}

function localExtract(input) {
  const stop = new Set(["我","是","做","的","想","找","認識","有","可以","幫","也","或","和","以及","需要","提供","給","對","這","那","什麼","樣","公司","廠商","了","就","都","才","會","要","在","一","個","人","很","不","大","小","多","少","高","低"]);
  return [...new Set(
    input.replace(/[，。！？,.!?、；：\s]/g, " ")
      .split(" ")
      .map(w => w.trim())
      .filter(w => w.length >= 2 && !stop.has(w))
  )].slice(0, 5);
}
```

---

## Task 3: TabBar + Toast + PersonCard

**Files:**
- Create: `src/components/TabBar.js`
- Create: `src/components/PersonCard.js`

- [ ] **Step 1: 建立 src/components/TabBar.js**

```javascript
import { getMarkCount } from '../utils/storage.js';

const TABS = [
  { hash: '#home',   icon: homeIcon(),   label: '首頁'   },
  { hash: '#search', icon: searchIcon(), label: '找人脈' },
  { hash: '#marks',  icon: heartIcon(),  label: '我的標記' },
  { hash: '#result', icon: chartIcon(),  label: '我的成果' },
  { hash: '#yang',   icon: personIcon(), label: '我的'   },
];

export function renderTabBar(el, currentHash) {
  const markCount = getMarkCount();
  el.innerHTML = TABS.map(t => {
    const isMarks = t.hash === '#marks';
    const active = currentHash === t.hash || (currentHash === '' && t.hash === '#home') ? 'active' : '';
    const badge = isMarks && markCount > 0 ? `<span class="tab-badge">${markCount}</span>` : '';
    return `<button class="tab-item ${active}" onclick="location.hash='${t.hash.slice(1)}'">
      <span style="position:relative">${t.icon}${badge}</span>
      <span>${t.label}</span>
    </button>`;
  }).join('');
}

function homeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
}
function searchIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
}
function heartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}
function chartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
}
function personIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
```

在 main.css 補充：
```css
.tab-badge {
  position: absolute; top: -4px; right: -6px;
  background: var(--gold); color: #fff;
  font-size: 9px; font-weight: 700;
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
```

- [ ] **Step 2: 建立 src/components/PersonCard.js**

```javascript
import { getMark, setMark, memberKey } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';

export function personCardHTML(member, opts = {}) {
  const { matchedKeywords = [], showKeywords = true } = opts;
  const mark = getMark(member);
  const key = memberKey(member);
  const initial = member.name.slice(-1);
  const badge = matchedKeywords.length > 0
    ? `<span class="match-badge">${matchedKeywords.length} 項符合</span>` : '';
  const kw = showKeywords && matchedKeywords.length > 0
    ? `<div class="person-keywords">命中：${matchedKeywords.join('、')}</div>` : '';
  const have = member.have
    ? `<div class="person-section"><div class="person-section-label">我有的資源</div><div class="person-section-text">${escHtml(member.have)}</div></div>` : '';
  const wantMeet = member.wantMeet
    ? `<div class="person-section"><div class="person-section-label">想認識的對象</div><div class="person-section-text">${escHtml(member.wantMeet)}</div></div>` : '';

  return `<div class="person-card" data-key="${escAttr(key)}">
    <div class="person-card-header">
      <div class="person-avatar">${escHtml(initial)}</div>
      <div>
        <div class="person-name">${escHtml(member.name)}</div>
        <div class="person-meta">${escHtml(member.branch)} · ${escHtml(member.profession)}</div>
      </div>
      ${badge}
    </div>
    ${have}${wantMeet}${kw}
    <div class="person-actions">
      <button class="btn btn-line" data-action="line" data-key="${escAttr(key)}">加 LINE</button>
      <button class="btn btn-one ${mark.one ? 'active' : ''}" data-action="one" data-key="${escAttr(key)}">想約 1-1</button>
      <button class="btn btn-biz ${mark.biz ? 'active' : ''}" data-action="biz" data-key="${escAttr(key)}">有合作可能</button>
    </div>
  </div>`;
}

export function bindCardEvents(container, members) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const key = btn.dataset.key;
    const member = members.find(m => memberKey(m) === key);
    if (!member) return;

    if (action === 'line') {
      handleLine(member);
    } else {
      setMark(member, action);
      // Toggle button active state
      const card = container.querySelector(`.person-card[data-key="${CSS.escape(key)}"]`);
      if (card) {
        const mark = getMark(member);
        card.querySelector('[data-action="one"]').classList.toggle('active', mark.one);
        card.querySelector('[data-action="biz"]').classList.toggle('active', mark.biz);
      }
      // Refresh tab bar badge
      import('../components/TabBar.js').then(({ renderTabBar }) => {
        renderTabBar(document.getElementById('tab-bar'), window.location.hash);
      });
    }
  });
}

function handleLine(member) {
  if (member.lineLink && member.lineLink.startsWith('http')) {
    window.open(member.lineLink, '_blank');
  } else if (member.lineId) {
    navigator.clipboard.writeText(member.lineId).catch(() => {});
    window.open('https://line.me/R/nv/addFriends', '_blank');
    showToast(`LINE ID 已複製：${member.lineId}，到 LINE 搜尋貼上`);
  } else {
    showToast('這位夥伴沒有填 LINE 連結');
  }
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s || '').replace(/"/g,'&quot;');
}
```

- [ ] **Step 3: 建立 src/utils/toast.js**

```javascript
export function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}
```

---

## Task 4: Search 頁面（核心功能）

**Files:**
- Create: `src/pages/Search.js`

- [ ] **Step 1: 建立 src/pages/Search.js**

```javascript
import { getKeywordsFromAI } from '../utils/aiSearch.js';
import { searchMembers, getMembersByBranch } from '../utils/search.js';
import { personCardHTML, bindCardEvents } from '../components/PersonCard.js';
import { BRANCHES } from '../data/branches.js';
import { MEMBERS } from '../data/members.js';

export function renderSearch(container) {
  container.innerHTML = `
    <div id="search-ai-box" class="ai-box">
      <div class="ai-box-label">說一句話，幫你找到對的人</div>
      <textarea id="ai-input" class="ai-textarea" placeholder="我是做保險的，想找企業主或會計師" rows="3"></textarea>
      <button id="ai-submit" class="btn-ai">AI 幫我找</button>
      <div class="ai-examples">
        <div class="ai-example-chip">我是律師，想認識高資產客戶和財務顧問</div>
        <div class="ai-example-chip">我做室內設計，想找建商或企業主裝修客戶</div>
        <div class="ai-example-chip">我是人力資源顧問，想認識中小企業主</div>
      </div>
    </div>
    <div id="search-loading" style="display:none" class="loading-dots">
      <div class="dots"><span></span><span></span><span></span></div>
      <div style="color:var(--muted);font-size:13px;margin-top:12px">AI 分析中，請稍候…</div>
    </div>
    <div id="ai-result-area" style="display:none"></div>
    <div id="search-results-area" style="display:none"></div>
    <div id="branch-browse-area"></div>
  `;

  bindSearchEvents(container);
  renderBranchBrowse(document.getElementById('branch-browse-area'));
}

function bindSearchEvents(container) {
  // Example chips
  container.querySelectorAll('.ai-example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('ai-input').value = chip.textContent;
      doSearch(chip.textContent);
    });
  });

  // Submit button
  document.getElementById('ai-submit').addEventListener('click', () => {
    const input = document.getElementById('ai-input').value.trim();
    if (!input) return;
    doSearch(input);
  });

  // Enter to submit
  document.getElementById('ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('ai-submit').click(); }
  });
}

async function doSearch(input) {
  const aiBox = document.getElementById('search-ai-box');
  const loading = document.getElementById('search-loading');
  const resultArea = document.getElementById('ai-result-area');
  const searchArea = document.getElementById('search-results-area');
  const branchArea = document.getElementById('branch-browse-area');

  aiBox.style.display = 'none';
  loading.style.display = 'block';
  resultArea.style.display = 'none';
  searchArea.style.display = 'none';
  branchArea.style.display = 'none';

  const keywords = await getKeywordsFromAI(input);

  loading.style.display = 'none';

  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div class="ai-result-card">
      <div class="ai-result-query">你說：${escHtml(input)}</div>
      <div class="keyword-tags">${keywords.map(k => `<span class="keyword-tag">${escHtml(k)}</span>`).join('')}</div>
      <button id="btn-do-search" class="btn-search-members">搜尋這些夥伴（${keywords.length} 個關鍵字）</button>
      <button id="btn-reset-search" class="btn-reset">重新輸入</button>
    </div>
  `;

  document.getElementById('btn-reset-search').addEventListener('click', resetSearch);
  document.getElementById('btn-do-search').addEventListener('click', () => {
    const results = searchMembers(keywords);
    showResults(results, keywords, searchArea);
    branchArea.style.display = 'block';
  });

  // Auto-trigger search
  document.getElementById('btn-do-search').click();
}

function showResults(results, keywords, container) {
  container.style.display = 'block';
  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">找不到符合的夥伴</div>
      <div class="empty-state-sub">試試其他關鍵字</div>
    </div>`;
    return;
  }
  container.innerHTML = `
    <div class="results-header"><span>${results.length}</span> 位夥伴符合</div>
    <div id="cards-list">${results.map(m => personCardHTML(m, { matchedKeywords: m.matchedKeywords })).join('')}</div>
  `;
  bindCardEvents(document.getElementById('cards-list'), results);
}

function resetSearch() {
  document.getElementById('search-ai-box').style.display = 'block';
  document.getElementById('ai-result-area').style.display = 'none';
  document.getElementById('search-results-area').style.display = 'none';
  document.getElementById('branch-browse-area').style.display = 'block';
  document.getElementById('ai-input').value = '';
  document.getElementById('ai-input').focus();
}

function renderBranchBrowse(container) {
  const zhongshan = BRANCHES.zhongshan.filter(b => b.count > 0);
  const sanlu = BRANCHES.sanlu.filter(b => b.count > 0);
  container.innerHTML = `
    <div class="section-header"><div class="section-title">瀏覽分會</div></div>
    <div class="branch-section">
      <div class="branch-region-title">中山區</div>
      <div class="branch-chips">
        ${zhongshan.map(b => `<div class="branch-chip zhongshan" data-branch="${b.name}分會">${b.name}<span class="chip-count">${b.count}</span></div>`).join('')}
      </div>
      <div class="branch-region-title">三蘆區</div>
      <div class="branch-chips">
        ${sanlu.map(b => `<div class="branch-chip sanlu" data-branch="${b.name}分會">${b.name}<span class="chip-count">${b.count}</span></div>`).join('')}
      </div>
    </div>
  `;

  container.addEventListener('click', e => {
    const chip = e.target.closest('[data-branch]');
    if (!chip) return;
    const branchName = chip.dataset.branch;
    const members = getMembersByBranch(branchName);
    showBranchMembers(branchName, members, container);
  });
}

function showBranchMembers(branchName, members, container) {
  const memberCards = members.map(m => personCardHTML(m)).join('');
  const resultEl = document.getElementById('search-results-area');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="results-header"><span>${members.length}</span> 位 ${escHtml(branchName)} 夥伴</div>
    <div id="cards-list">${memberCards}</div>
  `;
  bindCardEvents(document.getElementById('cards-list'), members);
  resultEl.scrollIntoView({ behavior: 'smooth' });
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

---

## Task 5: Home 頁面

**Files:**
- Create: `src/pages/Home.js`

- [ ] **Step 1: 建立 src/pages/Home.js**

```javascript
import { getMarkCount } from '../utils/storage.js';
import { BRANCHES } from '../data/branches.js';
import { getKeywordsFromAI } from '../utils/aiSearch.js';
import { searchMembers } from '../utils/search.js';

export function renderHome(container) {
  const markCount = getMarkCount();
  const zhongshan = BRANCHES.zhongshan.filter(b => b.count > 0);
  const sanlu = BRANCHES.sanlu.filter(b => b.count > 0);

  container.innerHTML = `
    <!-- Hero -->
    <div class="hero">
      <div style="font-size:12px;letter-spacing:2px;opacity:0.6;margin-bottom:8px">BNI · 20 YEARS TAIWAN</div>
      <h1 class="hero-title serif">20 分會商務連結行動</h1>
      <p class="hero-sub">說出你想找的人<br>AI 幫你找到對的夥伴</p>
    </div>

    <!-- AI Search on Home -->
    <div class="ai-box">
      <div class="ai-box-label">說一句話，幫你找到對的人</div>
      <textarea id="home-ai-input" class="ai-textarea" placeholder="我是做保險的，想找企業主或會計師" rows="2"></textarea>
      <button id="home-ai-submit" class="btn-ai">AI 幫我找</button>
    </div>

    <!-- Stats -->
    <div class="stats-strip">
      <div class="stat-item"><div class="stat-num serif">20</div><div class="stat-label">參與分會</div></div>
      <div class="stat-item"><div class="stat-num serif">101</div><div class="stat-label">報名夥伴</div></div>
      <div class="stat-item"><div class="stat-num serif" id="home-mark-count">${markCount}</div><div class="stat-label">我的標記</div></div>
    </div>

    <!-- Yang Card -->
    <div class="section-header"><div class="section-title">區域領導者</div></div>
    <div class="yang-card">
      <div class="yang-photo">👔</div>
      <div class="yang-info">
        <div class="yang-name">楊董</div>
        <div class="yang-title">資深區域董事顧問<br>台北北區 & 新北西北B</div>
        <button class="btn-yang" onclick="location.hash='yang'">查看專欄</button>
      </div>
    </div>

    <!-- 分會陣容 -->
    <div class="section-header"><div class="section-title">20 分會陣容</div></div>
    <div class="branch-section">
      <div class="branch-region-title">中山區</div>
      <div class="branch-chips">
        ${zhongshan.map(b => `<div class="branch-chip zhongshan" data-branch="${b.name}分會" onclick="location.hash='search'">${b.name}<span class="chip-count">${b.count}</span></div>`).join('')}
      </div>
      <div class="branch-region-title">三蘆區</div>
      <div class="branch-chips">
        ${sanlu.map(b => `<div class="branch-chip sanlu" data-branch="${b.name}分會" onclick="location.hash='search'">${b.name}<span class="chip-count">${b.count}</span></div>`).join('')}
      </div>
      <button onclick="location.hash='search'" style="width:100%;margin-top:8px;padding:11px;background:var(--navy);color:#fff;border:none;border-radius:var(--r-sm);font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans TC',sans-serif">查看所有夥伴</button>
    </div>
    <div style="height:20px"></div>
  `;

  // Home AI search → navigate to search page with query
  document.getElementById('home-ai-submit').addEventListener('click', () => {
    const v = document.getElementById('home-ai-input').value.trim();
    if (!v) { location.hash = 'search'; return; }
    sessionStorage.setItem('bni_pending_search', v);
    location.hash = 'search';
  });
}
```

在 Search.js renderSearch 函數開頭補充：
```javascript
// Check for pending search from home page
const pending = sessionStorage.getItem('bni_pending_search');
if (pending) {
  sessionStorage.removeItem('bni_pending_search');
  setTimeout(() => doSearch(pending), 100);
  return;
}
```

---

## Task 6: Marks + Result + Yang 頁面

**Files:**
- Create: `src/pages/Marks.js`
- Create: `src/pages/Result.js`
- Create: `src/pages/Yang.js`

- [ ] **Step 1: 建立 src/pages/Marks.js**

```javascript
import { getMarks, removeMark, memberKey } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { renderTabBar } from '../components/TabBar.js';

export function renderMarks(container) {
  const marks = getMarks().filter(m => m.one || m.biz);

  if (marks.length === 0) {
    container.innerHTML = `
      <div class="section-header"><div class="section-title">我的標記</div></div>
      <div class="empty-state">
        <div class="empty-state-icon">🔖</div>
        <div class="empty-state-title">還沒有標記</div>
        <div class="empty-state-sub">去找人脈頁搜尋夥伴<br>點「想約 1-1」或「有合作可能」即可標記</div>
        <button onclick="location.hash='search'" style="margin-top:20px;padding:11px 24px;background:var(--navy);color:#fff;border:none;border-radius:var(--r-sm);font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans TC',sans-serif">去找人脈</button>
      </div>`;
    return;
  }

  const cards = marks.map(m => `
    <div class="mark-card" data-key="${escAttr(m.key)}">
      <div class="mark-card-top">
        <div class="mark-avatar">${escHtml(m.name.slice(-1))}</div>
        <div>
          <div class="mark-name">${escHtml(m.name)}</div>
          <div class="mark-meta">${escHtml(m.branch)} · ${escHtml(m.profession)}</div>
        </div>
      </div>
      <div class="mark-badges">
        ${m.one ? '<span class="mark-badge one">想約 1-1</span>' : ''}
        ${m.biz ? '<span class="mark-badge biz">有合作可能</span>' : ''}
      </div>
      ${m.have ? `<div style="font-size:12px;color:var(--muted);margin:4px 0 8px;line-height:1.5">${escHtml(m.have.substring(0, 60))}${m.have.length > 60 ? '…' : ''}</div>` : ''}
      <div class="mark-actions">
        <button class="btn-sm btn-add-line" data-action="line" data-key="${escAttr(m.key)}" data-line-link="${escAttr(m.lineLink)}" data-line-id="${escAttr(m.lineId)}">加 LINE</button>
        <button class="btn-sm btn-remove" data-action="remove" data-key="${escAttr(m.key)}">移除標記</button>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="section-header"><div class="section-title">我的標記 <span style="color:var(--muted);font-size:14px;font-weight:400">${marks.length} 位</span></div></div>
    <div id="marks-list">${cards}</div>
    <div style="height:20px"></div>
  `;

  document.getElementById('marks-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const key = btn.dataset.key;
    if (btn.dataset.action === 'remove') {
      removeMark(key);
      renderMarks(container);
      renderTabBar(document.getElementById('tab-bar'), '#marks');
    } else if (btn.dataset.action === 'line') {
      const link = btn.dataset.lineLink;
      const id = btn.dataset.lineId;
      if (link && link.startsWith('http')) {
        window.open(link, '_blank');
      } else if (id) {
        navigator.clipboard.writeText(id).catch(() => {});
        window.open('https://line.me/R/nv/addFriends', '_blank');
        showToast(`LINE ID 已複製：${id}`);
      } else {
        showToast('這位夥伴沒有填 LINE 連結');
      }
    }
  });
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s||'').replace(/"/g,'&quot;'); }
```

- [ ] **Step 2: 建立 src/pages/Result.js**

```javascript
import { getMarks } from '../utils/storage.js';

const GOAL = 5;

export function renderResult(container) {
  const marks = getMarks().filter(m => m.one || m.biz);
  const oneCount = marks.filter(m => m.one).length;
  const bizCount = marks.filter(m => m.biz).length;
  const total = marks.length;
  const pct = Math.min(100, Math.round(total / GOAL * 100));

  container.innerHTML = `
    <div class="section-header"><div class="section-title">我的成果</div></div>
    <div class="result-grid">
      <div class="result-stat"><div class="result-stat-num serif">${total}</div><div class="result-stat-label">有效標記</div></div>
      <div class="result-stat"><div class="result-stat-num serif">${oneCount}</div><div class="result-stat-label">想約 1-1</div></div>
      <div class="result-stat"><div class="result-stat-num serif">${bizCount}</div><div class="result-stat-label">有合作可能</div></div>
      <div class="result-stat"><div class="result-stat-num serif">${GOAL}</div><div class="result-stat-label">今日目標</div></div>
    </div>
    <div class="result-progress">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">今日進度</span>
        <span style="font-size:13px;color:var(--muted)">${total} / ${GOAL}</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">
        ${total >= GOAL ? '目標達成！繼續創造更多商機' : `還差 ${GOAL - total} 位達標`}
      </div>
    </div>
    ${marks.length > 0 ? `
      <div class="section-header"><div class="section-title" style="font-size:14px">已標記夥伴</div></div>
      ${marks.map(m => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border)">
          <div style="font-weight:600;font-size:14px;flex:1">${escHtml(m.name)}</div>
          <div style="font-size:12px;color:var(--muted)">${escHtml(m.branch)}</div>
          <div style="font-size:11px;display:flex;gap:4px">
            ${m.one ? '<span style="background:var(--navy-light);color:var(--navy);padding:2px 6px;border-radius:10px">1-1</span>' : ''}
            ${m.biz ? '<span style="background:#fdecea;color:var(--red);padding:2px 6px;border-radius:10px">合作</span>' : ''}
          </div>
        </div>`).join('')}
    ` : ''}
    <div style="height:20px"></div>
  `;
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
```

- [ ] **Step 3: 建立 src/pages/Yang.js**

```javascript
export function renderYang(container) {
  container.innerHTML = `
    <div class="yang-hero">
      <div class="yang-hero-photo">👔</div>
      <div class="yang-hero-name serif">楊董</div>
      <div class="yang-hero-title">資深區域董事顧問<br>台北北區 & 新北西北B</div>
    </div>

    <div style="padding:20px 16px;background:var(--surface);border-bottom:1px solid var(--border)">
      <div class="section-title" style="margin-bottom:10px">帶領理念</div>
      <p style="font-size:14px;line-height:1.8;color:var(--text)">
        在艱難的時代中，我們更要團結一致，透過 A Team 商務連結平台，讓 20 個分會彼此連結、彼此成就，共同創造無限商機。
      </p>
    </div>

    <div style="padding:16px">
      <div class="section-title" style="margin-bottom:12px">我的電子名片</div>
      <div class="contact-grid">
        <button class="contact-btn line" id="yang-line">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          加 LINE
        </button>
        <button class="contact-btn" id="yang-phone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
          撥打電話
        </button>
        <button class="contact-btn" id="yang-email">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          E-mail
        </button>
        <button class="contact-btn" id="yang-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          查看名片
        </button>
      </div>
    </div>

    <div style="padding:0 16px 16px;background:var(--surface);margin-top:1px">
      <div style="font-size:13px;color:var(--muted);line-height:2">
        <div>📱 聯絡資訊待補充</div>
        <div>📧 聯絡資訊待補充</div>
      </div>
    </div>
    <div style="height:20px"></div>
  `;

  // Placeholder handlers - fill in when Yang's info is provided
  document.getElementById('yang-phone').addEventListener('click', () => {
    alert('聯絡資訊待楊董確認後補充');
  });
  document.getElementById('yang-email').addEventListener('click', () => {
    alert('聯絡資訊待楊董確認後補充');
  });
  document.getElementById('yang-line').addEventListener('click', () => {
    alert('LINE 連結待楊董確認後補充');
  });
  document.getElementById('yang-card').addEventListener('click', () => {
    alert('名片連結待楊董確認後補充');
  });
}
```

---

## Task 7: Netlify Function（AI 搜尋）

**Files:**
- Create: `netlify/functions/ai-search.js`
- Create: `netlify.toml`
- Create: `package.json`

- [ ] **Step 1: 建立 package.json**

```json
{
  "name": "bni-ateam-2026",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "openai": "^4.0.0"
  }
}
```

- [ ] **Step 2: 建立 netlify/functions/ai-search.js**

```javascript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const { input } = await req.json();
  if (!input || input.trim().length < 2) {
    return Response.json({ ok: false, message: "輸入太短" }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 150,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `你是 BNI 年會現場的商務媒合助理。根據使用者輸入，提取最適合搜尋 BNI 夥伴名單的中文關鍵字。

名單涵蓋行業：法律、會計記帳、稅務、保險、不動產、室內設計裝修、廣告行銷、科技IT、醫療健康美業、餐飲、教育培訓企業顧問、金融理財、建設開發、進出口貿易、人力資源、活動企劃。

回傳規則（請嚴格遵守）：
1. 只回傳純 JSON：{"keywords":["關鍵字1","關鍵字2",...]}，不含任何其他文字
2. 提取 4 到 6 個關鍵字
3. 同時涵蓋：使用者的身分/專業 + 使用者想找的對象類型
4. 每個關鍵字 2 到 5 個中文字，使用台灣商業慣用語
5. 優先選擇能比對到「我有的資源」「想認識的對象」欄位的詞彙
6. 範例：用戶說「我是做財務規劃的，想找有傳承需求的家族企業」→ {"keywords":["財務規劃","理財","家族企業","資產傳承","企業主","高資產"]}`
      },
      { role: "user", content: input }
    ]
  });

  const text = completion.choices[0].message.content.trim();
  let keywords = [];
  try {
    keywords = JSON.parse(text).keywords || [];
  } catch {
    keywords = input
      .replace(/[，。！？,.!?\s]/g, " ")
      .split(" ")
      .filter(w => w.length >= 2)
      .slice(0, 5);
  }
  return Response.json({ ok: true, keywords });
};

export const config = { path: "/api/ai-search" };
```

- [ ] **Step 3: 建立 netlify.toml**

```toml
[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

- [ ] **Step 4: npm install**

```bash
cd "C:\Users\Samuel\Desktop\BNI年會ATeam系統"
npm install
```

---

## Task 8: 整合測試 + 修正 + 部署準備

**Files:**
- Modify: `src/pages/Search.js`（補 pending search 邏輯）
- Modify: `src/main.js`（確認 routing 正確）

- [ ] **Step 1: 補 Search.js pending search 邏輯（在 renderSearch 最前面加）**

在 `renderSearch(container)` 函數內容最開頭加入：
```javascript
// Check for pending search from home page
const pending = sessionStorage.getItem('bni_pending_search');
if (pending) {
  sessionStorage.removeItem('bni_pending_search');
  // Render the UI first, then trigger search
  container.innerHTML = `
    <div id="search-ai-box" class="ai-box" style="display:none">...</div>
    ...
  `;
  // (call the full renderSearch logic then doSearch)
}
```

實際上改為在 renderSearch 末尾加：
```javascript
// Check pending search from home page
const pending = sessionStorage.getItem('bni_pending_search');
if (pending) {
  sessionStorage.removeItem('bni_pending_search');
  setTimeout(() => doSearch(pending), 50);
}
```

- [ ] **Step 2: 用 Netlify CLI 本地測試**

```bash
npm install -g netlify-cli
netlify dev
```

瀏覽器開啟 `http://localhost:8888`，測試：
1. 首頁載入 + Tab Bar 顯示
2. 點「找人脈」→ AI 輸入框出現
3. 輸入測試句子，點「AI 幫我找」
4. 確認關鍵字出現 + 結果卡片顯示
5. 點「加 LINE」、「想約 1-1」、「有合作可能」
6. 點「我的標記」確認標記列表
7. 點「我的成果」確認統計

- [ ] **Step 3: 建立 .gitignore**

```
node_modules/
.netlify/
.env
*.env.local
```

- [ ] **Step 4: GitHub + Netlify 部署**

```bash
git init
git add .
git commit -m "feat: BNI A Team 商務連結平台 v1.0"
```

在 Netlify Dashboard：
1. Add new site → Import from Git
2. 選 GitHub repo
3. Build settings: publish directory = `.`，functions = `netlify/functions`
4. Environment variables → `OPENAI_API_KEY=sk-...`
5. Deploy

---

## 楊董資料補充（取得後執行）

更新 `src/pages/Yang.js`，填入：
- `yang-phone` button 的 `tel:` 連結
- `yang-email` button 的 `mailto:` 連結
- `yang-line` button 的實際 LINE URL
- 底部聯絡資訊文字

---

## 自我審核

- [x] members.js 已有 101 位真實夥伴資料
- [x] AI 搜尋有 8 秒逾時 fallback
- [x] localStorage key 固定為 `bni_ateam_marks_2026`
- [x] API Key 只在 Netlify 環境變數
- [x] count=0 分會不顯示
- [x] 手機優先 max-width 430px
- [x] 不使用表情符號於 SVG 圖示（TabBar 全用 SVG）
- [x] 加 LINE 三種情況都處理
- [x] Home → Search 的 AI 搜尋透過 sessionStorage 傳遞
- [ ] 楊董聯絡資訊待補（已標記 placeholder）
- [ ] A Team 影片連結待補
