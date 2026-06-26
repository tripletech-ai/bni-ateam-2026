import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import { showToast } from '../utils/toast.js';
import { guestFeedLoginHTML } from './GuestTrialBanner.js';
import { REGION_LABELS, getRegionForBranch } from '../data/branches.js';
import { openMemberProfile, resolveFeedMember } from '../utils/feedMemberNav.js';

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
  const branch = item.actor_branch || item.meta?.branch || '';
  const regionLabel = actorRegionLabel(item.actor_region, branch);
  const parts = [];
  if (name) parts.push(`<span class="chat-bubble-name">${escHtml(name)}</span>`);
  if (branch) parts.push(`<span class="chat-bubble-branch">${escHtml(branch)}</span>`);
  if (!parts.length) return '';
  let html = parts.join('<span class="chat-bubble-sep" aria-hidden="true">·</span>');
  if (regionLabel) {
    html += `<span class="chat-bubble-region">${escHtml(regionLabel)}</span>`;
  }
  return html;
}

function memberLinkAttrs(name, branch) {
  if (!name?.trim() || !branch?.trim()) return '';
  return ` data-member-name="${escAttr(name.trim())}" data-member-branch="${escAttr(branch.trim())}"`;
}

function chatActorMetaLinkHTML(item) {
  const inner = chatActorMetaHTML(item);
  if (!inner) return '';
  const { name, branch } = resolveFeedMember(item);
  const attrs = memberLinkAttrs(name, branch);
  if (!attrs) return inner;
  return `<button type="button" class="chat-bubble-meta chat-member-link"${attrs} title="${escAttr(t('feed_member_view'))}">${inner}</button>`;
}

function formatEventBody(item) {
  const type = item.feed_type || 'message';
  const name = item.actor_name || '';
  const branch = item.actor_branch || item.meta?.branch || '';

  if (type === 'login') {
    return escHtml(t('feed_login_event', {
      name: name || t('feed_system'),
      branch: branch || '—',
    }));
  }
  if (type === 'mutual') {
    const partner = item.meta?.partner_name || '';
    const partnerBranch = item.meta?.partner_branch || '';
    if (partner && partnerBranch) {
      return t('feed_mutual_event_branch', { name, branch, partner, partnerBranch });
    }
    return escHtml(item.content || t('feed_mutual_event', { name, partner }));
  }
  return escHtml(item.content || '');
}

function feedEventHTML(item, { isAdmin = false } = {}) {
  const type = item.feed_type || 'message';
  const time = formatFeedTime(item.created_at);
  const body = formatEventBody(item);
  const { name: linkName, branch: linkBranch } = resolveFeedMember(item);
  const linkAttrs = memberLinkAttrs(linkName, linkBranch);

  const deleteBtn = isAdmin && item.id
    ? `<button type="button" class="feed-delete-btn feed-delete-btn-icon" data-feed-id="${escAttr(item.id)}"
        aria-label="${escAttr(t('feed_delete'))}" title="${escAttr(t('feed_delete'))}">×</button>`
    : '';

  const tag = linkAttrs ? 'button' : 'div';
  const extraClass = linkAttrs ? ' chat-event-link chat-member-link' : '';
  const typeAttr = linkAttrs ? ' type="button"' : '';
  return `
    <${tag}${typeAttr} class="chat-event feed-type-${type} chat-event-compact${extraClass}" data-id="${escAttr(item.id || '')}"${linkAttrs}
      ${linkAttrs ? `title="${escAttr(t('feed_member_view'))}"` : ''}>
      <p class="chat-event-text">${body}<span class="chat-event-time">${escHtml(time)}</span></p>
      ${deleteBtn}
    </${tag}>`;
}

function messageActorKey(item, myName = '') {
  const type = item.feed_type || 'message';
  if (type !== 'message') return null;
  const name = item.actor_name || '';
  const branch = item.actor_branch || item.meta?.branch || '';
  const isMine = myName && name === myName;
  return `${isMine ? 'mine' : 'other'}::${name}::${branch}`;
}

function feedItemHTML(item, { isAdmin = false, myName = '', isContinued = false, showTime = true } = {}) {
  const type = item.feed_type || 'message';
  const name = item.actor_name || t('feed_system');
  const time = formatFeedTime(item.created_at);
  const isMine = myName && name === myName && type === 'message';
  const actorMeta = chatActorMetaLinkHTML(item);
  const { name: linkName, branch: linkBranch } = resolveFeedMember(item);
  const linkAttrs = memberLinkAttrs(linkName, linkBranch);

  const deleteBtn = isAdmin && item.id
    ? `<button type="button" class="feed-delete-btn feed-delete-btn-icon" data-feed-id="${escAttr(item.id)}"
        aria-label="${escAttr(t('feed_delete'))}" title="${escAttr(t('feed_delete'))}">×</button>`
    : '';

  if (type !== 'message') {
    return feedEventHTML(item, { isAdmin });
  }

  const body = escHtml(item.content || '');
  const initial = (name.match(/[一-鿿㐀-䶿]/g) || ['?']).slice(-1)[0];
  const continuedCls = isContinued ? ' chat-bubble-continued' : '';
  const timeHtml = showTime ? `<time class="chat-bubble-time">${escHtml(time)}</time>` : '';

  if (isMine) {
    return `
      <article class="chat-bubble chat-bubble-mine${continuedCls}" data-id="${escAttr(item.id || '')}">
        <div class="chat-bubble-body">
          ${isContinued ? '' : `
          <div class="chat-bubble-head chat-bubble-head-mine">
            ${actorMeta ? `<div class="chat-bubble-meta-wrap">${actorMeta}</div>` : ''}
            ${timeHtml}
            ${deleteBtn}
          </div>`}
          <p class="chat-bubble-text">${body}</p>
          ${isContinued && showTime ? `<time class="chat-bubble-time chat-bubble-time-foot">${escHtml(time)}</time>` : ''}
        </div>
      </article>`;
  }

  const avatarInner = isContinued ? ''
    : linkAttrs
      ? `<button type="button" class="chat-bubble-avatar chat-member-link"${linkAttrs} title="${escAttr(t('feed_member_view'))}">${escHtml(initial)}</button>`
      : `<div class="chat-bubble-avatar" aria-hidden="true">${escHtml(initial)}</div>`;

  return `
    <article class="chat-bubble${continuedCls}" data-id="${escAttr(item.id || '')}">
      ${avatarInner}
      <div class="chat-bubble-body">
        ${isContinued ? '' : `
        <div class="chat-bubble-head">
          ${actorMeta ? `<div class="chat-bubble-meta-wrap">${actorMeta}</div>` : ''}
          ${timeHtml}
          ${deleteBtn}
        </div>`}
        <p class="chat-bubble-text">${body}</p>
        ${isContinued && showTime ? `<time class="chat-bubble-time chat-bubble-time-foot">${escHtml(time)}</time>` : ''}
      </div>
    </article>`;
}

function feedMessageGroupHTML(items, opts) {
  if (items.length <= 1) {
    return feedItemHTML(items[0], opts);
  }
  const html = items.map((item, idx) => feedItemHTML(item, {
    ...opts,
    isContinued: idx > 0,
    showTime: idx === 0,
  })).join('');
  return `<div class="chat-msg-group">${html}</div>`;
}

function renderFeedItems(sorted, opts) {
  const parts = [];
  let i = 0;
  while (i < sorted.length) {
    const item = sorted[i];
    const type = item.feed_type || 'message';
    if (type !== 'message') {
      parts.push(feedEventHTML(item, opts));
      i += 1;
      continue;
    }
    const key = messageActorKey(item, opts.myName);
    const group = [item];
    i += 1;
    while (i < sorted.length) {
      const next = sorted[i];
      if ((next.feed_type || 'message') !== 'message') break;
      if (messageActorKey(next, opts.myName) !== key) break;
      group.push(next);
      i += 1;
    }
    parts.push(feedMessageGroupHTML(group, opts));
  }
  return parts.join('');
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
  return `<div class="chat-messages" id="feed-list">${renderFeedItems(sorted, { isAdmin, isGuest, myName })}</div>`;
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

export function bindFeedMemberLinks(container) {
  if (!container) return;
  container.querySelectorAll('.chat-member-link').forEach(btn => {
    if (btn.dataset.feedMemberBound) return;
    btn.dataset.feedMemberBound = '1';
    btn.addEventListener('click', e => {
      if (e.target.closest('.feed-delete-btn')) return;
      e.stopPropagation();
      const name = btn.dataset.memberName;
      const branch = btn.dataset.memberBranch;
      if (!openMemberProfile(name, branch)) {
        showToast(t('feed_member_not_found'));
      }
    });
  });
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
    bindFeedMemberLinks(root);
    scrollChatToBottom(root);
    return;
  }
  const empty = container?.querySelector('.chat-empty');
  if (empty) {
    empty.outerHTML = html.trim();
    bindFeedMemberLinks(root);
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
