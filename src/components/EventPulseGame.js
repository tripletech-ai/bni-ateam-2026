import { escHtml } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { fetchEventPulse, recordEventPulse, getCurrentUser } from '../services/auth.js';
import { showToast } from '../utils/toast.js';
import { copyPageUrl } from '../utils/inAppBrowser.js';

export function eventPulseHTML() {
  return `
    <section class="event-pulse-card" id="event-pulse" aria-label="${escHtml(t('pulse_title'))}">
      <div class="event-pulse-glow" aria-hidden="true"></div>
      <div class="event-pulse-eyebrow">${escHtml(t('pulse_eyebrow'))}</div>
      <h2 class="event-pulse-title serif">${escHtml(t('pulse_title'))}</h2>
      <p class="event-pulse-sub">${escHtml(t('pulse_sub'))}</p>
      <div class="event-pulse-count-row">
        <span class="event-pulse-num" id="pulse-active">—</span>
        <span class="event-pulse-goal">/ 800 ${escHtml(t('pulse_people'))}</span>
      </div>
      <div class="event-pulse-track" role="progressbar" aria-valuemin="0" aria-valuemax="800" aria-valuenow="0">
        <div class="event-pulse-fill" id="pulse-fill" style="width:0%"></div>
      </div>
      <p class="event-pulse-msg" id="pulse-msg">${escHtml(t('pulse_msg_default'))}</p>
      <p class="event-pulse-taps-line">
        ${escHtml(t('pulse_taps_label'))} <strong id="pulse-taps">—</strong> ${escHtml(t('pulse_taps_unit'))}
        · ${escHtml(t('pulse_my_taps'))} <strong id="pulse-my-taps">—</strong>
      </p>
      <div class="event-pulse-actions">
        <button type="button" class="btn-pulse-main" id="pulse-btn" disabled>
          ${escHtml(t('pulse_btn'))}
        </button>
        <button type="button" class="btn-pulse-nudge" id="pulse-nudge-btn">
          ${escHtml(t('search_invite_copy'))}
        </button>
      </div>
    </section>
  `;
}

function pulseMessage(active, goal) {
  const pct = active / goal;
  if (pct >= 1) return t('pulse_msg_done');
  if (pct >= 0.75) return t('pulse_msg_high');
  if (pct >= 0.5) return t('pulse_msg_mid');
  if (pct >= 0.25) return t('pulse_msg_low');
  return t('pulse_msg_default');
}

function updatePulseUI(data) {
  const active = data?.active_today ?? 0;
  const goal = data?.goal ?? 800;
  const taps = data?.total_taps_today ?? 0;
  const myTaps = data?.my_taps_today ?? 0;
  const pct = Math.min(100, Math.round((active / goal) * 100));

  const activeEl = document.getElementById('pulse-active');
  const fillEl = document.getElementById('pulse-fill');
  const msgEl = document.getElementById('pulse-msg');
  const tapsEl = document.getElementById('pulse-taps');
  const myTapsEl = document.getElementById('pulse-my-taps');
  const btn = document.getElementById('pulse-btn');
  const track = document.querySelector('.event-pulse-track');

  if (activeEl) activeEl.textContent = String(active);
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (msgEl) msgEl.textContent = pulseMessage(active, goal);
  if (tapsEl) tapsEl.textContent = String(taps);
  if (myTapsEl) myTapsEl.textContent = String(myTaps);
  if (track) track.setAttribute('aria-valuenow', String(active));

  if (btn) {
    if (!getCurrentUser()) {
      btn.disabled = false;
      btn.textContent = t('pulse_btn_login');
    } else {
      btn.disabled = false;
      btn.textContent = t('pulse_btn');
    }
  }
}

export async function bindEventPulse() {
  const section = document.getElementById('event-pulse');
  if (!section) return;

  try {
    const data = await fetchEventPulse();
    updatePulseUI(data);
  } catch (e) {
    console.warn('event pulse load:', e);
  }

  section.querySelector('#pulse-btn')?.addEventListener('click', async () => {
    if (!getCurrentUser()) {
      showToast(t('pulse_login_hint'));
      location.hash = '';
      return;
    }
    const btn = section.querySelector('#pulse-btn');
    if (btn) btn.disabled = true;
    try {
      const data = await recordEventPulse();
      updatePulseUI(data);
      showToast(t('pulse_thanks'));
      section.classList.add('pulse-bump');
      setTimeout(() => section.classList.remove('pulse-bump'), 400);
    } catch (e) {
      showToast(e.message || t('pulse_fail'));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  section.querySelector('#pulse-nudge-btn')?.addEventListener('click', async () => {
    const ok = await copyPageUrl();
    showToast(ok ? t('search_invite_copied') : t('inapp_copy_fail'));
  });
}
