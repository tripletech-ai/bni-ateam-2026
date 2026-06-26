import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';

function feedItemHTML(item) {
  const type = item.feed_type || 'message';
  const name = item.actor_name || t('feed_system');
  const branch = item.actor_branch || '';
  const time = formatFeedTime(item.created_at);

  let body = escHtml(item.content || '');
  if (type === 'mutual' && item.meta?.partner_name) {
    body = escHtml(item.content || `${name} 與 ${item.meta.partner_name} 互相連結了！`);
  }

  return `
    <article class="feed-item feed-type-${type}" data-id="${escAttr(item.id || '')}">
      <div class="feed-item-head">
        <span class="feed-type-dot" aria-hidden="true"></span>
        <div class="feed-actor">
          <span class="feed-name">${escHtml(name)}</span>
          ${branch ? `<span class="feed-branch">${escHtml(branch)}</span>` : ''}
        </div>
        <time class="feed-time">${escHtml(time)}</time>
      </div>
      <p class="feed-body">${body}</p>
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

export function feedListHTML(items = []) {
  if (!items.length) {
    return `<div class="feed-empty">${escHtml(t('feed_empty'))}</div>`;
  }
  return `<div class="feed-list" id="feed-list">${items.map(feedItemHTML).join('')}</div>`;
}

export function feedComposerHTML() {
  return `
    <div class="feed-composer">
      <label class="feed-composer-label" for="feed-input">${escHtml(t('feed_compose_label'))}</label>
      <textarea id="feed-input" class="feed-input" rows="2" maxlength="500"
        placeholder="${escHtml(t('feed_compose_placeholder'))}"
        aria-label="${escHtml(t('feed_compose_label'))}"></textarea>
      <div class="feed-composer-foot">
        <span class="feed-rate-hint">${escHtml(t('feed_rate_hint'))}</span>
        <button type="button" id="feed-submit" class="btn-ai feed-submit">${escHtml(t('feed_post'))}</button>
      </div>
    </div>`;
}

export function feedSectionHTML(items) {
  return `
    <section class="feed-section">
      <div class="section-header">
        <div class="section-title">${escHtml(t('feed_title'))}</div>
        <p class="section-sub">${escHtml(t('feed_sub'))}</p>
      </div>
      ${feedListHTML(items)}
      ${feedComposerHTML()}
    </section>`;
}

export function bindFeedComposer(onPost) {
  const btn = document.getElementById('feed-submit');
  const input = document.getElementById('feed-input');
  if (!btn || !input) return;

  const submit = async () => {
    const text = input.value.trim();
    if (!text) return;
    btn.disabled = true;
    try {
      await onPost(text);
      input.value = '';
    } finally {
      btn.disabled = false;
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

export function updateFeedList(container, items) {
  const el = container?.querySelector('#feed-list') || container?.querySelector('.feed-list');
  if (el) {
    el.outerHTML = feedListHTML(items).trim();
    return;
  }
  const empty = container?.querySelector('.feed-empty');
  if (empty && items.length) {
    empty.outerHTML = feedListHTML(items);
  }
}
