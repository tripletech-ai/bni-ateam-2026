/** 楊董快捷登入 + 電子名片（單一設定來源） */

/** 登入頁：分會留空、姓名填 boss → 認領楊日陞 */
export const YANG_BOSS_ALIAS = 'boss';

export const YANG_MEMBER = Object.freeze({
  name: '楊日陞',
  branch: 'A Team分會',
  region: 'guest',
});

/**
 * NameGain 名片 path（不含 domain）。
 * 取得連結後填在此，例如：'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx?ref=...'
 * 留空則領導層「我的名片」按鈕維持待補狀態。
 */
export const YANG_CARD_SLUG = 'anderson-yang';

export function getYangCardLink() {
  return YANG_CARD_SLUG
    ? `https://namegain.introvista.ai/card/${YANG_CARD_SLUG}`
    : '';
}

export function isYangBossAlias(name) {
  return String(name || '').trim().toLowerCase() === YANG_BOSS_ALIAS;
}

/** 登入表單 → 實際認領用的分會／姓名 */
export function resolveClaimCredentials({ name, branch, region = '' }) {
  const branchTrim = String(branch || '').trim();
  const nameTrim = String(name || '').trim();
  if (isYangBossAlias(nameTrim) && !branchTrim) {
    return {
      name: YANG_MEMBER.name,
      branch: YANG_MEMBER.branch,
      region: YANG_MEMBER.region,
      fromBoss: true,
    };
  }
  return { name: nameTrim, branch: branchTrim, region, fromBoss: false };
}
