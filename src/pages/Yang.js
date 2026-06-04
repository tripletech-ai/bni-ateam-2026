import { escHtml } from '../utils/html.js';

// Yang's contact info — to be filled when provided
const YANG_INFO = {
  phone: '',       // e.g. '0912-345-678'
  email: '',       // e.g. 'yang@bni.com'
  lineLink: '',    // e.g. 'https://line.me/ti/p/xxxx'
  cardLink: '',    // e.g. 'https://...'
};

export function renderYang(container) {
  container.innerHTML = `
    <div class="yang-hero">
      <div class="yang-hero-photo" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="yang-hero-name serif">楊董</div>
      <div class="yang-hero-title">資深區域董事顧問<br>台北北區 &amp; 新北西北B</div>
    </div>

    <div style="padding:20px 16px;background:var(--surface);border-bottom:1px solid var(--border)">
      <div class="section-title serif" style="margin-bottom:12px">帶領理念</div>
      <p style="font-size:inherit;line-height:1.9;color:var(--text)">
        在艱難的時代中，我們更要團結一致，透過 A Team 商務連結平台，讓 20 個分會彼此連結、彼此成就，共同創造無限商機。
      </p>
    </div>

    <div style="padding:16px">
      <div class="section-title serif" style="margin-bottom:14px">關於我</div>
      <div class="contact-grid">
        <button class="contact-btn line" id="yang-line" aria-label="加 LINE">
          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          加 LINE
        </button>
        <button class="contact-btn" id="yang-phone" aria-label="撥打電話">
          <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
          撥打電話
        </button>
        <button class="contact-btn" id="yang-email" aria-label="發送 Email">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          E-mail
        </button>
        <button class="contact-btn" id="yang-card" aria-label="關於我">
          <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          關於我
        </button>
      </div>
    </div>

    <div style="background:var(--surface);padding:16px 20px;border-top:1px solid var(--border)">
      <div id="yang-contact-info" style="font-size:13px;color:var(--muted);line-height:2.2">
        ${YANG_INFO.phone
          ? `<div>📱 ${escHtml(YANG_INFO.phone)}</div>` :
            '<div style="color:var(--border)">聯絡資訊待確認後補充</div>'}
      </div>
    </div>
    <div style="height:24px"></div>
  `;

  bindYangEvents();
}

function bindYangEvents() {
  const info = YANG_INFO;

  document.getElementById('yang-line').addEventListener('click', () => {
    if (info.lineLink) window.open(info.lineLink, '_blank', 'noopener');
    else alert('LINE 連結待楊董確認後補充');
  });
  document.getElementById('yang-phone').addEventListener('click', () => {
    if (info.phone) window.location.href = `tel:${info.phone.replace(/[-\s]/g, '')}`;
    else alert('電話號碼待楊董確認後補充');
  });
  document.getElementById('yang-email').addEventListener('click', () => {
    if (info.email) window.location.href = `mailto:${info.email}`;
    else alert('Email 待楊董確認後補充');
  });
  document.getElementById('yang-card').addEventListener('click', () => {
    if (info.cardLink) window.open(info.cardLink, '_blank', 'noopener');
    else alert('關於我連結待楊董確認後補充');
  });
}
