import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { showToast } from '../utils/toast.js';
import { guestFeedLoginHTML } from './GuestTrialBanner.js';
import { REGION_LABELS, getRegionForBranch } from '../data/branches.js';

/** 與後端 bni_post_feed_message 限速一致 */
export const FEED_COOLDOWN_MS = 10_000;

const SEND_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;

function actorRegionLabel(region, branch) {
  const key = region || getRegionForBranch(branch || '');
  if (key === 'guest') return '來賓';
  return REGION_LABELS[key] || '';
}

function chatActorMetaHTML(item) {
  const name = item.actor_name || t('feed_system');
  const branch = item.actor_branch || '';
  const regionLabel = actorRegionLabel(item.actor_region, branch);
  const parts = [];
  if (regionLabel) parts.push(`<span class="chat-bubble-region">${escHtml(regionLabel)}</span>`);
  if (branch) parts.push(`<span class="chat-bubble-branch">${escHtml(branch)}</span>`);
  if (name) parts.push(`<span class="chat-bubble-name">${escHtml(name)}</span>`);
  if (!parts.length) return '';
  return parts.join('<span class="chat-bubble-sep" aria-hidden="true">·</span>');
}

function feedItemHTML(item, { isAdmin = false, myName = '' } = {}) {
  const type = item.feed_type || 'message';
  const name = item.actor_name || t('feed_system');
  const time = formatFeedTime(item.created_at);
  const isMine = myName && name === myName && type === 'message';
  const actorMeta = chatActorMetaHTML(item);

  let body = escHtml(item.content || '');
  if (type === 'mutual' && item.meta?.partner_name) {
    body = escHtml(item.content || `${name} 與 ${item.meta.partner_name} 互相連結了！`);
  }

  const deleteBtn = isAdmin && item.id
    ? `<button type="button" class="feed-delete-btn feed-delete-btn-icon" data-feed-id="${escAttr(item.id)}"
        aria-label="${escAttr(t('feed_delete'))}" title="${escAttr(t('feed_delete'))}">×</button>`
    : '';

  if (type !== 'message') {
    return `
      <div class="chat-event feed-type-${type}" data-id="${escAttr(item.id || '')}">
        <p class="chat-event-text">${body}</p>
        <time class="chat-event-time">${escHtml(time)}</time>
        ${deleteBtn}
      </div>`;
  }

  const initial = (name.match(/[一-鿿㐀-䶿]/g) || ['?']).slice(-1)[0];

  if (isMine) {
    return `
      <article class="chat-bubble chat-bubble-mine" data-id="${escAttr(item.id || '')}">
        <div class="chat-bubble-body">
          <div class="chat-bubble-head chat-bubble-head-mine">
            ${actorMeta ? `<div class="chat-bubble-meta">${actorMeta}</div>` : ''}
            <time class="chat-bubble-time">${escHtml(time)}</time>
            ${deleteBtn}
          </div>
          <p class="chat-bubble-text">${body}</p>
        </div>
      </article>`;
  }

  return `
    <article class="chat-bubble" data-id="${escAttr(item.id || '')}">
      <div class="chat-bubble-avatar" aria-hidden="true">${escHtml(initial)}</div>
      <div class="chat-bubble-body">
        <div class="chat-bubble-head">
          ${actorMeta ? `<div class="chat-bubble-meta">${actorMeta}</div>` : ''}
          <time class="chat-bubble-time">${escHtml(time)}</time>
          ${deleteBtn}
        </div>
        <p class="chat-bubble-text">${body}</p>
      </div>
    </article>`;
}

function formatFeedTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return t('feed_just_now');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('feed_min_ago')}`;
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

export function feedListHTML(items = [], { isAdmin = false, isGuest = false, myName = '' } = {}) {
  if (!items.length) {
    return `
      <div class="chat-empty">
        <p class="chat-empty-title">${escHtml(t('feed_empty'))}</p>
        ${isGuest ? `<p class="chat-empty-hint">${escHtml(t('guest_feed_login'))}</p>` : ''}
      </div>`;
  }
  const sorted = [...items].sort((a, b) =>
    new Date(a.created_at || 0) - new Date(b.created_at || 0),
  );
  return `<div class="chat-messages" id="feed-list">${sorted.map(item => feedItemHTML(item, { isAdmin, myName })).join('')}</div>`;
}

export function chatRoomHTML(feed = [], { isAdmin = false, isGuest = false, myName = '' } = {}) {
  return `
    <div class="chat-room">
      ${feedListHTML(feed, { isAdmin, isGuest, myName })}
      <div class="chat-composer-wrap">
        ${isGuest ? guestFeedLoginHTML() : feedComposerHTML()}
      </div>
    </div>`;
}

export function feedComposerHTML() {
  return `
    <div class="feed-composer chat-composer chat-composer-inline">
      <textarea id="feed-input" class="feed-input chat-input" rows="1" maxlength="500"
        placeholder="${escHtml(t('feed_compose_placeholder'))}"
        aria-label="${escHtml(t('feed_compose_label'))}"></textarea>
      <button type="button" id="feed-submit" class="chat-send-btn" aria-label="${escAttr(t('feed_post'))}">
        ${SEND_ICON}
      </button>
    </div>
    <p class="feed-rate-hint" id="feed-rate-hint">${escHtml(t('feed_rate_hint'))}</p>`;
}

export function feedSectionHTML(items) {
  return chatRoomHTML(items);
}

export function appendFeedItem(items, item) {
  const list = Array.isArray(items) ? [...items] : [];
  if (item?.id && list.some(x => x.id === item.id)) return list;
  list.push(item);
  return list;
}

export function scrollChatToBottom(container) {
  const el = container?.querySelector('.chat-messages');
  if (el) {
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }
}

function bindInputAutoGrow(input) {
  if (!input || input.dataset.autoGrow) return;
  input.dataset.autoGrow = '1';
  const resize = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  };
  input.addEventListener('input', resize);
  resize();
}

export function bindFeedComposer(onPost) {
  const btn = document.getElementById('feed-submit');
  const input = document.getElementById('feed-input');
  if (!btn || !input) return;

  bindInputAutoGrow(input);
  let lastPostAt = 0;
  let cooldownTimer = null;

  const hintEl = document.getElementById('feed-rate-hint');

  const clearCooldownUi = () => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
    btn.disabled = false;
    if (hintEl) hintEl.textContent = t('feed_rate_hint');
  };

  const startCooldownUi = (msLeft = FEED_COOLDOWN_MS) => {
    btn.disabled = true;
    const tick = () => {
      const remain = Math.ceil((lastPostAt + FEED_COOLDOWN_MS - Date.now()) / 1000);
      if (remain <= 0) {
        clearCooldownUi();
        return;
      }
      if (hintEl) hintEl.textContent = t('feed_rate_countdown').replace('{n}', String(remain));
    };
    tick();
    cooldownTimer = setInterval(tick, 500);
  };

  const submit = async () => {
    const text = input.value.trim();
    if (!text) return;
    const now = Date.now();
    if (now - lastPostAt < FEED_COOLDOWN_MS) {
      showToast(t('feed_rate_limit'));
      startCooldownUi(lastPostAt + FEED_COOLDOWN_MS - now);
      return;
    }
    btn.disabled = true;
    try {
      const ok = await onPost(text);
      if (ok) {
        input.value = '';
        input.style.height = 'auto';
        lastPostAt = Date.now();
        startCooldownUi();
      } else {
        clearCooldownUi();
      }
    } catch {
      clearCooldownUi();
    } finally {
      if (!cooldownTimer) btn.disabled = false;
      input.focus();
    }
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
}

export function updateFeedList(container, items, { isAdmin = false, isGuest = false, myName = '' } = {}) {
  const html = feedListHTML(items, { isAdmin, isGuest, myName });
  const el = container?.querySelector('#feed-list') || container?.querySelector('.chat-messages');
  const root = container?.closest('.live-page') || container;
  if (el) {
    el.outerHTML = html.trim();
    scrollChatToBottom(root);
    return;
  }
  const empty = container?.querySelector('.chat-empty');
  if (empty) {
    empty.outerHTML = html.trim();
    scrollChatToBottom(root);
  }
}

export function bindFeedAdminActions(container, onDelete) {
  if (!container || typeof onDelete !== 'function') return;
  container.querySelectorAll('.feed-delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.feedId;
      if (!id) return;
      if (!window.confirm(t('feed_delete_confirm'))) return;
      btn.disabled = true;
      try {
        await onDelete(id);
      } finally {
        btn.disabled = false;
      }
    });
  });
}
