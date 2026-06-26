import { selfUnbind, ensureAuthSession } from '../services/auth.js';
import { showConfirmDialog } from './confirmDialog.js';
import { showToast } from './toast.js';
import { t } from '../i18n/translations.js';

export async function runReclaim() {
  const ok = await showConfirmDialog({
    title: t('reclaim_confirm'),
    message: t('reclaim_confirm_detail'),
    confirmLabel: t('user_bar_reclaim'),
  });
  if (!ok) return;

  try {
    const fresh = await ensureAuthSession();
    if (!fresh) {
      showToast(t('onboard_err_session'));
      return;
    }
    await selfUnbind();
    showToast(t('reclaim_ok'));
    location.hash = '';
    location.reload();
  } catch (e) {
    showToast(e.message || t('reclaim_fail'));
  }
}
