import { LEADERS }          from '../data/leaders.js';
import { t }                from '../i18n/translations.js';
import { escHtml, escAttr } from '../utils/html.js';
import { avatarInner }      from '../utils/avatar.js';
import { getCardLink }      from '../data/cardLinks.js';
import { showToast }        from '../utils/toast.js';

export function renderLeaders(container) {
  const { primary, secondary, zhongshan, sanlu } = LEADERS;

  container.innerHTML = `
    <div class="leaders-hero">
      <div style="font-size:16px;letter-spacing:2px;opacity:0.60;margin-bottom:10px;font-family:'Noto Sans TC',sans-serif">
        BNI ANDERSON TEAM
      </div>
      <div class="leaders-hero-title serif">${escHtml(t('leaders_title'))}</div>
      <div class="leaders-hero-sub">${escHtml(t('leaders_sub'))}</div>
    </div>

    ${leaderCardPrimary(primary)}
    ${leaderCardSecondary(secondary)}

    <div style="height:8px"></div>

    ${accordion(t('leaders_section_zh'), zhongshan, 'zh-dir')}
    ${accordion(t('leaders_section_san'), sanlu, 'san-dir')}

    <div style="height:24px"></div>
  `;

  bindLeaderEvents(container);
}

function leaderCardPrimary(l) {
  const initial = (l.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const cardLink = getCardLink(l.name) || l.cardLink || '';
  return `
    <div class="leader-card-primary">
      <div class="lc-top">
        <div class="leader-avatar">${avatarInner(l.name, initial)}</div>
        <div>
          <div class="leader-name">${escHtml(l.name)}</div>
          <div class="leader-title">${escHtml(l.title)}</div>
        </div>
      </div>
      <div class="leader-contact-grid">
        <button class="leader-contact-btn line ${l.lineLink ? '' : 'pending'}"
          data-action="leader-line" data-link="${escAttr(l.lineLink)}" data-id="${escAttr(l.lineId)}">
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
        <button class="leader-contact-btn ${cardLink ? '' : 'pending'}"
          data-action="leader-card" data-link="${escAttr(cardLink)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          ${escHtml(t('leaders_card'))}
        </button>
      </div>
    </div>`;
}

function leaderCardSecondary(l) {
  const initial = (l.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const cardLink = getCardLink(l.name) || l.cardLink || '';
  return `
    <div class="leader-card-secondary">
      <div style="flex:1">
        <div class="leader-name">${escHtml(l.name)}</div>
        <div class="leader-title">${escHtml(l.title)}</div>
      </div>
      <button class="director-btn-card ${cardLink ? 'has-link' : ''}"
        data-action="leader-card" data-link="${escAttr(cardLink)}">
        ${escHtml(t('leaders_card'))}
      </button>
    </div>`;
}

function directorCardHTML(p) {
  const initial = (p.name || '').match(/[一-鿿㐀-䶿]/g)?.slice(-1)[0] || '?';
  const dirCard = getCardLink(p.name) || p.cardLink || '';
  const metaParts = [p.branch, p.profession].filter(Boolean);
  const metaLine  = metaParts.length ? `<div class="dir-meta">${escHtml(metaParts.join(' · '))}</div>` : '';

  const haveSection = p.have
    ? `<div class="dir-section"><span class="dir-section-label">${escHtml(t('card_have'))}</span><span class="dir-section-text">${escHtml(p.have)}</span></div>` : '';
  const wantSection = p.wantMeet
    ? `<div class="dir-section"><span class="dir-section-label">${escHtml(t('card_want'))}</span><span class="dir-section-text">${escHtml(p.wantMeet)}</span></div>` : '';

  return `<div class="director-card-v2" data-expanded="false">
    <div class="dir-header">
      <div class="dir-name-wrap">
        <div class="director-name">${escHtml(p.name)}</div>
        ${metaLine}
      </div>
      <div class="dir-right">
        <button class="dir-about-btn ${dirCard ? 'has-link' : ''}"
          data-action="director-card" data-link="${escAttr(dirCard)}">
          ${escHtml(t('leaders_card'))}
        </button>
        <div class="card-expand-cue">
          <span class="cue-text">${escHtml(t('card_more'))}</span>
          <svg class="card-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </div>
    <div class="dir-expand-body" style="display:none">
      ${haveSection}${wantSection}
      <div class="dir-actions">
        <button class="btn btn-line btn-sm"
          data-action="dir-line"
          data-line-link="${escAttr(p.lineLink || '')}"
          data-line-id="${escAttr(p.lineId || '')}">${t('leaders_line')}</button>
        <button class="btn btn-one btn-sm" data-action="dir-one">${t('leaders_one')}</button>
        <button class="btn btn-biz btn-sm" data-action="dir-biz">${t('leaders_biz')}</button>
      </div>
    </div>
  </div>`;
}

function accordion(title, people, id) {
  const cards = people.map(p => directorCardHTML(p)).join('');

  return `
    <div class="accordion-wrap" style="margin:0 16px 10px;border-radius:var(--r);border:1px solid var(--dark-border);overflow:hidden">
      <div class="accordion-header open" data-accordion="${id}">
        <span style="font-size:21px;font-weight:600">${escHtml(title)}</span>
        <svg class="accordion-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-content open" id="accordion-${id}" style="display:block">${cards}</div>
    </div>`;
}

function bindLeaderEvents(container) {
  container.addEventListener('click', e => {
    // Accordion section toggle
    const header = e.target.closest('.accordion-header');
    if (header) {
      const id      = header.dataset.accordion;
      const content = document.getElementById(`accordion-${id}`);
      if (!content) return;
      const isOpen  = content.style.display !== 'none';
      content.style.display = isOpen ? 'none' : 'block';
      header.classList.toggle('open', !isOpen);
      return;
    }

    // Director card expand/collapse (click anywhere on card except action buttons)
    const dirCard = e.target.closest('.director-card-v2');
    if (dirCard && !e.target.closest('[data-action]')) {
      const expanded = dirCard.dataset.expanded === 'true';
      dirCard.dataset.expanded = String(!expanded);
      const body = dirCard.querySelector('.dir-expand-body');
      if (body) body.style.display = expanded ? 'none' : 'block';
      const cue = dirCard.querySelector('.cue-text');
      if (cue) cue.textContent = expanded ? t('card_more') : t('card_less');
      return;
    }

    // Action buttons
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    if (btn.classList.contains('pending')) {
      showToast(t('leaders_pending'));
      return;
    }

    const action = btn.dataset.action;

    if (action === 'leader-line' || action === 'dir-line') {
      const link = btn.dataset.lineLink || btn.dataset.link || '';
      const id   = btn.dataset.lineId   || btn.dataset.id   || '';
      if (link && link.startsWith('http')) {
        window.open(link, '_blank', 'noopener');
      } else if (id) {
        navigator.clipboard.writeText(id).catch(() => {});
        window.open('https://line.me/R/nv/addFriends', '_blank', 'noopener');
        showToast(t('toast_line_copy'));
      } else {
        showToast(t('leaders_pending'));
      }
    } else if (action === 'leader-phone') {
      const ph = btn.dataset.phone;
      if (ph) window.location.href = `tel:${ph.replace(/[-\s]/g, '')}`;
    } else if (action === 'leader-email') {
      const em = btn.dataset.email;
      if (em) window.location.href = `mailto:${em}`;
    } else if (action === 'leader-card' || action === 'director-card') {
      const link = btn.dataset.link;
      if (link && link.startsWith('http')) window.open(link, '_blank', 'noopener');
      else showToast(t('leaders_pending'));
    } else if (action === 'dir-one' || action === 'dir-biz') {
      showToast(t('leaders_pending'));
    }
  });
}
