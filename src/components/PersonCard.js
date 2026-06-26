import { getMark, setMark, setPendingMark, memberKey, isMutuallyConnected } from '../utils/storage.js';
import { syncMarkToServer } from '../utils/markSync.js';
import { isGuestTrial } from '../utils/guestTrial.js';
import { showToast }                   from '../utils/toast.js';
import { escHtml, escAttr }            from '../utils/html.js';
import { getCardLink }                 from '../data/cardLinks.js';
import { industryBadgesHTML }            from '../components/IndustryPicker.js';
import { t }                           from '../i18n/translations.js';

export function personCardHTML(member, opts = {}) {
  const { matchedKeywords = [], matchReasons = [], staggerIndex = 0 } = opts;
  const mark         = getMark(member);
  const key          = memberKey(member);
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

  const referralSection = member.wantReferral
    ? `<div class="person-section">
        <div class="person-section-label">${escHtml(t('card_referral'))}</div>
        <div class="person-section-text">${escHtml(member.wantReferral)}</div>
       </div>` : '';

  const bioSection = member.bio
    ? `<div class="person-section">
        <div class="person-section-label">${escHtml(t('card_bio'))}</div>
        <div class="person-section-text">${escHtml(member.bio)}</div>
       </div>` : '';

  const kwSection = matchedKeywords.length > 0
    ? `<div class="person-keywords">${matchedKeywords.map(k => escHtml(k)).join('、')}</div>` : '';

  const mutual = isMutuallyConnected(member);
  const mutualBadge = mutual
    ? `<span class="mutual-badge">${escHtml(t('card_mutual'))}</span>` : '';

  const reasonSection = matchReasons.length > 0
    ? `<div class="match-reasons">${matchReasons.map(r =>
        `<div class="match-reason match-reason-${escAttr(r.type || 'seek')}">${escHtml(r.text)}</div>`
      ).join('')}</div>` : '';

  const markedYou = window.BNI_INCOMING_ONE_KEYS?.has(key) && !mutual
    ? `<span class="incoming-badge">${escHtml(t('card_marked_you'))}</span>` : '';
  const markedByMe = mark.one && !mutual
    ? `<span class="marked-badge">${escHtml(t('card_marked'))}</span>` : '';

  const cardLink = member.cardLink || getCardLink(member.name);
  const rowCardBtn = cardLink
    ? `<button class="row-card-btn" data-action="about" data-link="${escAttr(cardLink)}">${escHtml(t('card_about'))}</button>` : '';

  return `<div class="person-card ${staggerClass}" data-key="${escAttr(key)}" data-expanded="false">
    <div class="person-card-header">
      <div style="flex:1;min-width:0">
        <div class="person-name">${escHtml(member.name)}</div>
        <div class="person-meta">${escHtml(member.branch)}</div>
        <div class="person-meta person-profession">${escHtml(member.profession)}</div>
        ${industryBadgesHTML(member.industries, { compact: true })}
        ${mutualBadge}${markedYou}${markedByMe}
      </div>
      <div class="person-card-right">
        ${badge}
        ${rowCardBtn}
        <div class="card-expand-cue">
          <span class="cue-text">${escHtml(t('card_more'))}</span>
          <svg class="card-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </div>
    <div class="person-card-body">
      ${reasonSection}${haveSection}${bioSection}${wantSection}${referralSection}${kwSection}
    </div>
    <div class="person-actions">
      <button class="btn btn-line"
        data-action="line" data-key="${escAttr(key)}"
        data-line-link="${escAttr(member.lineLink || '')}"
        data-line-id="${escAttr(member.lineId || '')}">${t('card_line')}</button>
      <button class="btn btn-one ${mark.one ? 'active' : ''}${mutual ? ' mutual' : ''}"
        data-action="one" data-key="${escAttr(key)}">${mutual ? t('card_mutual') : t('card_one')}</button>
      <button class="btn btn-biz ${mark.biz ? 'active' : ''}"
        data-action="biz" data-key="${escAttr(key)}">${t('card_biz')}</button>
    </div>
  </div>`;
}

export function bindCardEvents(container, members) {
  if (!container) return;
  container.addEventListener('click', e => {
    // Card expand/collapse — click anywhere except action buttons
    const card = e.target.closest('.person-card');
    if (card && !e.target.closest('.person-actions') && !e.target.closest('[data-action]')) {
      const expanded = card.classList.contains('expanded');
      card.classList.toggle('expanded', !expanded);
      card.dataset.expanded = String(!expanded);
      const cue = card.querySelector('.cue-text');
      if (cue) cue.textContent = expanded ? t('card_more') : t('card_less');
      return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const key    = btn.dataset.key;
    const member = members.find(m => memberKey(m) === key);
    if (!member && action !== 'line' && action !== 'about') return;

    if (action === 'about') {
      const link = btn.dataset.link;
      if (link) window.open(link, '_blank', 'noopener');
    } else if (action === 'line') {
      const lineLink = btn.dataset.lineLink || member?.lineLink || '';
      const lineId   = btn.dataset.lineId   || member?.lineId   || '';
      handleLine({ lineLink, lineId });
    } else if (action === 'one' || action === 'biz') {
      if (isGuestTrial()) {
        setPendingMark(member, action);
        showToast(t('guest_mark_pending'));
      } else {
        setMark(member, action);
      }
      const updated = getMark(member);
      syncMarkToServer(member, action, updated[action]);
      const card = container.querySelector(`.person-card[data-key="${CSS.escape(key)}"]`);
      if (card) {
        const oneBtn = card.querySelector('[data-action="one"]');
        oneBtn?.classList.toggle('active', updated.one);
        card.querySelector('[data-action="biz"]')?.classList.toggle('active', updated.biz);
        const header = card.querySelector('.person-card-header > div');
        const mutual = isMutuallyConnected(member);
        header?.querySelector('.marked-badge')?.remove();
        if (updated.one && !mutual) {
          header?.insertAdjacentHTML('beforeend',
            `<span class="marked-badge">${escHtml(t('card_marked'))}</span>`);
        }
        if (oneBtn) {
          oneBtn.textContent = mutual ? t('card_mutual') : t('card_one');
          oneBtn.classList.toggle('mutual', mutual);
        }
      }
      import('../components/TabBar.js').then(({ renderTabBar }) => {
        renderTabBar(document.getElementById('tab-bar'), window.location.hash || '#search');
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
