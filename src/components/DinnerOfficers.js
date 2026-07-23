import { escHtml } from '../utils/html.js';
import { CHANGHUI_DINNER_EVENT } from '../data/changhuiDinner.js';

/** 長輝本場主席團（首頁／Landing 盡早顯示） */
export function dinnerOfficersHTML() {
  const officers = CHANGHUI_DINNER_EVENT.officers || [];
  if (!officers.length) return '';
  return `
    <section class="dinner-officers" aria-label="長輝分會主席團">
      <p class="dinner-officers-eyebrow">長輝白金分會 · 本場主席團</p>
      <ul class="dinner-officers-list">
        ${officers.map(o => `
          <li class="dinner-officer">
            <span class="dinner-officer-role">${escHtml(o.role)}</span>
            <span class="dinner-officer-name serif">${escHtml(o.name)}</span>
          </li>`).join('')}
      </ul>
    </section>`;
}
