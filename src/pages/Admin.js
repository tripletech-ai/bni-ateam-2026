import { escHtml } from '../utils/html.js';
import {
  checkIsAdmin,
  getAuthEmail,
  fetchAllMembers,
  adminUpdateMember,
  adminCreateMember,
  fetchAdminDashboard,
  adminUnbindMember,
  fetchAdminBranches,
  adminMergeBranches,
  adminSetMemberActive,
  fetchLiveSettings,
  adminSetLeaderboardModes,
  fetchFeed,
  adminDeleteFeedMessage,
  signOut,
} from '../services/auth.js';
import { ADMIN_EMAILS, isAdminEmail } from '../config/admins.js';
import { normalizeBranchName } from '../data/branches.js';
import { applyMemberToCache } from '../services/membersApi.js';
import { showToast } from '../utils/toast.js';
import { t } from '../i18n/translations.js';
import { showConfirmDialog } from '../utils/confirmDialog.js';
import { formatFeedTime } from '../components/FeedChat.js';

let adminTab = 'stats';

function adminEmailsHint() {
  return ADMIN_EMAILS.join('、');
}

export async function renderAdmin(container) {
  const ok = isAdminEmail(getAuthEmail()) || await checkIsAdmin();
  if (!ok) {
    container.innerHTML = `
      <div class="admin-wrap">
        <h2 class="section-title">${escHtml(t('admin_denied_title'))}</h2>
        <p class="admin-denied">${escHtml(t('admin_denied_body', { emails: adminEmailsHint() }))}</p>
        <a href="/" class="admin-login-back">${escHtml(t('admin_login_back'))}</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-wrap">
      <div class="admin-head-row">
        <h2 class="section-title">${escHtml(t('admin_title'))}</h2>
        <button type="button" class="btn-text admin-signout-btn" id="admin-signout">${escHtml(t('user_bar_signout'))}</button>
      </div>
      <p class="admin-signed-as">${escHtml(t('admin_signed_as'))} ${escHtml(getAuthEmail())}</p>
      <div class="admin-tabs">
        <button type="button" class="admin-tab" data-tab="stats">${escHtml(t('admin_tab_stats'))}</button>
        <button type="button" class="admin-tab" data-tab="members">${escHtml(t('admin_tab_members'))}</button>
        <button type="button" class="admin-tab" data-tab="feed">${escHtml(t('admin_tab_feed'))}</button>
        <button type="button" class="admin-tab" data-tab="branches">${escHtml(t('admin_tab_branches'))}</button>
      </div>
      <div id="admin-panel"></div>
    </div>
  `;

  container.querySelector('#admin-signout')?.addEventListener('click', async () => {
    const okConfirm = await showConfirmDialog({
      title: t('signout_confirm'),
      message: t('signout_confirm'),
      confirmLabel: t('user_bar_signout'),
    });
    if (!okConfirm) return;
    await signOut();
    location.href = '/admin';
    location.reload();
  });

  container.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      adminTab = btn.dataset.tab;
      container.querySelectorAll('.admin-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === adminTab));
      renderPanel(container.querySelector('#admin-panel'));
    });
  });
  container.querySelector('.admin-tab[data-tab="stats"]').classList.add('active');
  await renderPanel(container.querySelector('#admin-panel'));
}

async function renderPanel(panel) {
  if (adminTab === 'stats') await renderStatsPanel(panel);
  else if (adminTab === 'branches') await renderBranchesPanel(panel);
  else if (adminTab === 'feed') await renderFeedPanel(panel);
  else await renderMembersPanel(panel);
}

async function renderStatsPanel(panel) {
  panel.innerHTML = '<div class="bind-loading">載入統計…</div>';
  try {
    const data = await fetchAdminDashboard();
    const m = data.members || {};
    const o = data.onboarding || {};
    const recent = data.recent_bindings || [];

    panel.innerHTML = `
      <p class="admin-sub">即時統計（僅管理員可見）</p>
      <div class="admin-stats-grid">
        <div class="admin-stat-card"><div class="admin-stat-num">${m.total ?? 0}</div><div class="admin-stat-label">名單總數</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num">${m.bound ?? 0}</div><div class="admin-stat-label">已綁定 Google</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num">${m.unbound ?? 0}</div><div class="admin-stat-label">尚未綁定</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num">${o.tutorial_done ?? 0}</div><div class="admin-stat-label">完成新手教學</div></div>
      </div>
      <div class="admin-breakdown">
        <span>名單 roster：${m.roster ?? 0}</span>
        <span>已認領 claimed：${m.claimed ?? 0}</span>
        <span>自填 self：${m.self_registered ?? 0}</span>
        <span>啟用：${m.active ?? 0}</span>
        <span>停用：${m.inactive ?? 0}</span>
      </div>
      <h3 class="admin-section-title">最近綁定（最多 50 筆）</h3>
      <div class="admin-recent-list">
        ${recent.length ? recent.map(r => `
          <div class="admin-recent-row">
            <div>
              <strong>${escHtml(r.name)}</strong>
              <span class="admin-row-meta">${escHtml(r.branch)} · ${escHtml(r.status)}</span>
            </div>
            <div class="admin-recent-email">${escHtml(r.google_email || '—')}</div>
            <div class="admin-recent-meta">
              ${r.tutorial_done ? '✓ 教學完成' : '教學未完成'}
              · ${formatTime(r.bound_at)}
            </div>
          </div>
        `).join('') : '<div class="bind-empty">尚無綁定紀錄</div>'}
      </div>
      <button type="button" id="admin-refresh-stats" class="btn-outline" style="margin-top:12px">重新整理</button>
      <div class="admin-live-settings" id="admin-live-settings">
        <h3 class="admin-section-title">${escHtml(t('admin_live_settings_title'))}</h3>
        <p class="admin-sub">${escHtml(t('admin_live_lb_modes'))}</p>
        <div class="admin-live-lb-checks" id="admin-live-lb-checks">
          <div class="bind-loading">載入…</div>
        </div>
        <button type="button" id="admin-save-lb-modes" class="btn-ai" style="margin-top:10px">${escHtml(t('admin_live_lb_save'))}</button>
      </div>
    `;
    panel.querySelector('#admin-refresh-stats').addEventListener('click', () => renderStatsPanel(panel));
    await bindLiveSettingsPanel(panel);
  } catch (err) {
    panel.innerHTML = `<div class="bind-empty">${escHtml(err.message)}</div>`;
  }
}

async function renderMembersPanel(panel) {
  panel.innerHTML = `
    <p class="admin-sub">編輯名單、解除錯誤綁定</p>
    <div class="admin-toolbar">
      <input id="admin-search" class="field-input" placeholder="搜尋姓名、分會、產業…">
      <label class="field-check"><input type="checkbox" id="admin-show-inactive"> 顯示停用</label>
      <button type="button" id="admin-add" class="btn-ai">新增會員</button>
    </div>
    <div id="admin-list" class="admin-list"><div class="bind-loading">載入中…</div></div>
  `;

  let members = [];
  const listEl = panel.querySelector('#admin-list');
  const searchEl = panel.querySelector('#admin-search');
  const inactiveEl = panel.querySelector('#admin-show-inactive');

  async function loadMembers() {
    listEl.innerHTML = '<div class="bind-loading">載入中…</div>';
    try {
      members = await fetchAllMembers({ includeInactive: inactiveEl.checked });
      members.forEach(m => applyMemberToCache(m));
      renderList(searchEl.value);
    } catch (err) {
      listEl.innerHTML = `<div class="bind-empty">${escHtml(err.message)}</div>`;
    }
  }

  function renderList(filter = '') {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? members.filter(m =>
          [m.name, m.branch, m.profession, m.google_email, m.have].join(' ').toLowerCase().includes(q))
      : members;
    listEl.innerHTML = filtered.map(m => adminRowHTML(m)).join('') ||
      '<div class="bind-empty">沒有符合的會員</div>';
    bindRowEvents();
  }

  function adminRowHTML(m) {
    const bound = m.auth_user_id ? `已綁定 ${escHtml(m.google_email || '')}` : '未綁定';
    return `
      <details class="admin-row" data-id="${escHtml(m.id)}">
        <summary>
          <span class="admin-row-name">${escHtml(m.name)}</span>
          <span class="admin-row-meta">${escHtml(m.branch)} · ${escHtml(m.profession || '—')}</span>
          <span class="admin-badge ${m.status}">${escHtml(m.status)}</span>
          <span class="admin-bind-hint">${bound}</span>
        </summary>
        <form class="admin-form" data-id="${escHtml(m.id)}">
          <input name="name" value="${escHtml(m.name)}" class="field-input" required>
          <input name="branch" value="${escHtml(m.branch)}" class="field-input" required>
          <input name="profession" value="${escHtml(m.profession || '')}" class="field-input">
          <textarea name="have" class="field-input" rows="2">${escHtml(m.have || '')}</textarea>
          <textarea name="want_meet" class="field-input" rows="2">${escHtml(m.want_meet || '')}</textarea>
          <textarea name="want_referral" class="field-input" rows="2">${escHtml(m.want_referral || '')}</textarea>
          <textarea name="bio" class="field-input" rows="3" placeholder="自我介紹">${escHtml(m.bio || '')}</textarea>
          <input name="card_link" value="${escHtml(m.card_link || '')}" class="field-input" placeholder="電子名片連結">
          <input name="line_id" value="${escHtml(m.line_id || '')}" class="field-input">
          <input name="line_link" value="${escHtml(m.line_link || '')}" class="field-input">
          <label class="field-check"><input type="checkbox" name="active" ${m.active ? 'checked' : ''}> 啟用</label>
          <div class="admin-form-actions">
            <button type="submit" class="btn-ai">儲存</button>
            ${m.auth_user_id ? `<button type="button" class="btn-outline admin-unbind" data-id="${escHtml(m.id)}">解除 Google 綁定</button>` : ''}
            ${m.active
              ? `<button type="button" class="btn-outline admin-ban" data-id="${escHtml(m.id)}" data-name="${escHtml(m.name)}">停用帳號</button>`
              : `<button type="button" class="btn-outline admin-unban" data-id="${escHtml(m.id)}" data-name="${escHtml(m.name)}">恢復帳號</button>`}
          </div>
        </form>
      </details>`;
  }

  function bindRowEvents() {
    listEl.querySelectorAll('.admin-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const id = form.dataset.id;
        const fd = new FormData(form);
        const patch = {
          name: fd.get('name'),
          branch: normalizeBranchName(fd.get('branch')),
          profession: fd.get('profession'),
          have: fd.get('have'),
          want_meet: fd.get('want_meet'),
          want_referral: fd.get('want_referral'),
          bio: fd.get('bio'),
          card_link: fd.get('card_link'),
          line_id: fd.get('line_id'),
          line_link: fd.get('line_link'),
          active: form.querySelector('[name=active]').checked,
        };
        try {
          const updated = await adminUpdateMember(id, patch);
          const idx = members.findIndex(x => x.id === id);
          if (idx >= 0) members[idx] = updated;
          applyMemberToCache(updated);
          showToast('已儲存');
          renderList(searchEl.value);
        } catch (err) {
          showToast(err.message || '儲存失敗');
        }
      });
    });
    listEl.querySelectorAll('.admin-unbind').forEach(btn => {
      btn.addEventListener('click', async () => {
        const okConfirm = await showConfirmDialog({
          title: t('admin_unbind_confirm_title'),
          message: t('admin_unbind_confirm'),
        });
        if (!okConfirm) return;
        try {
          await adminUnbindMember(btn.dataset.id);
          showToast('已解除綁定');
          await loadMembers();
        } catch (err) {
          showToast(err.message || '解除失敗');
        }
      });
    });
    listEl.querySelectorAll('.admin-ban').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name || '此會員';
        const okConfirm = await showConfirmDialog({
          title: t('admin_ban_confirm_title'),
          message: t('admin_ban_confirm', { name }),
        });
        if (!okConfirm) return;
        try {
          await adminSetMemberActive(btn.dataset.id, false);
          showToast('已停用帳號');
          await loadMembers();
        } catch (err) {
          showToast(err.message || '停用失敗');
        }
      });
    });
    listEl.querySelectorAll('.admin-unban').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name || '此會員';
        const okConfirm = await showConfirmDialog({
          title: t('admin_unban_confirm_title'),
          message: t('admin_unban_confirm', { name }),
        });
        if (!okConfirm) return;
        try {
          await adminSetMemberActive(btn.dataset.id, true);
          showToast('已恢復帳號');
          await loadMembers();
        } catch (err) {
          showToast(err.message || '恢復失敗');
        }
      });
    });
  }

  searchEl.addEventListener('input', () => renderList(searchEl.value));
  inactiveEl.addEventListener('change', loadMembers);

  panel.querySelector('#admin-add').addEventListener('click', async () => {
    const name = prompt('新會員姓名');
    if (!name?.trim()) return;
    const branch = prompt('分會（例如：長輝分會）');
    if (!branch?.trim()) return;
    try {
      const row = await adminCreateMember({
        name: name.trim(),
        branch: branch.trim(),
        region: branch.includes('金') ? 'sanlu' : 'zhongshan',
        profession: '',
        status: 'self_registered',
        active: true,
        tags: [],
      });
      members.push(row);
      applyMemberToCache(row);
      renderList(searchEl.value);
      showToast('已新增');
    } catch (err) {
      showToast(err.message || '新增失敗');
    }
  });

  await loadMembers();
}

async function renderFeedPanel(panel) {
  panel.innerHTML = `
    <p class="admin-sub">${escHtml(t('admin_feed_sub'))}</p>
    <div class="admin-toolbar">
      <button type="button" id="admin-feed-refresh" class="btn-outline">${escHtml(t('admin_feed_refresh'))}</button>
    </div>
    <div id="admin-feed-list" class="admin-feed-list"><div class="bind-loading">${escHtml(t('admin_feed_loading'))}</div></div>
  `;

  async function loadFeed() {
    const listEl = panel.querySelector('#admin-feed-list');
    listEl.innerHTML = `<div class="bind-loading">${escHtml(t('admin_feed_loading'))}</div>`;
    try {
      const feed = await fetchFeed(80);
      if (!feed.length) {
        listEl.innerHTML = `<div class="bind-empty">${escHtml(t('feed_empty'))}</div>`;
        return;
      }
      listEl.innerHTML = feed.map(item => adminFeedRowHTML(item)).join('');
      listEl.querySelectorAll('.admin-feed-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.feedId;
          if (!id) return;
          const okConfirm = await showConfirmDialog({
            title: t('feed_delete'),
            message: t('feed_delete_confirm'),
            confirmLabel: t('feed_delete'),
          });
          if (!okConfirm) return;
          btn.disabled = true;
          try {
            await adminDeleteFeedMessage(id);
            showToast(t('feed_delete_ok'));
            await loadFeed();
          } catch (err) {
            showToast(t('feed_delete_fail'));
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div class="bind-empty">${escHtml(err.message)}</div>`;
    }
  }

  panel.querySelector('#admin-feed-refresh')?.addEventListener('click', loadFeed);
  await loadFeed();
}

function adminFeedRowHTML(item) {
  const type = item.feed_type || 'message';
  const name = escHtml(item.actor_name || t('feed_system'));
  const branch = escHtml(item.actor_branch || item.meta?.branch || '—');
  const time = formatFeedTime(item.created_at);
  const body = type === 'message'
    ? escHtml(item.content || '')
    : escHtml(item.content || `[${type}]`);
  const typeLabel = type === 'message' ? '' : `<span class="admin-feed-type">${escHtml(type)}</span>`;
  return `
    <article class="admin-feed-row" data-id="${escHtml(item.id || '')}">
      <div class="admin-feed-row-top">
        <div class="admin-feed-meta">${name} · ${branch} ${typeLabel}</div>
        <div class="admin-feed-time">${escHtml(time)}</div>
      </div>
      <div class="admin-feed-body">${body}</div>
      ${item.id ? `<button type="button" class="btn-outline admin-feed-delete" data-feed-id="${escHtml(item.id)}">${escHtml(t('feed_delete'))}</button>` : ''}
    </article>`;
}

async function renderBranchesPanel(panel) {
  panel.innerHTML = '<div class="bind-loading">載入分會…</div>';
  try {
    const branches = await fetchAdminBranches();
    const dupMap = buildDuplicateHints(branches);

    panel.innerHTML = `
      <p class="admin-sub">${escHtml(t('admin_branch_sub'))}</p>
      <div class="admin-merge-form">
        <label class="field-label">${escHtml(t('admin_branch_merge_from'))}</label>
        <input id="merge-from" class="field-input" list="branch-names" placeholder="例：長輝">
        <label class="field-label">${escHtml(t('admin_branch_merge_to'))}</label>
        <input id="merge-to" class="field-input" list="branch-names" placeholder="例：長輝分會">
        <datalist id="branch-names">
          ${branches.map(b => `<option value="${escHtml(b.branch)}">`).join('')}
        </datalist>
        <button type="button" id="admin-merge-btn" class="btn-ai">${escHtml(t('admin_branch_merge_btn'))}</button>
      </div>
      <div class="admin-branch-table-wrap">
        <table class="admin-branch-table">
          <thead>
            <tr>
              <th>${escHtml(t('admin_branch_col'))}</th>
              <th>${escHtml(t('admin_branch_region'))}</th>
              <th>${escHtml(t('admin_branch_count'))}</th>
              <th>${escHtml(t('admin_branch_duplicates'))}</th>
            </tr>
          </thead>
          <tbody>
            ${branches.map(b => {
              const dups = dupMap.get(b.branch) || [];
              return `<tr>
                <td>${escHtml(b.branch)}</td>
                <td>${escHtml(b.region || '—')}</td>
                <td>${b.count ?? 0}</td>
                <td>${dups.length ? dups.map(d => escHtml(d)).join('、') : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <button type="button" id="admin-refresh-branches" class="btn-outline" style="margin-top:12px">重新整理</button>
    `;

    panel.querySelector('#admin-refresh-branches')?.addEventListener('click', () => renderBranchesPanel(panel));
    panel.querySelector('#admin-merge-btn')?.addEventListener('click', async () => {
      const from = panel.querySelector('#merge-from')?.value.trim();
      const to = panel.querySelector('#merge-to')?.value.trim();
      if (!from || !to) {
        showToast('請填寫合併來源與目標分會');
        return;
      }
      const msg = t('admin_branch_merge_confirm')
        .replace('{from}', normalizeBranchName(from))
        .replace('{to}', normalizeBranchName(to));
      const okConfirm = await showConfirmDialog({
        title: t('admin_branch_merge_btn'),
        message: msg,
      });
      if (!okConfirm) return;
      try {
        const res = await adminMergeBranches(from, to);
        showToast(`${t('admin_branch_merge_ok')}（${res.updated ?? 0} 人）`);
        await renderBranchesPanel(panel);
      } catch (err) {
        showToast(err.message || '合併失敗');
      }
    });
  } catch (err) {
    panel.innerHTML = `<div class="bind-empty">${escHtml(err.message)}</div>`;
  }
}

/** 同一正規化名稱下有多個寫法 → 標示可能重複 */
function buildDuplicateHints(branches) {
  const byNorm = new Map();
  for (const b of branches) {
    const norm = b.normalized || normalizeBranchName(b.branch);
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm).push(b.branch);
  }
  const dupMap = new Map();
  for (const [, names] of byNorm) {
    if (names.length < 2) continue;
    for (const n of names) {
      dupMap.set(n, names.filter(x => x !== n));
    }
  }
  return dupMap;
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('zh-TW', { hour12: false });
  } catch {
    return String(ts);
  }
}

async function bindLiveSettingsPanel(panel) {
  const wrap = panel.querySelector('#admin-live-lb-checks');
  const saveBtn = panel.querySelector('#admin-save-lb-modes');
  if (!wrap || !saveBtn) return;

  let modes = ['mutual', 'received_one'];
  try {
    const settings = await fetchLiveSettings();
    modes = settings?.leaderboard_modes || modes;
  } catch (e) {
    console.warn('live settings:', e.message);
  }

  wrap.innerHTML = `
    <label class="field-check"><input type="checkbox" name="lb-mutual" ${modes.includes('mutual') ? 'checked' : ''}> ${escHtml(t('admin_live_lb_mutual'))}</label>
    <label class="field-check"><input type="checkbox" name="lb-received" ${modes.includes('received_one') ? 'checked' : ''}> ${escHtml(t('admin_live_lb_received'))}</label>
  `;

  saveBtn.onclick = async () => {
    const next = [];
    if (wrap.querySelector('[name=lb-mutual]')?.checked) next.push('mutual');
    if (wrap.querySelector('[name=lb-received]')?.checked) next.push('received_one');
    if (!next.length) {
      showToast(t('admin_live_lb_min'));
      return;
    }
    try {
      await adminSetLeaderboardModes(next);
      showToast(t('admin_live_lb_saved'));
    } catch (err) {
      showToast(err.message || '儲存失敗');
    }
  };
}
