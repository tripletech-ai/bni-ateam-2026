import { getMark, setMark, memberKey } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { escHtml, escAttr } from '../utils/html.js';

export function personCardHTML(member, opts = {}) {
  const { matchedKeywords = [] } = opts;
  const mark = getMark(member);
  const key = memberKey(member);
  const initial = (member.name || '?').slice(-1);

  const badge = matchedKeywords.length > 0
    ? `<span class="match-badge">${matchedKeywords.length} 項符合</span>` : '';

  const haveSection = member.have
    ? `<div class="person-section">
        <div class="person-section-label">我有的資源</div>
        <div class="person-section-text">${escHtml(member.have)}</div>
       </div>` : '';

  const wantSection = member.wantMeet
    ? `<div class="person-section">
        <div class="person-section-label">想認識的對象</div>
        <div class="person-section-text">${escHtml(member.wantMeet)}</div>
       </div>` : '';

  const kwSection = matchedKeywords.length > 0
    ? `<div class="person-keywords">命中：${matchedKeywords.map(k => escHtml(k)).join('、')}</div>` : '';

  return `<div class="person-card" data-key="${escAttr(key)}">
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
        data-line-id="${escAttr(member.lineId)}">加 LINE</button>
      <button class="btn btn-one ${mark.one ? 'active' : ''}"
        data-action="one" data-key="${escAttr(key)}">想約 1-1</button>
      <button class="btn btn-biz ${mark.biz ? 'active' : ''}"
        data-action="biz" data-key="${escAttr(key)}">有合作可能</button>
    </div>
  </div>`;
}

export function bindCardEvents(container, members) {
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const key = btn.dataset.key;
    const member = members.find(m => memberKey(m) === key);
    if (!member && action !== 'line') return;

    if (action === 'line') {
      // Use data attributes directly for LINE action (works for both search results and mark cards)
      const lineLink = btn.dataset.lineLink || member?.lineLink || '';
      const lineId   = btn.dataset.lineId   || member?.lineId   || '';
      handleLine({ lineLink, lineId, name: member?.name || '' });
    } else {
      setMark(member, action);
      // Update button states in place (no full re-render)
      const card = container.querySelector(`.person-card[data-key="${CSS.escape(key)}"]`);
      if (card) {
        const updatedMark = getMark(member);
        const oneBtn = card.querySelector('[data-action="one"]');
        const bizBtn = card.querySelector('[data-action="biz"]');
        if (oneBtn) oneBtn.classList.toggle('active', updatedMark.one);
        if (bizBtn) bizBtn.classList.toggle('active', updatedMark.biz);
      }
      // Refresh tab bar badge
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
      .then(() => showToast(`LINE ID 已複製：${lineId}，到 LINE 搜尋貼上`))
      .catch(() => showToast(`請手動搜尋 LINE ID：${lineId}`));
    window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
  } else {
    showToast('這位夥伴沒有填 LINE 連結');
  }
}
