import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { ackIncomingMarks } from '../services/auth.js';

let overlayEl = null;

export async function showIncomingOneOverlay(rows) {
  const list = (rows || []).filter(r => r.mark_type === 'one');
  if (!list.length) return;

  if (overlayEl) overlayEl.remove();

  overlayEl = document.createElement('div');
  overlayEl.id = 'incoming-one-overlay';
  overlayEl.className = 'incoming-one-overlay';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-modal', 'true');
  overlayEl.setAttribute('aria-label', t('incoming_one_title'));

  const items = list.map(r => `
    <li class="incoming-one-item">
      <div class="incoming-one-name">${escHtml(r.name)}</div>
      <div class="incoming-one-meta">${escHtml(r.branch)} · ${escHtml(r.profession || '—')}</div>
    </li>`).join('');

  overlayEl.innerHTML = `
    <div class="incoming-one-card">
      <div class="incoming-one-eyebrow">${escHtml(t('incoming_one_eyebrow'))}</div>
      <h2 class="incoming-one-title serif">${escHtml(t('incoming_one_title'))}</h2>
      <p class="incoming-one-sub">${escHtml(t('incoming_one_sub'))}</p>
      <ul class="incoming-one-list">${items}</ul>
      <button type="button" class="btn-ai incoming-one-ok" id="incoming-one-ok">${escHtml(t('incoming_one_ok'))}</button>
    </div>
  `;

  document.body.appendChild(overlayEl);
  overlayEl.querySelector('#incoming-one-ok')?.addEventListener('click', async () => {
    try {
      const ids = list.map(r => r.id).filter(Boolean);
      await ackIncomingMarks(ids.length ? ids : null);
    } catch (e) {
      console.warn('ack incoming:', e.message);
    }
    overlayEl?.remove();
    overlayEl = null;
  });
}

export function dismissIncomingOverlay() {
  overlayEl?.remove();
  overlayEl = null;
}
