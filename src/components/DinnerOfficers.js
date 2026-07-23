import { escHtml, escAttr } from '../utils/html.js';
import {
  CHANGHUI_DINNER_EVENT,
  findDinnerPersonByName,
} from '../data/changhuiDinner.js';
import { LEADERS } from '../data/leaders.js';
import { getPhotoFile, photoUrl } from '../utils/avatar.js';
import { t } from '../i18n/translations.js';
import { getCardLink } from '../data/cardLinks.js';

function coreChineseName(name) {
  return String(name || '')
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[A-Za-z].*$/, '')
    .trim();
}

function nameInitial(name) {
  const chars = String(name || '').match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return chars?.slice(-1)[0] || '?';
}

function clipText(text, max = 120) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function resolvePortraitSrc(displayName, person) {
  const localKeys = [
    displayName,
    coreChineseName(displayName),
    person?.name,
    coreChineseName(person?.name),
  ].filter(Boolean);
  for (const key of localKeys) {
    const file = getPhotoFile(key);
    if (file) return photoUrl(file);
  }
  if (person?.photo) return person.photo;
  const members = typeof window !== 'undefined' ? (window.BNI_MEMBERS || []) : [];
  const hit = members.find(m =>
    coreChineseName(m.name) === coreChineseName(displayName || person?.name),
  );
  if (hit?.photo) return hit.photo;
  return '';
}

function vipPortraitHTML(displayName, src) {
  const initial = nameInitial(displayName);
  return `
    <div class="dinner-vip-photo" aria-hidden="true">
      <span class="dinner-vip-initial">${escHtml(initial)}</span>
      ${src ? `<img class="dinner-vip-img" src="${escAttr(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
    </div>`;
}

function vipCardHTML({
  role,
  name,
  profession = '',
  bio = '',
  have = '',
  photoSrc = '',
  lineLink = '',
  cardLink = '',
}) {
  const intro = clipText(bio || have, 140);
  const lineBtn = lineLink
    ? `<a href="${escAttr(lineLink)}" class="btn-gold-outline dinner-vip-link" target="_blank" rel="noopener">LINE</a>`
    : '';
  const cardBtn = cardLink
    ? `<a href="${escAttr(cardLink)}" class="btn-gold-outline dinner-vip-link" target="_blank" rel="noopener">電子名片</a>`
    : '';
  return `
    <article class="dinner-vip-card">
      ${vipPortraitHTML(name, photoSrc)}
      <div class="dinner-vip-body">
        <p class="dinner-vip-role">${escHtml(role)}</p>
        <h3 class="dinner-vip-name serif">${escHtml(name)}</h3>
        ${profession ? `<p class="dinner-vip-profession">${escHtml(profession)}</p>` : ''}
        ${intro ? `<p class="dinner-vip-intro">${escHtml(intro)}</p>` : ''}
        ${(lineBtn || cardBtn) ? `<div class="dinner-vip-actions">${lineBtn}${cardBtn}</div>` : ''}
      </div>
    </article>`;
}

/** 長輝本場主席團（頭貼＋介紹） */
export function dinnerOfficersHTML() {
  const officers = CHANGHUI_DINNER_EVENT.officers || [];
  if (!officers.length) return '';
  const cards = officers.map(o => {
    const person = findDinnerPersonByName(o.name);
    return vipCardHTML({
      role: o.role,
      name: o.name,
      profession: person?.profession || person?.company || '',
      bio: person?.bio || '',
      have: person?.have || '',
      photoSrc: resolvePortraitSrc(o.name, person),
      lineLink: person?.lineLink || '',
      cardLink: getCardLink(o.name) || person?.cardLink || '',
    });
  }).join('');

  return `
    <section class="dinner-vip-section dinner-officers" aria-label="長輝分會主席團">
      <p class="dinner-vip-eyebrow">長輝白金分會 · 本場主席團</p>
      <div class="dinner-vip-stack">${cards}</div>
    </section>`;
}

/** 區域資深董事＋大使（頭貼＋介紹） */
export function dinnerRegionLeadersHTML() {
  const yang = LEADERS.primary;
  const ritaLeader = (LEADERS.zhongshan || []).find(p =>
    String(p.name || '').includes('游姿菱'),
  );
  const yangDinner = findDinnerPersonByName(yang.name);
  const ritaDinner = findDinnerPersonByName('游姿菱');

  const yangName = yang.displayName || [yang.name, yang.nameEn].filter(Boolean).join(' ');
  const yangIntro = t('yang_intro_body')
    || yangDinner?.bio
    || `${yang.region || ''}`.trim();
  const yangProfession = `${yang.title} · ${t('yang_intro_region')}`;

  const ritaName = ritaLeader?.name || ritaDinner?.name || '游姿菱 Rita';
  const ritaHave = ritaLeader?.have || ritaDinner?.have || '';
  const ritaIntro = ritaHave
    ? `專長對接：${ritaHave}`
    : (ritaDinner?.bio || 'BNI Anderson Team 大使 · 協助現場交流與媒合');
  const ritaProfession = ritaLeader
    ? `${ritaLeader.role || '大使'} · ${ritaLeader.profession || ''}`.replace(/\s·\s$/, '')
    : (ritaDinner?.profession || '大使');

  const cards = [
    vipCardHTML({
      role: '區域資深董事',
      name: yangName,
      profession: yangProfession,
      bio: yangIntro,
      photoSrc: resolvePortraitSrc(yang.photoName || yang.name, yangDinner),
      lineLink: yang.lineLink || yangDinner?.lineLink || '',
      cardLink: getCardLink(yang.photoName || yang.name) || yang.cardLink || '',
    }),
    vipCardHTML({
      role: '大使',
      name: ritaName,
      profession: ritaProfession,
      bio: ritaIntro,
      have: ritaLeader?.have || ritaDinner?.have || '',
      photoSrc: resolvePortraitSrc(ritaName, ritaDinner),
      lineLink: ritaLeader?.lineLink || ritaDinner?.lineLink || '',
      cardLink: getCardLink(coreChineseName(ritaName)) || getCardLink(ritaName) || '',
    }),
  ].join('');

  return `
    <section class="dinner-vip-section dinner-region-leaders" aria-label="區域資深董事與大使">
      <p class="dinner-vip-eyebrow">BNI ANDERSON TEAM</p>
      <div class="dinner-vip-stack">${cards}</div>
    </section>`;
}
