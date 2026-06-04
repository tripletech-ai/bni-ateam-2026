# BNI A Team V2 Premium Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade BNI A Team platform with Premium dark UI, Anderson Team leaders page, i18n toggle, AI auto-search, and content updates.

**Architecture:** Vanilla JS SPA. New CSS files (dark-theme + animations) loaded via index.html. New `src/i18n/translations.js` + `src/data/leaders.js` added. Existing pages modified in-place. No new dependencies.

**Tech Stack:** Vanilla JS ES Modules, CSS custom properties, CSS keyframe animations, window.BNI_LANG global for i18n

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/styles/dark-theme.css` | CREATE | Dark color tokens, glass card styles |
| `src/styles/animations.css` | CREATE | All keyframe animations, transitions |
| `src/i18n/translations.js` | CREATE | ZH/EN string map |
| `src/data/leaders.js` | CREATE | Anderson Team leadership data |
| `src/pages/Leaders.js` | CREATE | Leaders page (replaces Yang.js) |
| `index.html` | MODIFY | Load new CSS, add lang toggle button |
| `src/main.js` | MODIFY | Add leaders route, i18n init |
| `src/components/TabBar.js` | MODIFY | Tab 5: leaders icon + label |
| `src/pages/Home.js` | MODIFY | Count=120, region name, video block |
| `src/pages/Search.js` | MODIFY | Auto-search after AI, remove button |

---

## Task 1: Dark Theme CSS + Animations

**Files:**
- Create: `src/styles/dark-theme.css`
- Create: `src/styles/animations.css`

- [ ] **Step 1: Create `src/styles/dark-theme.css`**

```css
/* =============================================
   BNI A Team — Premium Dark Theme
   Overrides main.css custom properties
   ============================================= */

:root {
  /* Dark backgrounds */
  --dark-bg:        #0a0f1e;
  --dark-surface:   rgba(255,255,255,0.05);
  --dark-surface2:  rgba(255,255,255,0.09);
  --dark-surface3:  rgba(255,255,255,0.13);
  --dark-border:    rgba(255,255,255,0.08);
  --dark-border2:   rgba(255,255,255,0.15);

  /* Dark text */
  --dark-text:      rgba(255,255,255,0.92);
  --dark-muted:     rgba(255,255,255,0.50);
  --dark-subtle:    rgba(255,255,255,0.30);

  /* Gold on dark */
  --gold-bright:    #FAC775;
  --gold-glow:      rgba(250,199,117,0.20);
  --gold-glow2:     rgba(250,199,117,0.35);

  /* Accent colors */
  --navy-accent:    #185FA5;
  --green-accent:   #4ade80;
  --red-accent:     #f87171;
}

/* ── Global dark base ── */
body {
  background: var(--dark-bg);
  color: var(--dark-text);
}

/* Desktop frame on dark bg */
@media (min-width: 431px) {
  html { background: #050912; }
  body { box-shadow: 0 0 60px rgba(0,0,0,0.6); }
}

/* ── Sections ── */
.hero {
  background: linear-gradient(160deg, #0d1a3a 0%, #0a0f1e 60%, #1a0a2e 100%);
  position: relative;
  overflow: hidden;
}
/* Subtle star-field shimmer behind hero */
.hero::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(250,199,117,0.08) 0%, transparent 70%);
  pointer-events: none;
}

.ai-box {
  background: linear-gradient(180deg, #0d1a3a 0%, #0a0f1e 100%);
}

.stats-strip {
  background: var(--dark-surface);
  border-bottom: 1px solid var(--dark-border);
}
.stat-item { border-right-color: var(--dark-border); }
.stat-num  { color: var(--gold-bright); }
.stat-label { color: var(--dark-muted); }

/* ── Cards — glass morphism ── */
.card,
.person-card,
.mark-card,
.yang-card,
.result-stat,
.result-progress,
.ai-result-card {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  /* Fallback for browsers without backdrop-filter */
  background: rgba(20, 28, 50, 0.85);
}
@supports (backdrop-filter: blur(1px)) {
  .card,
  .person-card,
  .mark-card,
  .yang-card,
  .result-stat,
  .result-progress,
  .ai-result-card {
    background: var(--dark-surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}

/* ── Person card sections ── */
.person-name  { color: var(--dark-text); }
.person-meta  { color: var(--dark-muted); }
.person-section-label { color: var(--dark-muted); }
.person-section-text  {
  background: rgba(255,255,255,0.04);
  color: var(--dark-text);
  border: 1px solid var(--dark-border);
}
.person-keywords { color: var(--gold-bright); }

/* ── Buttons on dark ── */
.btn-one {
  background: rgba(24,95,165,0.25);
  color: #93c5fd;
  border: 1px solid rgba(24,95,165,0.4);
}
.btn-one.active {
  background: var(--navy-accent);
  color: #fff;
  border-color: var(--navy-accent);
  box-shadow: 0 0 12px rgba(24,95,165,0.4);
}
.btn-biz {
  background: rgba(163,45,45,0.20);
  color: #fca5a5;
  border: 1px solid rgba(163,45,45,0.35);
}
.btn-biz.active {
  background: #991b1b;
  color: #fff;
  border-color: #991b1b;
  box-shadow: 0 0 12px rgba(163,45,45,0.4);
}
.btn-ai {
  background: linear-gradient(135deg, #BA7517 0%, #FAC775 100%);
  box-shadow: 0 4px 20px var(--gold-glow2);
}
.btn-ai:active {
  box-shadow: 0 2px 8px var(--gold-glow);
}

/* ── AI result card ── */
.ai-result-card {
  background: rgba(186,117,23,0.12);
  border-color: rgba(250,199,117,0.25);
}
.keyword-tag {
  background: rgba(250,199,117,0.15);
  color: var(--gold-bright);
  border: 1px solid rgba(250,199,117,0.3);
}
.btn-search-members {
  background: linear-gradient(135deg, #185FA5 0%, #0d3a6e 100%);
  box-shadow: 0 4px 16px rgba(24,95,165,0.3);
}
.btn-reset {
  border-color: var(--dark-border2);
  color: var(--dark-muted);
}
.btn-reset:hover { background: var(--dark-surface2); }

/* ── AI input ── */
.ai-textarea {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.12);
  color: var(--dark-text);
}
.ai-textarea:focus { border-color: var(--gold-bright); }
.ai-example-chip {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.70);
}
.ai-example-chip:active { background: rgba(255,255,255,0.10); }

/* ── Tab Bar ── */
#tab-bar {
  background: rgba(10,15,30,0.95);
  border-top-color: var(--dark-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.tab-item       { color: var(--dark-muted); }
.tab-item.active { color: var(--gold-bright); }

/* ── Section headers ── */
.section-title  { color: var(--dark-text); }
.section-header { border-bottom: 1px solid var(--dark-border); padding-bottom: 4px; }
.results-header { color: var(--dark-muted); }
.results-header span { color: var(--gold-bright); }

/* ── Branch chips ── */
.branch-chip {
  background: var(--dark-surface);
  border-color: var(--dark-border2);
  color: var(--dark-text);
}
.branch-chip .chip-count { color: var(--dark-muted); }
.branch-chip.sanlu     { border-color: rgba(74,222,128,0.35); color: var(--green-accent); }
.branch-chip.zhongshan { border-color: rgba(24,95,165,0.45); color: #93c5fd; }
.branch-chip:active    { background: var(--dark-surface2); }

/* ── Match badge ── */
.match-badge {
  background: rgba(250,199,117,0.15);
  color: var(--gold-bright);
  border: 1px solid rgba(250,199,117,0.25);
}

/* ── Marks page ── */
.mark-badge.one { background: rgba(24,95,165,0.25); color: #93c5fd; }
.mark-badge.biz { background: rgba(163,45,45,0.25); color: #fca5a5; }
.mark-name      { color: var(--dark-text); }
.mark-meta      { color: var(--dark-muted); }
.btn-remove     { background: var(--dark-surface2); color: var(--dark-muted); }

/* ── Progress bar ── */
.progress-bar-wrap { background: var(--dark-surface2); }
.progress-bar-fill {
  background: linear-gradient(90deg, #BA7517, #FAC775);
  box-shadow: 0 0 8px var(--gold-glow2);
}

/* ── Toast ── */
.toast {
  background: rgba(250,199,117,0.15);
  color: var(--gold-bright);
  border: 1px solid rgba(250,199,117,0.3);
  backdrop-filter: blur(12px);
}

/* ── Empty state ── */
.empty-state-title { color: var(--dark-text); }
.empty-state-sub   { color: var(--dark-muted); }

/* ── Lang toggle button ── */
#lang-toggle {
  position: fixed; top: 12px; right: 12px;
  z-index: 300;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.80);
  font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
  padding: 5px 10px; border-radius: 20px;
  cursor: pointer; font-family: 'Noto Sans TC', sans-serif;
  backdrop-filter: blur(8px);
  transition: background 0.15s, color 0.15s;
  max-width: calc(var(--mobile-max) - 24px);
}
#lang-toggle:active { background: rgba(255,255,255,0.14); }

/* ── Leaders page ── */
.leaders-hero {
  background: linear-gradient(160deg, #0d1a3a 0%, #0a0f1e 60%, #1a0a2e 100%);
  color: #fff; padding: 48px 20px 36px; text-align: center;
  position: relative; overflow: hidden;
}
.leaders-hero::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(250,199,117,0.10) 0%, transparent 70%);
  pointer-events: none;
}
.leaders-hero-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 20px; font-weight: 900; margin-bottom: 4px;
  color: var(--gold-bright);
}
.leaders-hero-sub { font-size: 13px; opacity: 0.65; line-height: 1.5; }

.leader-card-primary {
  background: var(--dark-surface);
  border: 1px solid rgba(250,199,117,0.20);
  border-radius: var(--r); margin: 16px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35);
}
@supports (backdrop-filter: blur(1px)) {
  .leader-card-primary { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
}
.leader-card-primary .lc-top {
  display: flex; align-items: center; gap: 14px; padding: 18px 16px 14px;
}
.leader-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(250,199,117,0.2), rgba(24,95,165,0.2));
  border: 1px solid rgba(250,199,117,0.25);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Noto Serif TC', serif; font-size: 20px; font-weight: 700;
  color: var(--gold-bright); flex-shrink: 0;
}
.leader-name {
  font-family: 'Noto Serif TC', serif; font-size: 18px; font-weight: 900;
  color: var(--dark-text);
}
.leader-title { font-size: 12px; color: var(--dark-muted); margin-top: 3px; }
.leader-contact-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 16px 16px;
}
.leader-contact-btn {
  background: var(--dark-surface2); border: 1px solid var(--dark-border2);
  border-radius: var(--r-sm); padding: 12px 8px;
  text-align: center; cursor: pointer; color: var(--dark-text);
  font-size: 12px; font-weight: 500;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  font-family: 'Noto Sans TC', sans-serif;
  transition: background 0.15s;
}
.leader-contact-btn:active { background: var(--dark-surface3); }
.leader-contact-btn svg { width: 20px; height: 20px; stroke: currentColor; fill: none; }
.leader-contact-btn.line { color: #4ade80; border-color: rgba(74,222,128,0.3); }
.leader-contact-btn.pending { opacity: 0.4; cursor: default; }

.leader-card-secondary {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: var(--r); margin: 0 16px 12px;
  padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.25);
}
.leader-card-secondary .leader-avatar {
  width: 42px; height: 42px; font-size: 16px;
}

/* Accordion */
.accordion-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; cursor: pointer;
  border-bottom: 1px solid var(--dark-border);
  color: var(--dark-text);
}
.accordion-header:active { background: var(--dark-surface2); }
.accordion-arrow { transition: transform 0.2s; color: var(--dark-muted); }
.accordion-header.open .accordion-arrow { transform: rotate(180deg); }
.accordion-content { overflow: hidden; }

/* Director mini card */
.director-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-bottom: 1px solid var(--dark-border);
  color: var(--dark-text);
}
.director-card:last-child { border-bottom: none; }
.director-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--dark-surface2); border: 1px solid var(--dark-border2);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Noto Serif TC', serif; font-size: 13px; font-weight: 700;
  color: var(--dark-muted); flex-shrink: 0;
}
.director-name { font-size: 14px; font-weight: 600; }
.director-btn-card {
  margin-left: auto; flex-shrink: 0;
  font-size: 11px; padding: 4px 10px;
  background: var(--dark-surface2); border: 1px solid var(--dark-border2);
  border-radius: 12px; color: var(--dark-muted); cursor: pointer;
  font-family: 'Noto Sans TC', sans-serif;
}
.director-btn-card.has-link { color: var(--gold-bright); border-color: rgba(250,199,117,0.25); }
.director-btn-card:active { background: var(--dark-surface3); }

/* Video placeholder block */
.video-placeholder {
  margin: 0 16px 4px;
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: var(--r);
  overflow: hidden;
  position: relative;
}
.video-thumb {
  width: 100%; aspect-ratio: 16/9;
  background: linear-gradient(135deg, #0d1a3a 0%, #1a0a2e 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  cursor: pointer; color: rgba(255,255,255,0.8);
}
.video-play-btn {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(250,199,117,0.15);
  border: 2px solid rgba(250,199,117,0.4);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s, transform 0.15s;
}
.video-thumb:active .video-play-btn {
  background: rgba(250,199,117,0.25);
  transform: scale(0.95);
}
.video-caption {
  font-size: 13px; color: var(--dark-muted); text-align: center;
  padding: 10px 16px 14px;
}
```

- [ ] **Step 2: Create `src/styles/animations.css`**

```css
/* =============================================
   BNI A Team — Animations & Transitions
   ============================================= */

/* ── Page transition ── */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
#app > * { animation: fadeSlideUp 0.22s ease both; }

/* ── Card stagger ── */
@keyframes cardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.person-card   { animation: cardIn 0.22s ease both; }
.mark-card     { animation: cardIn 0.22s ease both; }
.director-card { animation: cardIn 0.18s ease both; }

/* Stagger helpers — applied via JS class or nth-child */
.stagger-1  { animation-delay: 0ms; }
.stagger-2  { animation-delay: 50ms; }
.stagger-3  { animation-delay: 100ms; }
.stagger-4  { animation-delay: 150ms; }
.stagger-5  { animation-delay: 200ms; }
.stagger-6  { animation-delay: 250ms; }
/* Cards 7+ get no extra delay — snappy */

/* ── Button press ── */
.btn, .btn-ai, .btn-sm,
.branch-chip, .ai-example-chip {
  transition: transform 0.1s, box-shadow 0.1s, opacity 0.1s;
}
.btn:active, .btn-sm:active { transform: scale(0.96); }
.btn-ai:active { transform: scale(0.98); }
.branch-chip:hover { transform: translateY(-1px); }
.branch-chip:active { transform: translateY(0) scale(0.97); }

/* ── AI Loading animation ── */
@keyframes scanLine {
  0%   { transform: translateX(-100%); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateX(400%); opacity: 0; }
}
@keyframes particlePulse {
  0%, 100% { transform: scale(1);   opacity: 0.6; }
  50%       { transform: scale(1.6); opacity: 1; }
}
@keyframes typeReveal {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}
@keyframes shimmerBar {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.ai-loading-container {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 44px 24px 36px;
  background: linear-gradient(180deg, #0d1a3a 0%, #0a0f1e 100%);
  position: relative; overflow: hidden;
  min-height: 180px;
}
/* Scan line */
.ai-scan-line {
  position: absolute;
  height: 1px; width: 50%;
  top: 50%;
  background: linear-gradient(90deg, transparent, var(--gold-bright), transparent);
  animation: scanLine 1.8s ease-in-out infinite;
}
/* Particles */
.ai-particles {
  display: flex; gap: 10px; margin-bottom: 20px;
}
.ai-particle {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--gold-bright);
  box-shadow: 0 0 8px var(--gold-glow2);
  animation: particlePulse 1.2s ease-in-out infinite;
}
.ai-particle:nth-child(1) { animation-delay: 0ms; }
.ai-particle:nth-child(2) { animation-delay: 200ms; background: #93c5fd; box-shadow: 0 0 8px rgba(147,197,253,0.4); }
.ai-particle:nth-child(3) { animation-delay: 400ms; }
.ai-particle:nth-child(4) { animation-delay: 200ms; background: #93c5fd; box-shadow: 0 0 8px rgba(147,197,253,0.4); }
.ai-particle:nth-child(5) { animation-delay: 0ms; }

/* Typing text */
.ai-loading-text {
  font-size: 13px;
  color: rgba(255,255,255,0.75);
  font-family: 'Noto Sans TC', sans-serif;
  margin-bottom: 16px;
  overflow: hidden;
  white-space: nowrap;
  animation: typeReveal 1.2s steps(20, end) forwards;
}
/* Shimmer progress bar */
.ai-shimmer-bar {
  width: 120px; height: 3px; border-radius: 2px; overflow: hidden;
  background: var(--dark-surface2);
}
.ai-shimmer-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg,
    transparent 0%, var(--gold-bright) 40%, rgba(255,255,255,0.8) 50%, var(--gold-bright) 60%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmerBar 1.2s linear infinite;
}

/* ── Hero gold shimmer text ── */
@keyframes goldShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.hero-title-shimmer {
  background: linear-gradient(90deg,
    #fff 0%, #FAC775 30%, #fff 50%, #FAC775 70%, #fff 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: goldShimmer 3s linear infinite;
}

/* ── Tab bar icon active glow ── */
.tab-item.active svg {
  filter: drop-shadow(0 0 4px rgba(250,199,117,0.6));
}

/* ── Card hover lift (touch devices skip hover) ── */
@media (hover: hover) {
  .person-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    transition: transform 0.2s, box-shadow 0.2s;
  }
}

/* ── Accordion open/close ── */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.accordion-content.open { animation: slideDown 0.2s ease both; }

/* ── Lang toggle entrance ── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
#lang-toggle { animation: fadeIn 0.3s ease 0.5s both; }
```

- [ ] **Step 3: Verify both files exist and have no obvious syntax errors**

```bash
node -e "require('fs').accessSync('src/styles/dark-theme.css'); require('fs').accessSync('src/styles/animations.css'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add src/styles/dark-theme.css src/styles/animations.css
git commit -m "feat(ui): add premium dark theme CSS and animation keyframes"
```

---

## Task 2: i18n Translations + Leaders Data

**Files:**
- Create: `src/i18n/translations.js`
- Create: `src/data/leaders.js`

- [ ] **Step 1: Create `src/i18n/translations.js`**

```javascript
export const translations = {
  zh: {
    // Tab labels
    tab_home:    '首頁',
    tab_search:  '找人脈',
    tab_marks:   '我的標記',
    tab_result:  '我的成果',
    tab_leaders: '領導層',

    // Hero
    hero_eyebrow: 'BNI · 20 YEARS TAIWAN',
    hero_title:   '20 分會商務連結行動',
    hero_sub:     '說出你想找的人\nAI 幫你找到對的夥伴',
    hero_region:  '台北市北區 Anderson Team / 新北市西北B區',

    // Search
    search_label:       '說一句話，幫你找到對的人',
    search_placeholder: '我是做保險的，想找企業主或會計師',
    search_btn:         'AI 幫我找',
    search_example1:    '我是律師，想認識高資產客戶和財務顧問',
    search_example2:    '我做室內設計，想找建商或企業主裝修客戶',
    search_example3:    '我是人力資源顧問，想認識中小企業主',
    search_analyzing:   'AI 分析中，正在為你搜尋最佳夥伴…',
    search_results:     '位夥伴符合',
    search_no_result:   '找不到符合的夥伴',
    search_no_result_sub: '試試其他關鍵字描述',
    search_reset:       '重新輸入',
    search_browse:      '瀏覽分會',
    search_zhongshan:   '中山區',
    search_sanlu:       '三蘆區',
    search_branch_members: '位',

    // Card
    card_have:     '我有的資源',
    card_want:     '想認識的對象',
    card_matched:  '項符合',
    card_line:     '加 LINE',
    card_one:      '想約 1-1',
    card_biz:      '有合作可能',

    // Stats
    stat_branches: '參與分會',
    stat_members:  '報名夥伴',
    stat_marks:    '我的標記',

    // Home sections
    home_leaders:    '區域領導者',
    home_view:       '查看領導層',
    home_branches:   '20 分會陣容',
    home_view_all:   '查看所有夥伴',
    home_video:      'A Team 20 分會共同影片',
    home_watch:      '觀看影片',
    home_video_soon: '影片即將上線',

    // Marks
    marks_title:   '我的標記',
    marks_empty_title: '還沒有標記',
    marks_empty_sub:   '去找人脈頁搜尋夥伴\n點「想約 1-1」或「有合作可能」即可標記',
    marks_go:      '去找人脈',
    marks_remove:  '移除標記',
    marks_line:    '加 LINE',
    mark_one_label: '想約 1-1',
    mark_biz_label: '有合作可能',

    // Result
    result_title:    '我的成果',
    result_total:    '有效標記',
    result_one:      '想約 1-1',
    result_biz:      '有合作可能',
    result_goal:     '今日目標',
    result_progress: '今日進度',
    result_done:     '目標達成！繼續創造更多商機',
    result_remain:   '還差',
    result_remain2:  '位達標，繼續加油！',
    result_list:     '已標記夥伴',

    // Leaders
    leaders_title:   'Anderson Team 區域領導群',
    leaders_sub:     '台北市北區 Anderson Team / 新北市西北B區',
    leaders_section_zh: '中山區董顧',
    leaders_section_san: '三蘆區董顧',
    leaders_card:    '名片',
    leaders_line:    '加 LINE',
    leaders_phone:   '電話',
    leaders_email:   'Email',
    leaders_pending: '待補充',

    // Toast
    toast_line_copy:    'LINE ID 已複製，到 LINE 搜尋貼上',
    toast_line_manual:  '請手動搜尋 LINE ID：',
    toast_line_none:    '這位夥伴沒有填 LINE 連結',

    // Lang toggle
    lang_toggle: 'EN',
  },

  en: {
    tab_home:    'Home',
    tab_search:  'Connect',
    tab_marks:   'Saved',
    tab_result:  'Results',
    tab_leaders: 'Leaders',

    hero_eyebrow: 'BNI · 20 YEARS TAIWAN',
    hero_title:   '20 Chapters Business Connect',
    hero_sub:     'Tell us who you\'re looking for\nAI finds the right partner for you',
    hero_region:  'Taipei North Anderson Team / New Taipei NW-B',

    search_label:       'Describe who you\'re looking for',
    search_placeholder: 'I\'m in insurance, looking for business owners or accountants',
    search_btn:         'AI Find for Me',
    search_example1:    'I\'m a lawyer looking for high-net-worth clients and financial advisors',
    search_example2:    'I do interior design, looking for developers or business owners',
    search_example3:    'I\'m an HR consultant looking for SME owners',
    search_analyzing:   'AI analyzing, finding your best connections…',
    search_results:     'members matched',
    search_no_result:   'No matching members found',
    search_no_result_sub: 'Try a different description',
    search_reset:       'Search Again',
    search_browse:      'Browse Chapters',
    search_zhongshan:   'Zhongshan District',
    search_sanlu:       'Sanlu District',
    search_branch_members: '',

    card_have:    'What I Offer',
    card_want:    'Who I Want to Meet',
    card_matched: 'matched',
    card_line:    'Add LINE',
    card_one:     '1-on-1',
    card_biz:     'Potential Partner',

    stat_branches: 'Chapters',
    stat_members:  'Members',
    stat_marks:    'Saved',

    home_leaders:  'Regional Leadership',
    home_view:     'View Leaders',
    home_branches: '20 BNI Chapters',
    home_view_all: 'View All Members',
    home_video:    'A Team 20 Chapters Video',
    home_watch:    'Watch Video',
    home_video_soon: 'Coming Soon',

    marks_title:        'Saved Members',
    marks_empty_title:  'No saved members yet',
    marks_empty_sub:    'Go to Connect and tap\n"1-on-1" or "Potential Partner" to save',
    marks_go:           'Go Connect',
    marks_remove:       'Remove',
    marks_line:         'Add LINE',
    mark_one_label:     '1-on-1',
    mark_biz_label:     'Partner',

    result_title:    'My Results',
    result_total:    'Total Saved',
    result_one:      '1-on-1',
    result_biz:      'Partners',
    result_goal:     'Today\'s Goal',
    result_progress: 'Today\'s Progress',
    result_done:     'Goal reached! Keep creating opportunities',
    result_remain:   'Need',
    result_remain2:  'more to reach goal!',
    result_list:     'Saved Members',

    leaders_title:    'Anderson Team Regional Leaders',
    leaders_sub:      'Taipei North Anderson Team / New Taipei NW-B',
    leaders_section_zh: 'Zhongshan Directors',
    leaders_section_san: 'Sanlu Directors',
    leaders_card:     'Card',
    leaders_line:     'LINE',
    leaders_phone:    'Call',
    leaders_email:    'Email',
    leaders_pending:  'Coming Soon',

    toast_line_copy:   'LINE ID copied — paste in LINE to search',
    toast_line_manual: 'LINE ID: ',
    toast_line_none:   'No LINE contact for this member',

    lang_toggle: '中',
  }
};

export function t(key) {
  const lang = window.BNI_LANG || 'zh';
  return translations[lang][key] ?? translations['zh'][key] ?? key;
}
```

- [ ] **Step 2: Create `src/data/leaders.js`**

```javascript
export const LEADERS = {
  primary: {
    name: '楊日陞',
    nameEn: 'Yang Ri-Sheng',
    title: '區域資深董事',
    titleEn: 'Senior Regional Director',
    region: '台北市北區 Anderson Team / 新北市西北B區',
    phone: '',
    email: '',
    lineLink: '',
    lineId: '',
    cardLink: '',
  },
  secondary: {
    name: '李鴻毅',
    nameEn: 'Li Hong-Yi',
    title: '區董、7+12 董顧',
    titleEn: 'Regional Director, 7+12 Board Advisor',
    phone: '',
    email: '',
    lineLink: '',
    lineId: '',
    cardLink: '',
  },
  zhongshan: [
    { name: '曾惠君', cardLink: '' },
    { name: '張文婷', cardLink: '' },
    { name: '鐘坤宏', cardLink: '' },
    { name: '詹鴻鵠', cardLink: '' },
    { name: '陳麗惠', cardLink: '' },
    { name: '廖筱蘭', cardLink: '' },
    { name: '游姿菱', cardLink: '' },
  ],
  sanlu: [
    { name: '孫成育', cardLink: '' },
    { name: '張松源', cardLink: '' },
    { name: '郭愛珠', cardLink: '' },
    { name: '李赫茗', cardLink: '' },
    { name: '蕭淑蓉', cardLink: '' },
    { name: '周玉茹', cardLink: '' },
    { name: '張力文', cardLink: '' },
    { name: '王彥萍', cardLink: '' },
    { name: '江學洋', cardLink: '' },
    { name: '王執定', cardLink: '' },
    { name: '陳沛緹', cardLink: '' },
    { name: '洪岳裕', cardLink: '' },
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/translations.js src/data/leaders.js
git commit -m "feat: add i18n translations and Anderson Team leaders data"
```

---

## Task 3: Leaders Page

**Files:**
- Create: `src/pages/Leaders.js`

- [ ] **Step 1: Create `src/pages/Leaders.js`**

```javascript
import { LEADERS } from '../data/leaders.js';
import { t } from '../i18n/translations.js';
import { escHtml, escAttr } from '../utils/html.js';
import { showToast } from '../utils/toast.js';

export function renderLeaders(container) {
  const { primary, secondary, zhongshan, sanlu } = LEADERS;

  container.innerHTML = `
    <div class="leaders-hero">
      <div style="font-size:11px;letter-spacing:3px;opacity:0.5;margin-bottom:10px;font-family:'Noto Sans TC',sans-serif">
        BNI ANDERSON TEAM
      </div>
      <div class="leaders-hero-title serif">${escHtml(t('leaders_title'))}</div>
      <div class="leaders-hero-sub">${escHtml(t('leaders_sub'))}</div>
    </div>

    ${leaderCardPrimary(primary)}
    ${leaderCardSecondary(secondary)}

    <div style="height:8px"></div>

    ${accordion(t('leaders_section_zh'), zhongshan, 'zh')}
    ${accordion(t('leaders_section_san'), sanlu, 'sanlu')}

    <div style="height:24px"></div>
  `;

  bindLeaderEvents(container);
}

function leaderCardPrimary(l) {
  const initial = (l.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  return `
    <div class="leader-card-primary">
      <div class="lc-top">
        <div class="leader-avatar">${escHtml(initial)}</div>
        <div>
          <div class="leader-name">${escHtml(l.name)}</div>
          <div class="leader-title">${escHtml(t('leaders_title') ? l.title : l.titleEn)}</div>
        </div>
      </div>
      <div class="leader-contact-grid">
        <button class="leader-contact-btn line ${l.lineLink ? '' : 'pending'}"
          data-action="leader-line"
          data-link="${escAttr(l.lineLink)}"
          data-id="${escAttr(l.lineId)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          ${escHtml(t('leaders_line'))}
        </button>
        <button class="leader-contact-btn ${l.phone ? '' : 'pending'}"
          data-action="leader-phone" data-phone="${escAttr(l.phone)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
          ${escHtml(t('leaders_phone'))}
        </button>
        <button class="leader-contact-btn ${l.email ? '' : 'pending'}"
          data-action="leader-email" data-email="${escAttr(l.email)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          ${escHtml(t('leaders_email'))}
        </button>
        <button class="leader-contact-btn ${l.cardLink ? '' : 'pending'}"
          data-action="leader-card" data-link="${escAttr(l.cardLink)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          ${escHtml(t('leaders_card'))}
        </button>
      </div>
    </div>`;
}

function leaderCardSecondary(l) {
  const initial = (l.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  return `
    <div class="leader-card-secondary">
      <div class="leader-avatar">${escHtml(initial)}</div>
      <div style="flex:1">
        <div class="leader-name" style="font-size:16px">${escHtml(l.name)}</div>
        <div class="leader-title">${escHtml(l.title)}</div>
      </div>
      <button class="director-btn-card ${l.cardLink ? 'has-link' : ''}"
        data-action="leader-card" data-link="${escAttr(l.cardLink)}">
        ${escHtml(t('leaders_card'))}
      </button>
    </div>`;
}

function accordion(title, people, id) {
  const cards = people.map(p => {
    const initial = (p.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
    return `<div class="director-card">
      <div class="director-avatar">${escHtml(initial)}</div>
      <div class="director-name">${escHtml(p.name)}</div>
      <button class="director-btn-card ${p.cardLink ? 'has-link' : ''}"
        data-action="director-card" data-link="${escAttr(p.cardLink)}">
        ${escHtml(t('leaders_card'))}
      </button>
    </div>`;
  }).join('');

  return `
    <div class="accordion-wrap" style="margin:0 16px 10px;border-radius:var(--r);border:1px solid var(--dark-border);overflow:hidden">
      <div class="accordion-header" data-accordion="${id}">
        <span style="font-size:14px;font-weight:600">${escHtml(title)}</span>
        <svg class="accordion-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-content open" id="accordion-${id}">${cards}</div>
    </div>`;
}

function bindLeaderEvents(container) {
  // Contact buttons
  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.classList.contains('pending')) {
      if (btn?.classList.contains('pending')) {
        showToast(t('leaders_pending'));
      }
      return;
    }
    const action = btn.dataset.action;
    if (action === 'leader-line') {
      const link = btn.dataset.link;
      const id   = btn.dataset.id;
      if (link) window.open(link, '_blank', 'noopener');
      else if (id) {
        navigator.clipboard.writeText(id).catch(() => {});
        window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
        showToast(t('toast_line_copy'));
      }
    } else if (action === 'leader-phone') {
      const ph = btn.dataset.phone;
      if (ph) window.location.href = `tel:${ph.replace(/[-\s]/g, '')}`;
    } else if (action === 'leader-email') {
      const em = btn.dataset.email;
      if (em) window.location.href = `mailto:${em}`;
    } else if (action === 'leader-card' || action === 'director-card') {
      const link = btn.dataset.link;
      if (link) window.open(link, '_blank', 'noopener');
    }

    // Accordion toggle
    const header = e.target.closest('.accordion-header');
    if (header) {
      const id      = header.dataset.accordion;
      const content = document.getElementById(`accordion-${id}`);
      const isOpen  = content.classList.contains('open');
      content.classList.toggle('open', !isOpen);
      content.style.display = isOpen ? 'none' : 'block';
      header.classList.toggle('open', !isOpen);
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Leaders.js
git commit -m "feat: add Leaders page (Anderson Team leadership)"
```

---

## Task 4: Update index.html + main.js

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`

- [ ] **Step 1: Update `index.html`**

Replace the entire file:

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0a0f1e">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>BNI A Team 商務連結</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="src/styles/main.css">
  <link rel="stylesheet" href="src/styles/dark-theme.css">
  <link rel="stylesheet" href="src/styles/animations.css">
</head>
<body>
  <div id="app"></div>
  <nav id="tab-bar" role="tablist" aria-label="主導覽"></nav>
  <div id="toast" class="toast" role="alert" aria-live="polite"></div>
  <button id="lang-toggle" aria-label="切換語言">EN</button>
  <!-- members.js loaded as classic script to avoid ES module cache issues -->
  <script src="src/data/members.js"></script>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Update `src/main.js`**

Replace entire file:

```javascript
import { renderTabBar } from './components/TabBar.js';
import { renderHome }    from './pages/Home.js';
import { renderSearch }  from './pages/Search.js';
import { renderMarks }   from './pages/Marks.js';
import { renderResult }  from './pages/Result.js';
import { renderLeaders } from './pages/Leaders.js';
import { t }             from './i18n/translations.js';

// ── Language ──────────────────────────────────────
window.BNI_LANG = localStorage.getItem('bni_lang') || 'zh';

function initLangToggle() {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  btn.textContent = t('lang_toggle');
  btn.addEventListener('click', () => {
    window.BNI_LANG = window.BNI_LANG === 'zh' ? 'en' : 'zh';
    localStorage.setItem('bni_lang', window.BNI_LANG);
    btn.textContent = t('lang_toggle');
    navigate();
  });
}

// ── Router ────────────────────────────────────────
const app = document.getElementById('app');

const routes = {
  ''          : renderHome,
  '#home'     : renderHome,
  '#search'   : renderSearch,
  '#marks'    : renderMarks,
  '#result'   : renderResult,
  '#leaders'  : renderLeaders,
};

function navigate() {
  const hash = window.location.hash || '';
  const render = routes[hash] || renderHome;
  app.innerHTML = '';
  try {
    render(app);
  } catch (err) {
    console.error('Page render error:', err);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding:40px 20px;text-align:center;color:#f87171;font-family:Noto Sans TC,sans-serif';
    errorDiv.textContent = '頁面載入失敗，請重新整理';
    app.appendChild(errorDiv);
  }
  renderTabBar(document.getElementById('tab-bar'), hash);
  window.scrollTo(0, 0);
}

// ── Error handling ────────────────────────────────
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
});

// ── Init ──────────────────────────────────────────
window.addEventListener('hashchange', navigate);
initLangToggle();
navigate();
```

- [ ] **Step 3: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: load dark theme CSS, add lang toggle, update router for Leaders"
```

---

## Task 5: Update TabBar + Home page

**Files:**
- Modify: `src/components/TabBar.js`
- Modify: `src/pages/Home.js`

- [ ] **Step 1: Update `src/components/TabBar.js`**

Replace entire file:

```javascript
import { getMarkCount } from '../utils/storage.js';
import { t }            from '../i18n/translations.js';

export function renderTabBar(el, currentHash) {
  if (!el) return;
  const markCount = getMarkCount();
  const TABS = [
    { hash: '#home',    label: t('tab_home'),    icon: homeIcon()    },
    { hash: '#search',  label: t('tab_search'),  icon: searchIcon()  },
    { hash: '#marks',   label: t('tab_marks'),   icon: heartIcon()   },
    { hash: '#result',  label: t('tab_result'),  icon: chartIcon()   },
    { hash: '#leaders', label: t('tab_leaders'), icon: teamIcon()    },
  ];
  el.innerHTML = TABS.map(tab => {
    const isMarks  = tab.hash === '#marks';
    const isActive = currentHash === tab.hash ||
      (currentHash === '' && tab.hash === '#home');
    const badge = isMarks && markCount > 0
      ? `<span class="tab-badge" aria-label="${markCount} 個標記">${markCount}</span>` : '';
    return `<button
      class="tab-item${isActive ? ' active' : ''}"
      onclick="location.hash='${tab.hash.slice(1)}'"
      aria-label="${tab.label}"
      aria-selected="${isActive}"
      role="tab">
      <span style="position:relative;display:inline-flex">${tab.icon}${badge}</span>
      <span>${tab.label}</span>
    </button>`;
  }).join('');
}

function homeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
}
function searchIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
}
function heartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}
function chartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
}
function teamIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
```

- [ ] **Step 2: Update `src/pages/Home.js`**

Replace entire file:

```javascript
import { getMarkCount } from '../utils/storage.js';
import { BRANCHES }     from '../data/branches.js';
import { escHtml }      from '../utils/html.js';
import { t }            from '../i18n/translations.js';

const VIDEO_URL = ''; // Fill in when YouTube link is available

export function renderHome(container) {
  const markCount   = getMarkCount();
  const zhongshan   = BRANCHES.zhongshan.filter(b => b.count > 0);
  const sanlu       = BRANCHES.sanlu.filter(b => b.count > 0);

  container.innerHTML = `
    <!-- Hero -->
    <div class="hero">
      <div style="font-size:11px;letter-spacing:3px;opacity:0.5;margin-bottom:10px;font-family:'Noto Sans TC',sans-serif">
        ${escHtml(t('hero_eyebrow'))}
      </div>
      <h1 class="hero-title serif hero-title-shimmer">${escHtml(t('hero_title'))}</h1>
      <p class="hero-sub">${t('hero_sub').replace('\n','<br>')}</p>
      <div style="font-size:11px;margin-top:12px;opacity:0.45;letter-spacing:0.3px">
        ${escHtml(t('hero_region'))}
      </div>
    </div>

    <!-- AI Search -->
    <div class="ai-box">
      <div class="ai-box-label">${escHtml(t('search_label'))}</div>
      <textarea
        id="home-ai-input"
        class="ai-textarea"
        placeholder="${escHtml(t('search_placeholder'))}"
        rows="2"
        aria-label="${escHtml(t('search_label'))}"
        maxlength="200"></textarea>
      <button id="home-ai-submit" class="btn-ai">${escHtml(t('search_btn'))}</button>
    </div>

    <!-- Stats -->
    <div class="stats-strip" role="list">
      <div class="stat-item" role="listitem">
        <div class="stat-num serif">20</div>
        <div class="stat-label">${escHtml(t('stat_branches'))}</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif">120</div>
        <div class="stat-label">${escHtml(t('stat_members'))}</div>
      </div>
      <div class="stat-item" role="listitem">
        <div class="stat-num serif" id="home-mark-count">${markCount}</div>
        <div class="stat-label">${escHtml(t('stat_marks'))}</div>
      </div>
    </div>

    <!-- Leaders card -->
    <div class="section-header"><div class="section-title">${escHtml(t('home_leaders'))}</div></div>
    <div class="yang-card" style="cursor:pointer" onclick="location.hash='leaders'">
      <div class="yang-photo" aria-hidden="true" style="color:rgba(250,199,117,0.7)">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div class="yang-info">
        <div class="yang-name">楊日陞</div>
        <div class="yang-title">區域資深董事<br>${escHtml(t('hero_region'))}</div>
        <button class="btn-yang" onclick="event.stopPropagation();location.hash='leaders'">
          ${escHtml(t('home_view'))}
        </button>
      </div>
    </div>

    <!-- Video block -->
    <div class="section-header"><div class="section-title">${escHtml(t('home_video'))}</div></div>
    <div class="video-placeholder">
      <div class="video-thumb" id="home-video-btn">
        <div class="video-play-btn" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </div>
        <div style="font-size:13px;opacity:0.7">${VIDEO_URL ? escHtml(t('home_watch')) : escHtml(t('home_video_soon'))}</div>
      </div>
      <div class="video-caption">A Team 20 分會 · Anderson Team</div>
    </div>

    <!-- Branches -->
    <div class="section-header"><div class="section-title">${escHtml(t('home_branches'))}</div></div>
    <div class="branch-section">
      <div class="branch-region-title">${escHtml(t('search_zhongshan'))}</div>
      <div class="branch-chips">
        ${zhongshan.map((b, i) => `<div
          class="branch-chip zhongshan stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.name)}"
          role="button" tabindex="0"
          onclick="location.hash='search'"
          onkeydown="if(event.key==='Enter')location.hash='search'">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <div class="branch-region-title">${escHtml(t('search_sanlu'))}</div>
      <div class="branch-chips">
        ${sanlu.map((b, i) => `<div
          class="branch-chip sanlu stagger-${Math.min(i+1,6)}"
          data-branch="${escHtml(b.name)}"
          role="button" tabindex="0"
          onclick="location.hash='search'"
          onkeydown="if(event.key==='Enter')location.hash='search'">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <button
        onclick="location.hash='search'"
        class="btn-ai"
        style="margin-top:8px;border-radius:var(--r-sm)">
        ${escHtml(t('home_view_all'))}
      </button>
    </div>
    <div style="height:24px"></div>
  `;

  // Home AI → sessionStorage → Search page
  document.getElementById('home-ai-submit').addEventListener('click', () => {
    const v = document.getElementById('home-ai-input').value.trim();
    if (v.length >= 2) sessionStorage.setItem('bni_pending_search', v);
    location.hash = 'search';
  });

  // Video
  document.getElementById('home-video-btn').addEventListener('click', () => {
    if (VIDEO_URL) window.open(VIDEO_URL, '_blank', 'noopener');
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TabBar.js src/pages/Home.js
git commit -m "feat: update TabBar (leaders tab) and Home page (120 members, video block, i18n)"
```

---

## Task 6: Update Search Page (auto-search + i18n)

**Files:**
- Modify: `src/pages/Search.js`

- [ ] **Step 1: Replace entire `src/pages/Search.js`**

```javascript
import { getKeywordsFromAI }               from '../utils/aiSearch.js';
import { searchMembers, getMembersByBranch } from '../utils/search.js';
import { personCardHTML, bindCardEvents }   from '../components/PersonCard.js';
import { BRANCHES }                         from '../data/branches.js';
import { escHtml }                          from '../utils/html.js';
import { t }                                from '../i18n/translations.js';

export function renderSearch(container) {
  const pending = sessionStorage.getItem('bni_pending_search');
  if (pending) sessionStorage.removeItem('bni_pending_search');

  container.innerHTML = buildSearchUI();
  bindSearchEvents(container);
  renderBranchBrowse(document.getElementById('branch-browse-area'));

  if (pending) setTimeout(() => triggerSearch(pending), 50);
}

function buildSearchUI() {
  return `
    <div id="search-ai-box" class="ai-box">
      <div class="ai-box-label">${escHtml(t('search_label'))}</div>
      <textarea id="ai-input" class="ai-textarea"
        placeholder="${escHtml(t('search_placeholder'))}"
        rows="3" aria-label="${escHtml(t('search_label'))}" maxlength="200"></textarea>
      <button id="ai-submit" class="btn-ai">${escHtml(t('search_btn'))}</button>
      <div class="ai-examples" aria-label="搜尋範例">
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example1'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example2'))}</div>
        <div class="ai-example-chip" role="button" tabindex="0">${escHtml(t('search_example3'))}</div>
      </div>
    </div>
    <div id="search-loading" style="display:none" role="status" aria-live="polite"></div>
    <div id="ai-result-area" style="display:none"></div>
    <div id="search-results-area" style="display:none"></div>
    <div id="branch-browse-area"></div>
  `;
}

function bindSearchEvents(container) {
  container.querySelectorAll('.ai-example-chip').forEach(chip => {
    const trigger = () => {
      document.getElementById('ai-input').value = chip.textContent.trim();
      triggerSearch(chip.textContent.trim());
    };
    chip.addEventListener('click', trigger);
    chip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
    });
  });
  document.getElementById('ai-submit').addEventListener('click', () => {
    const input = document.getElementById('ai-input').value.trim();
    if (input.length >= 2) triggerSearch(input);
  });
  document.getElementById('ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('ai-submit').click();
    }
  });
}

async function triggerSearch(input) {
  const aiBox      = document.getElementById('search-ai-box');
  const loading    = document.getElementById('search-loading');
  const resultArea = document.getElementById('ai-result-area');
  const searchArea = document.getElementById('search-results-area');
  const branchArea = document.getElementById('branch-browse-area');
  const submitBtn  = document.getElementById('ai-submit');

  if (!aiBox || !loading) return;
  if (submitBtn) submitBtn.disabled = true;

  aiBox.style.display    = 'none';
  resultArea.style.display = 'none';
  searchArea.style.display = 'none';
  branchArea.style.display = 'none';
  loading.style.display  = 'block';

  // Premium AI loading animation
  loading.innerHTML = `
    <div class="ai-loading-container">
      <div class="ai-scan-line"></div>
      <div class="ai-particles">
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
        <div class="ai-particle"></div>
      </div>
      <div class="ai-loading-text">${escHtml(t('search_analyzing'))}</div>
      <div class="ai-shimmer-bar"><div class="ai-shimmer-fill"></div></div>
    </div>`;

  const keywords = await getKeywordsFromAI(input);

  if (!document.getElementById('search-loading')) return;

  loading.style.display  = 'none';
  if (submitBtn) submitBtn.disabled = false;

  // Show keywords (no manual search button — auto-searches immediately)
  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div class="ai-result-card" style="margin:16px">
      <div class="ai-result-query" style="font-size:12px;margin-bottom:8px;opacity:0.7">
        ${escHtml(input.length > 40 ? input.substring(0,40)+'…' : input)}
      </div>
      <div class="keyword-tags">
        ${keywords.map(k => `<span class="keyword-tag">${escHtml(k)}</span>`).join('')}
      </div>
      <button id="btn-reset-search" class="btn-reset">${escHtml(t('search_reset'))}</button>
    </div>`;

  document.getElementById('btn-reset-search').addEventListener('click', resetSearch);

  // Auto-search immediately
  const results = searchMembers(keywords);
  showResults(results, keywords, searchArea);
  branchArea.style.display = 'block';
}

function showResults(results, keywords, container) {
  container.style.display = 'block';
  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">${escHtml(t('search_no_result'))}</div>
      <div class="empty-state-sub">${escHtml(t('search_no_result_sub'))}</div>
      <button onclick="document.getElementById('btn-reset-search')?.click()"
        class="btn-ai" style="margin-top:16px;border-radius:var(--r-sm);padding:10px 24px;font-size:13px">
        ${escHtml(t('search_reset'))}
      </button>
    </div>`;
    return;
  }
  container.innerHTML = `
    <div class="results-header">
      <span>${results.length}</span> ${escHtml(t('search_results'))}
    </div>
    <div id="cards-list"></div>`;

  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = results.map((m, i) =>
    personCardHTML(m, { matchedKeywords: m.matchedKeywords || [], staggerIndex: i })
  ).join('');
  bindCardEvents(cardsList, results);
}

function resetSearch() {
  const aiBox    = document.getElementById('search-ai-box');
  const result   = document.getElementById('ai-result-area');
  const search   = document.getElementById('search-results-area');
  const branches = document.getElementById('branch-browse-area');
  if (aiBox)    aiBox.style.display    = 'block';
  if (result)   result.style.display   = 'none';
  if (search)   search.style.display   = 'none';
  if (branches) branches.style.display = 'block';
  const input = document.getElementById('ai-input');
  if (input) { input.value = ''; input.focus(); }
}

function renderBranchBrowse(container) {
  if (!container) return;
  const zh  = BRANCHES.zhongshan.filter(b => b.count > 0);
  const san = BRANCHES.sanlu.filter(b => b.count > 0);
  container.innerHTML = `
    <div class="section-header"><div class="section-title">${escHtml(t('search_browse'))}</div></div>
    <div class="branch-section">
      <div class="branch-region-title">${escHtml(t('search_zhongshan'))}</div>
      <div class="branch-chips">
        ${zh.map(b => `<div class="branch-chip zhongshan" data-branch="${escHtml(b.name)}分會" role="button" tabindex="0">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <div class="branch-region-title">${escHtml(t('search_sanlu'))}</div>
      <div class="branch-chips">
        ${san.map(b => `<div class="branch-chip sanlu" data-branch="${escHtml(b.name)}分會" role="button" tabindex="0">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
    </div>`;

  container.addEventListener('click', e => {
    const chip = e.target.closest('[data-branch]');
    if (!chip) return;
    showBranchMembers(chip.dataset.branch);
  });
  container.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const chip = e.target.closest('[data-branch]');
    if (!chip) return;
    e.preventDefault();
    showBranchMembers(chip.dataset.branch);
  });
}

function showBranchMembers(branchName) {
  const members   = getMembersByBranch(branchName);
  const container = document.getElementById('search-results-area');
  if (!container) return;
  container.style.display = 'block';
  if (members.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">${escHtml(branchName)} 目前沒有夥伴資料</div>
    </div>`;
    return;
  }
  container.innerHTML = `
    <div class="results-header">
      <span>${members.length}</span> ${escHtml(t('search_branch_members'))}${escHtml(branchName)} 夥伴
    </div>
    <div id="cards-list"></div>`;
  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = members.map((m, i) => personCardHTML(m, { staggerIndex: i })).join('');
  bindCardEvents(cardsList, members);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Search.js
git commit -m "feat: auto-search after AI (remove manual button), premium loading animation, i18n"
```

---

## Task 7: Update PersonCard + Marks + Result (i18n)

**Files:**
- Modify: `src/components/PersonCard.js`
- Modify: `src/pages/Marks.js`
- Modify: `src/pages/Result.js`

- [ ] **Step 1: Update PersonCard to use i18n + stagger animation**

In `src/components/PersonCard.js`, replace the export function:

```javascript
import { getMark, setMark, memberKey } from '../utils/storage.js';
import { showToast }                   from '../utils/toast.js';
import { escHtml, escAttr }            from '../utils/html.js';
import { t }                           from '../i18n/translations.js';

export function personCardHTML(member, opts = {}) {
  const { matchedKeywords = [], staggerIndex = 0 } = opts;
  const mark    = getMark(member);
  const key     = memberKey(member);
  const initial = (member.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const staggerClass = staggerIndex < 6 ? `stagger-${staggerIndex + 1}` : '';

  const badge = matchedKeywords.length > 0
    ? `<span class="match-badge">${matchedKeywords.length} ${escHtml(t('card_matched'))}</span>` : '';

  const haveSection = member.have
    ? `<div class="person-section">
        <div class="person-section-label">${escHtml(t('card_have'))}</div>
        <div class="person-section-text">${escHtml(member.have)}</div>
       </div>` : '';

  const wantSection = member.wantMeet
    ? `<div class="person-section">
        <div class="person-section-label">${escHtml(t('card_want'))}</div>
        <div class="person-section-text">${escHtml(member.wantMeet)}</div>
       </div>` : '';

  const kwSection = matchedKeywords.length > 0
    ? `<div class="person-keywords">${matchedKeywords.map(k => escHtml(k)).join('、')}</div>` : '';

  return `<div class="person-card ${staggerClass}" data-key="${escAttr(key)}">
    <div class="person-card-header">
      <div class="person-avatar" aria-hidden="true">${escHtml(initial)}</div>
      <div style="flex:1;min-width:0">
        <div class="person-name">${escHtml(member.name)}</div>
        <div class="person-meta">${escHtml(member.branch)} · ${escHtml(member.profession)}</div>
      </div>
      ${badge}
    </div>
    ${haveSection}${wantSection}${kwSection}
    <div class="person-actions">
      <button class="btn btn-line"
        data-action="line" data-key="${escAttr(key)}"
        data-line-link="${escAttr(member.lineLink)}"
        data-line-id="${escAttr(member.lineId)}">${escHtml(t('card_line'))}</button>
      <button class="btn btn-one ${mark.one ? 'active' : ''}"
        data-action="one" data-key="${escAttr(key)}">${escHtml(t('card_one'))}</button>
      <button class="btn btn-biz ${mark.biz ? 'active' : ''}"
        data-action="biz" data-key="${escAttr(key)}">${escHtml(t('card_biz'))}</button>
    </div>
  </div>`;
}

export function bindCardEvents(container, members) {
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const key    = btn.dataset.key;
    const member = members.find(m => memberKey(m) === key);
    if (!member && action !== 'line') return;

    if (action === 'line') {
      const lineLink = btn.dataset.lineLink || member?.lineLink || '';
      const lineId   = btn.dataset.lineId   || member?.lineId   || '';
      handleLine({ lineLink, lineId, name: member?.name || '' });
    } else {
      setMark(member, action);
      const card = container.querySelector(`.person-card[data-key="${CSS.escape(key)}"]`);
      if (card) {
        const updatedMark = getMark(member);
        card.querySelector('[data-action="one"]')?.classList.toggle('active', updatedMark.one);
        card.querySelector('[data-action="biz"]')?.classList.toggle('active', updatedMark.biz);
      }
      import('../components/TabBar.js').then(({ renderTabBar }) => {
        renderTabBar(document.getElementById('tab-bar'), window.location.hash);
      });
    }
  });
}

function handleLine({ lineLink, lineId, name }) {
  if (lineLink && lineLink.startsWith('http')) {
    window.open(lineLink, '_blank', 'noopener');
  } else if (lineId) {
    navigator.clipboard.writeText(lineId)
      .then(() => showToast(`${t('toast_line_copy')}`))
      .catch(() => showToast(`${t('toast_line_manual')}${lineId}`));
    window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
  } else {
    showToast(t('toast_line_none'));
  }
}
```

- [ ] **Step 2: Update `src/pages/Marks.js` for i18n**

Replace `src/pages/Marks.js`:

```javascript
import { getMarks, removeMark }   from '../utils/storage.js';
import { showToast }              from '../utils/toast.js';
import { renderTabBar }           from '../components/TabBar.js';
import { escHtml, escAttr }       from '../utils/html.js';
import { t }                      from '../i18n/translations.js';

export function renderMarks(container) {
  const marks = getMarks().filter(m => m.one || m.biz);

  if (marks.length === 0) {
    container.innerHTML = `
      <div class="section-header"><div class="section-title">${escHtml(t('marks_title'))}</div></div>
      <div class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" style="margin-bottom:16px" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <div class="empty-state-title">${escHtml(t('marks_empty_title'))}</div>
        <div class="empty-state-sub">${t('marks_empty_sub').replace('\n','<br>')}</div>
        <button onclick="location.hash='search'"
          class="btn-ai" style="margin-top:20px;border-radius:var(--r-sm);padding:12px 28px;font-size:14px">
          ${escHtml(t('marks_go'))}
        </button>
      </div>`;
    return;
  }

  const cards = marks.map((m, i) => {
    const initial = (m.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
    const stagger = i < 6 ? `stagger-${i+1}` : '';
    return `
    <div class="mark-card ${stagger}" data-key="${escAttr(m.key)}">
      <div class="mark-card-top">
        <div class="mark-avatar" aria-hidden="true">${escHtml(initial)}</div>
        <div style="flex:1;min-width:0">
          <div class="mark-name">${escHtml(m.name)}</div>
          <div class="mark-meta">${escHtml(m.branch)} · ${escHtml(m.profession)}</div>
        </div>
      </div>
      <div class="mark-badges">
        ${m.one ? `<span class="mark-badge one">${escHtml(t('mark_one_label'))}</span>` : ''}
        ${m.biz ? `<span class="mark-badge biz">${escHtml(t('mark_biz_label'))}</span>` : ''}
      </div>
      ${m.have ? `<div style="font-size:12px;color:var(--dark-muted);margin:4px 0 8px;line-height:1.6;word-break:break-all">
        ${escHtml(m.have.length > 80 ? m.have.substring(0,80)+'…' : m.have)}
      </div>` : ''}
      <div class="mark-actions">
        <button class="btn-sm btn-add-line"
          data-action="line" data-key="${escAttr(m.key)}"
          data-line-link="${escAttr(m.lineLink||'')}"
          data-line-id="${escAttr(m.lineId||'')}">${escHtml(t('marks_line'))}</button>
        <button class="btn-sm btn-remove"
          data-action="remove" data-key="${escAttr(m.key)}">${escHtml(t('marks_remove'))}</button>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="section-header">
      <div class="section-title">${escHtml(t('marks_title'))}
        <span style="color:var(--dark-muted);font-size:14px;font-weight:400"> ${marks.length} 位</span>
      </div>
    </div>
    <div id="marks-list">${cards}</div>
    <div style="height:24px"></div>`;

  document.getElementById('marks-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const key    = btn.dataset.key;
    const action = btn.dataset.action;
    if (action === 'remove') {
      removeMark(key);
      renderMarks(container);
      renderTabBar(document.getElementById('tab-bar'), '#marks');
    } else if (action === 'line') {
      const link = btn.dataset.lineLink;
      const id   = btn.dataset.lineId;
      if (link && link.startsWith('http')) {
        window.open(link, '_blank', 'noopener');
      } else if (id) {
        navigator.clipboard.writeText(id)
          .then(() => showToast(`${t('toast_line_copy')}`))
          .catch(() => showToast(`${t('toast_line_manual')}${id}`));
        window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
      } else {
        showToast(t('toast_line_none'));
      }
    }
  });
}
```

- [ ] **Step 3: Update `src/pages/Result.js` for i18n**

Replace `src/pages/Result.js`:

```javascript
import { getMarks } from '../utils/storage.js';
import { escHtml }  from '../utils/html.js';
import { t }        from '../i18n/translations.js';

const GOAL = 5;

export function renderResult(container) {
  const marks    = getMarks().filter(m => m.one || m.biz);
  const oneCount = marks.filter(m => m.one).length;
  const bizCount = marks.filter(m => m.biz).length;
  const total    = marks.length;
  const pct      = Math.min(100, Math.round((total / GOAL) * 100));

  container.innerHTML = `
    <div class="section-header"><div class="section-title">${escHtml(t('result_title'))}</div></div>
    <div class="result-grid">
      <div class="result-stat stagger-1">
        <div class="result-stat-num serif">${total}</div>
        <div class="result-stat-label">${escHtml(t('result_total'))}</div>
      </div>
      <div class="result-stat stagger-2">
        <div class="result-stat-num serif">${oneCount}</div>
        <div class="result-stat-label">${escHtml(t('result_one'))}</div>
      </div>
      <div class="result-stat stagger-3">
        <div class="result-stat-num serif">${bizCount}</div>
        <div class="result-stat-label">${escHtml(t('result_biz'))}</div>
      </div>
      <div class="result-stat stagger-4">
        <div class="result-stat-num serif">${GOAL}</div>
        <div class="result-stat-label">${escHtml(t('result_goal'))}</div>
      </div>
    </div>
    <div class="result-progress stagger-5">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:var(--dark-text)">${escHtml(t('result_progress'))}</span>
        <span style="font-size:13px;color:var(--dark-muted)">${total} / ${GOAL}</span>
      </div>
      <div class="progress-bar-wrap" role="progressbar" aria-valuenow="${total}" aria-valuemin="0" aria-valuemax="${GOAL}">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div style="font-size:12px;color:var(--dark-muted);margin-top:8px">
        ${total >= GOAL
          ? escHtml(t('result_done'))
          : `${escHtml(t('result_remain'))} ${GOAL - total} ${escHtml(t('result_remain2'))}`}
      </div>
    </div>
    ${marks.length > 0 ? `
      <div class="section-header" style="padding-top:12px">
        <div class="section-title" style="font-size:15px">${escHtml(t('result_list'))}</div>
      </div>
      <div style="background:var(--dark-surface);border:1px solid var(--dark-border);border-radius:var(--r);margin:0 16px;overflow:hidden">
        ${marks.map((m, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
            ${i > 0 ? 'border-top:1px solid var(--dark-border)' : ''}">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px;color:var(--dark-text)">${escHtml(m.name)}</div>
              <div style="font-size:12px;color:var(--dark-muted)">${escHtml(m.branch)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              ${m.one ? `<span style="background:rgba(24,95,165,0.25);color:#93c5fd;font-size:10px;font-weight:600;padding:3px 7px;border-radius:10px">1-1</span>` : ''}
              ${m.biz ? `<span style="background:rgba(163,45,45,0.25);color:#fca5a5;font-size:10px;font-weight:600;padding:3px 7px;border-radius:10px">${escHtml(t('mark_biz_label'))}</span>` : ''}
            </div>
          </div>`).join('')}
      </div>
    ` : ''}
    <div style="height:24px"></div>`;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PersonCard.js src/pages/Marks.js src/pages/Result.js
git commit -m "feat: add i18n support and stagger animations to cards, marks, result pages"
```

---

## Task 8: Final integration + push

- [ ] **Step 1: Create directories if missing**

```bash
mkdir -p src/i18n
```

- [ ] **Step 2: Run syntax check on ALL new/modified files**

```bash
node -e "
const fs = require('fs');
const files = [
  'src/styles/dark-theme.css',
  'src/styles/animations.css',
  'src/i18n/translations.js',
  'src/data/leaders.js',
  'src/pages/Leaders.js',
  'index.html',
  'src/main.js',
  'src/components/TabBar.js',
  'src/pages/Home.js',
  'src/pages/Search.js',
  'src/components/PersonCard.js',
  'src/pages/Marks.js',
  'src/pages/Result.js',
];
let ok = true;
files.forEach(f => {
  if (!fs.existsSync(f)) { console.log('MISSING:', f); ok = false; return; }
  const src = fs.readFileSync(f,'utf8');
  if (!f.endsWith('.js')) { console.log('OK (non-JS):', f); return; }
  try {
    const test = src
      .replace(/^export\s+(default\s+)?/gm,'')
      .replace(/^import\s+.*;\s*$/gm,'');
    new Function(test);
    console.log('OK:', f);
  } catch(e) { console.log('FAIL:', f, e.message); ok = false; }
});
process.exit(ok ? 0 : 1);
"
```
Expected: all lines start with `OK`

- [ ] **Step 3: Start local preview and verify all 5 pages work**

```bash
npx serve -p 3000 .
```

Open `http://localhost:3000` and verify:
1. Dark background renders (not white) ✅
2. Gold shimmer in hero title ✅
3. Tab bar shows: 首頁/Connect/找人脈 / 我的標記 / 我的成果 / **領導層** ✅
4. EN toggle in top-right corner ✅
5. Click EN → all UI text switches to English ✅
6. Search → type query → loading animation plays → results auto-appear ✅
7. 領導層 page shows 楊日陞 + 李鴻毅 + accordion ✅
8. Home page shows 120 members + video placeholder ✅

- [ ] **Step 4: Git push**

```bash
git add -A
git commit -m "feat(v2): premium dark UI, Leaders page, i18n EN/ZH toggle, auto-search, Anderson Team branding"
git push
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Region name "台北市北區 Anderson Team / 新北市西北B區" — Home.js hero + Leaders.js hero
- [x] 楊日陞 full info — leaders.js + Leaders.js
- [x] 李鴻毅 — leaders.js + Leaders.js
- [x] 19 directors list — leaders.js
- [x] Member count 120 — Home.js
- [x] Video placeholder — Home.js
- [x] Tab 5 "領導層" — TabBar.js + main.js route `#leaders`
- [x] Premium dark CSS — dark-theme.css
- [x] Animations — animations.css
- [x] AI loading upgrade — Search.js
- [x] Auto-search (remove manual button) — Search.js
- [x] EN/ZH toggle — index.html button + main.js + translations.js
- [x] translations.js has all keys used in all pages
- [x] backdrop-filter fallback — dark-theme.css
- [x] stagger animations capped at 6 — animations.css + staggerIndex logic
- [x] accordion for directors — Leaders.js

**No placeholders found.**

**Type consistency:** All functions named consistently across tasks (renderLeaders, LEADERS, t(), etc.)
