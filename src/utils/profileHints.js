import { memberProfileFilled } from './rosterPick.js';

function field(member, ...keys) {
  for (const k of keys) {
    const v = member?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

/** 正規化 getMyStatus().member 欄位名 */
export function normalizeMemberFields(member) {
  if (!member) return null;
  return {
    profession: field(member, 'profession'),
    have: field(member, 'have'),
    wantMeet: field(member, 'want_meet', 'wantMeet'),
    wantReferral: field(member, 'want_referral', 'wantReferral'),
    bio: field(member, 'bio'),
    industries: Array.isArray(member.industries) ? member.industries : [],
  };
}

/** 後台尚無媒合資料（與 bni_member_profile_filled 一致） */
export function profileBackendEmpty(member) {
  if (!member) return false;
  const f = normalizeMemberFields(member);
  return !memberProfileFilled({
    profession: f.profession,
    have: f.have,
    wantMeet: f.wantMeet,
    wantReferral: f.wantReferral,
    bio: f.bio,
  });
}

/** 判斷是否應顯示「完善個人資料」提示 */
export function profileNeedsEnrichment(member) {
  if (!member) return false;
  if (profileBackendEmpty(member)) return true;
  const f = normalizeMemberFields(member);
  return !f.wantReferral || !f.bio || f.industries.length === 0;
}

const PRESETS = {
  zh: {
    default: {
      label: '通用範本',
      profession: '品牌行銷／社群經營',
      have: '社群代操、短影音企劃、北北基桃到府／線上服務',
      wantMeet: '中小企業主、創業者、需要曝光與行銷的決策者',
      wantReferral: '好的引薦：有明確需求、願意約 1-1 聊聊的潛在客戶\n理想引薦：決策快、預算已編列的企業主或採購窗口\n夢幻引薦：產業龍頭、指標性案源或長期策略合作夥伴',
    },
    design: {
      label: '設計／裝潢',
      profession: '室內設計／空間規劃',
      have: '商業空間、住宅設計、3D 提案、工程統包協調',
      wantMeet: '建商、企業主、餐飲／零售店主、即將裝潢的屋主',
      wantReferral: '好的引薦：三個月內有裝潢需求的屋主或小 office\n理想引薦：建案樣品屋、商辦／店面承租方\n夢幻引薦：指標建案、連鎖品牌展店決策者',
    },
    finance: {
      label: '金融／保險',
      profession: '保險／財務規劃',
      have: '家庭保障規劃、企業主風險管理、資產配置建議',
      wantMeet: '新手爸媽、企業主、高資產家庭、剛創業者',
      wantReferral: '好的引薦：近期結婚、買房、生小孩或公司成立的朋友\n理想引薦：年營收穩定、願意討論風險轉嫁的 SME 老闆\n夢幻引薦：家族辦公室、企業主團體或大型組織福委窗口',
    },
    pro: {
      label: '法律／訴訟',
      profession: '律師／契約與訴訟',
      have: '契約審閱、商業糾紛、公司治理、創業法遵諮詢',
      wantMeet: '新創 founder、中小企業主、人資／法務主管',
      wantReferral: '好的引薦：正在簽約、遇糾紛或想設立公司的朋友\n理想引薦：快速成長、準備融資或跨國交易的企業\n夢幻引薦：上市櫃公司、大型併購或政府標案相關決策者',
    },
  },
  en: {
    default: {
      label: 'General template',
      profession: 'Brand marketing / social media',
      have: 'Social management, short-video campaigns, on-site or online in Greater Taipei',
      wantMeet: 'SME owners, founders, decision-makers who need marketing reach',
      wantReferral: 'Good referral: prospects with clear needs open to a 1-on-1 chat\nIdeal referral: owners with budget and fast decisions\nDream referral: industry leaders or long-term strategic partners',
    },
    design: {
      label: 'Design / interiors',
      profession: 'Interior design / space planning',
      have: 'Commercial & residential design, 3D proposals, project coordination',
      wantMeet: 'Developers, business owners, F&B / retail owners, renovating homeowners',
      wantReferral: 'Good: homeowners or small offices renovating within 3 months\nIdeal: show units, office / retail tenants\nDream: flagship projects or chain expansion decision-makers',
    },
    finance: {
      label: 'Finance / insurance',
      profession: 'Insurance / financial planning',
      have: 'Family protection, owner risk management, asset allocation advice',
      wantMeet: 'New parents, business owners, HNW families, new founders',
      wantReferral: 'Good: friends who married, bought a home, had a baby, or started a company\nIdeal: stable SME owners open to risk planning\nDream: family offices or corporate benefits leads',
    },
    pro: {
      label: 'Legal / litigation',
      profession: 'Attorney / contracts & litigation',
      have: 'Contract review, disputes, governance, startup compliance',
      wantMeet: 'Founders, SME owners, HR / legal managers',
      wantReferral: 'Good: friends signing deals, in disputes, or incorporating\nIdeal: fast-growing companies preparing funding or cross-border deals\nDream: listed firms or major M&A / public-sector leads',
    },
  },
};

export function getProfileLang() {
  return window.BNI_LANG === 'en' ? 'en' : 'zh';
}

export function getProfilePresets() {
  const lang = getProfileLang();
  const pack = PRESETS[lang];
  return ['default', 'design', 'finance', 'pro'].map(id => ({ id, label: pack[id].label }));
}

export function getProfilePreset(id = 'default') {
  const lang = getProfileLang();
  const pack = PRESETS[lang];
  return pack[id] || pack.default;
}

export function getProfileFieldExamples() {
  return getProfilePreset('default');
}

export function referralPlaceholder() {
  return getProfilePreset('default').wantReferral;
}

export function fieldPlaceholder(field) {
  const p = getProfilePreset('default');
  return p[field] || '';
}

/** @param {HTMLFormElement} form */
export function applyPresetToForm(form, presetId = 'default') {
  const p = getProfilePreset(presetId);
  for (const key of ['profession', 'have', 'wantMeet', 'wantReferral']) {
    const el = form.querySelector(`[name="${key}"]`);
    if (el && p[key]) el.value = p[key];
  }
}

/** @param {HTMLFormElement} form @param {string} field */
export function applyFieldExample(form, field) {
  const el = form.querySelector(`[name="${field}"]`);
  if (!el) return;
  const val = getProfilePreset('default')[field];
  if (val) el.value = val;
}

export function profileTemplatePreviewText() {
  const p = getProfilePreset('default');
  const lang = getProfileLang();
  if (lang === 'en') {
    return `Industry: ${p.profession}\nOffer: ${p.have.slice(0, 40)}…`;
  }
  return `產業：${p.profession}\n資源：${p.have.slice(0, 24)}…`;
}
