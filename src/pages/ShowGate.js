import { escHtml } from '../utils/html.js';
import { SHOW_ACCESS_PASSWORD } from '../config/showAccess.js';
import { unlockShowAccess } from '../utils/routing.js';
import { showToast } from '../utils/toast.js';

export function renderShowGate(container, { onSuccess } = {}) {
  container.className = 'page-root show-gate-page';
  container.innerHTML = `
    <div class="show-gate-wrap admin-login-wrap">
      <header class="admin-login-head">
        <p class="admin-login-eyebrow">BNI A Team · Show</p>
        <h1 class="admin-login-title serif">展示模式</h1>
        <p class="admin-login-sub">系統已對外關閉，請輸入密碼以使用完整功能</p>
      </header>
      <div class="admin-login-card show-gate-card">
        <label class="show-gate-label" for="show-gate-password">存取密碼</label>
        <input
          type="password"
          id="show-gate-password"
          class="show-gate-input"
          inputmode="numeric"
          autocomplete="off"
          maxlength="16"
          placeholder="請輸入密碼"
        />
        <button type="button" id="show-gate-submit" class="btn-google show-gate-submit">進入</button>
        <a href="/" class="admin-login-back">返回關閉頁</a>
      </div>
    </div>`;

  const input = container.querySelector('#show-gate-password');

  const submit = () => {
    const val = input?.value?.trim() || '';
    if (val === SHOW_ACCESS_PASSWORD) {
      unlockShowAccess();
      onSuccess?.();
      return;
    }
    showToast('密碼錯誤');
    input?.focus();
    input?.select();
  };

  container.querySelector('#show-gate-submit')?.addEventListener('click', submit);
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
  input?.focus();
}
