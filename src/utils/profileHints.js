/** 判斷是否應顯示「完善個人資料」提示（已有內容則不強迫） */
export function profileNeedsEnrichment(member) {
  if (!member) return false;
  const prof = (member.profession || '').trim();
  const referral = (member.want_referral || member.wantReferral || '').trim();
  return !prof || !referral;
}

export const REFERRAL_TEMPLATE_ZH =
  '好的引薦：\n理想引薦：\n夢幻引薦：';

export const REFERRAL_TEMPLATE_EN =
  'Good referral:\nIdeal referral:\nDream referral:';

export function referralPlaceholder() {
  return window.BNI_LANG === 'en' ? REFERRAL_TEMPLATE_EN : REFERRAL_TEMPLATE_ZH;
}
