import { getMark, setMark, memberKey } from '../utils/storage.js';
import { showToast }                   from '../utils/toast.js';
import { escHtml, escAttr }            from '../utils/html.js';
import { t }                           from '../i18n/translations.js';

export function personCardHTML(member, opts = {}) {
  const { matchedKeywords = [], staggerIndex = 0 } = opts;
  const mark         = getMark(member);
  const key          = memberKey(member);
  const initial      = (member.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
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
        data-line-link="${escAttr(member.lineLink || '')}"
        data-line-id="${escAttr(member.lineId || '')}">${escHtml(t('card_line'))}</button>
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
      handleLine({ lineLink, lineId });
    } else {
      setMark(member, action);
      const card = container.querySelector(`.person-card[data-key="${CSS.escape(key)}"]`);
      if (card) {
        const updated = getMark(member);
        card.querySelector('[data-action="one"]')?.classList.toggle('active', updated.one);
        card.querySelector('[data-action="biz"]')?.classList.toggle('active', updated.biz);
      }
      import('../components/TabBar.js').then(({ renderTabBar }) => {
        renderTabBar(document.getElementById('tab-bar'), window.location.hash);
      });
    }
  });
}

function handleLine({ lineLink, lineId }) {
  if (lineLink && lineLink.startsWith('http')) {
    window.open(lineLink, '_blank', 'noopener');
  } else if (lineId) {
    navigator.clipboard.writeText(lineId)
      .then(()  => showToast(t('toast_line_copy')))
      .catch(()  => showToast(`${t('toast_line_manual')}${lineId}`));
    window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
  } else {
    showToast(t('toast_line_none'));
  }
}
