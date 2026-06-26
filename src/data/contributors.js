/** 媒合工具開發者 — 結構化資料 */
export const DEVELOPERS = [
  {
    id: 'wangqi',
    name: '王祈',
    photo: '王祈.jpg',
    branchKey: 'dev_wangqi_branch',
    roleKey: 'dev_wangqi_role',
    tagKeys: ['dev_wangqi_tag_ai', 'dev_wangqi_tag_arch'],
    highlightKeys: [
      'dev_wangqi_h1',
      'dev_wangqi_h2',
      'dev_wangqi_h3',
    ],
    companyKeys: ['contributor_company_tripletech'],
    contactKey: 'dev_contact_cta',
  },
  {
    id: 'limengyi',
    name: '李孟一',
    photo: '李孟一.png',
    roleKey: 'dev_limengyi_role',
    tagKeys: ['dev_limengyi_tag_edu', 'contributor_cocreator_tag'],
    highlightKeys: [
      'dev_limengyi_h1',
      'dev_limengyi_h2',
      'dev_limengyi_h3',
    ],
    contactKey: 'dev_contact_cta',
  },
];

/** @deprecated 使用 DEVELOPERS */
export const CONTRIBUTORS = DEVELOPERS;
