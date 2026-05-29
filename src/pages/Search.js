import { getKeywordsFromAI } from '../utils/aiSearch.js';
import { searchMembers, getMembersByBranch } from '../utils/search.js';
import { personCardHTML, bindCardEvents } from '../components/PersonCard.js';
import { BRANCHES } from '../data/branches.js';
import { escHtml } from '../utils/html.js';

export function renderSearch(container) {
  // Check for pending search from home page
  const pending = sessionStorage.getItem('bni_pending_search');
  if (pending) {
    sessionStorage.removeItem('bni_pending_search');
  }

  container.innerHTML = buildSearchUI();
  bindSearchEvents(container);
  renderBranchBrowse(document.getElementById('branch-browse-area'));

  // Trigger pending search after UI is ready
  if (pending) {
    setTimeout(() => triggerSearch(pending), 50);
  }
}

function buildSearchUI() {
  return `
    <div id="search-ai-box" class="ai-box">
      <div class="ai-box-label">說一句話，幫你找到對的人</div>
      <textarea
        id="ai-input"
        class="ai-textarea"
        placeholder="我是做保險的，想找企業主或會計師"
        rows="3"
        aria-label="AI 搜尋輸入框"
        maxlength="200"></textarea>
      <button id="ai-submit" class="btn-ai">AI 幫我找</button>
      <div class="ai-examples" aria-label="搜尋範例">
        <div class="ai-example-chip" role="button" tabindex="0">我是律師，想認識高資產客戶和財務顧問</div>
        <div class="ai-example-chip" role="button" tabindex="0">我做室內設計，想找建商或企業主裝修客戶</div>
        <div class="ai-example-chip" role="button" tabindex="0">我是人力資源顧問，想認識中小企業主</div>
      </div>
    </div>
    <div id="search-loading" style="display:none" class="loading-dots" role="status" aria-live="polite">
      <div class="dots"><span></span><span></span><span></span></div>
      <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:12px">AI 分析中，請稍候…</div>
    </div>
    <div id="ai-result-area" style="display:none"></div>
    <div id="search-results-area" style="display:none"></div>
    <div id="branch-browse-area"></div>
  `;
}

function bindSearchEvents(container) {
  // Example chips — click or Enter key
  container.querySelectorAll('.ai-example-chip').forEach(chip => {
    const trigger = () => {
      document.getElementById('ai-input').value = chip.textContent.trim();
      triggerSearch(chip.textContent.trim());
    };
    chip.addEventListener('click', trigger);
    chip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); } });
  });

  document.getElementById('ai-submit').addEventListener('click', () => {
    const input = document.getElementById('ai-input').value.trim();
    if (input.length < 2) return;
    triggerSearch(input);
  });

  document.getElementById('ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('ai-submit').click();
    }
  });
}

async function triggerSearch(input) {
  const aiBox    = document.getElementById('search-ai-box');
  const loading  = document.getElementById('search-loading');
  const resultArea  = document.getElementById('ai-result-area');
  const searchArea  = document.getElementById('search-results-area');
  const branchArea  = document.getElementById('branch-browse-area');

  // Null guard — elements may not exist if user navigated away
  if (!aiBox || !loading) return;

  const submitBtn = document.getElementById('ai-submit');
  if (submitBtn) submitBtn.disabled = true;

  aiBox.style.display = 'none';
  loading.style.display = 'block';
  resultArea.style.display = 'none';
  searchArea.style.display = 'none';
  branchArea.style.display = 'none';

  const keywords = await getKeywordsFromAI(input);

  // Check if user navigated away during async operation
  if (!document.getElementById('search-loading')) return;

  loading.style.display = 'none';
  if (submitBtn) submitBtn.disabled = false;

  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div class="ai-result-card">
      <div class="ai-result-query">你說：「${escHtml(input)}」</div>
      <div class="keyword-tags">${keywords.map(k => `<span class="keyword-tag">${escHtml(k)}</span>`).join('')}</div>
      <button id="btn-do-search" class="btn-search-members">搜尋這些夥伴（${keywords.length} 個關鍵字）</button>
      <button id="btn-reset-search" class="btn-reset">重新輸入</button>
    </div>
  `;

  document.getElementById('btn-reset-search').addEventListener('click', resetSearch);
  document.getElementById('btn-do-search').addEventListener('click', () => {
    const results = searchMembers(keywords);
    showResults(results, searchArea);
    branchArea.style.display = 'block';
  });

  // Auto-trigger search immediately
  document.getElementById('btn-do-search').click();
}

function showResults(results, container) {
  container.style.display = 'block';
  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">找不到符合的夥伴</div>
      <div class="empty-state-sub">試試其他關鍵字描述</div>
      <button onclick="document.getElementById('btn-reset-search')?.click()"
        style="margin-top:16px;padding:10px 20px;background:var(--navy);color:#fff;border:none;border-radius:var(--r-sm);font-size:13px;cursor:pointer;font-family:'Noto Sans TC',sans-serif">
        重新搜尋
      </button>
    </div>`;
    return;
  }
  container.innerHTML = `
    <div class="results-header"><span>${results.length}</span> 位夥伴符合</div>
    <div id="cards-list"></div>
  `;
  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = results.map(m =>
    personCardHTML(m, { matchedKeywords: m.matchedKeywords || [] })
  ).join('');
  bindCardEvents(cardsList, results);
}

function resetSearch() {
  const aiBox   = document.getElementById('search-ai-box');
  const resultArea = document.getElementById('ai-result-area');
  const searchArea = document.getElementById('search-results-area');
  const branchArea = document.getElementById('branch-browse-area');

  if (aiBox)   { aiBox.style.display   = 'block'; }
  if (resultArea) { resultArea.style.display = 'none';  }
  if (searchArea) { searchArea.style.display = 'none';  }
  if (branchArea) { branchArea.style.display = 'block'; }

  const input = document.getElementById('ai-input');
  if (input) { input.value = ''; input.focus(); }
}

function renderBranchBrowse(container) {
  if (!container) return;
  const zhongshan = BRANCHES.zhongshan.filter(b => b.count > 0);
  const sanlu = BRANCHES.sanlu.filter(b => b.count > 0);

  container.innerHTML = `
    <div class="section-header"><div class="section-title">瀏覽分會</div></div>
    <div class="branch-section">
      <div class="branch-region-title">中山區</div>
      <div class="branch-chips">
        ${zhongshan.map(b => `<div class="branch-chip zhongshan" data-branch="${escHtml(b.name)}分會" role="button" tabindex="0">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
      <div class="branch-region-title">三蘆區</div>
      <div class="branch-chips">
        ${sanlu.map(b => `<div class="branch-chip sanlu" data-branch="${escHtml(b.name)}分會" role="button" tabindex="0">
          ${escHtml(b.name)}<span class="chip-count">${b.count}</span>
        </div>`).join('')}
      </div>
    </div>
  `;

  // Branch chip click (and keyboard)
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
  const members = getMembersByBranch(branchName);
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
    <div class="results-header"><span>${members.length}</span> 位 ${escHtml(branchName)} 夥伴</div>
    <div id="cards-list"></div>
  `;
  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = members.map(m => personCardHTML(m)).join('');
  bindCardEvents(cardsList, members);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
