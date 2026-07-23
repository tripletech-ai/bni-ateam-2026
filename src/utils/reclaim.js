import { selfUnbind, ensureAuthSession } from '../services/auth.js';
import { showConfirmDialog } from './confirmDialog.js';
import { showToast } from './toast.js';
import { t } from '../i18n/translations.js';
import { clearDinnerIdentity } from './dinnerSession.js';
import { isDinnerMode } from '../config/appMode.js';

export async function runReclaim() {
  const ok = await showConfirmDialog({
    title: t('reclaim_confirm'),
    message: isDinnerMode()
      ? '將回到選人入場畫面，你可以重新選擇身分。'
      : t('reclaim_confirm_detail'),
    confirmLabel: t('user_bar_reclaim'),
  });
  if (!ok) return;

  try {
    clearDinnerIdentity();
    if (typeof window !== 'undefined') {
      window.BNI_DINNER_PROFILE = null;
    }
    const fresh = await ensureAuthSession();
    if (!fresh) {
      showToast(t('onboard_err_session'));
      return;
    }
    // 晚宴換身分也必須解除 DB 綁定，否則新身分無法廣播
    try {
      await selfUnbind();
    } catch (e) {
      console.warn('selfUnbind:', e.message);
    }
    showToast(isDinnerMode() ? '請重新選擇身分' : t('reclaim_ok'));
    location.hash = '';
    location.reload();
  } catch (e) {
    showToast(e.message || t('reclaim_fail'));
  }
}
