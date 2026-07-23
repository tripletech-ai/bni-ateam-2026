import { escHtml } from '../utils/html.js';
import { isDinnerMode } from '../config/appMode.js';
import { CHANGHUI_DINNER_EVENT } from '../data/changhuiDinner.js';
import { getMyStatus } from '../services/auth.js';
import { markBeginnerGuideSeen } from '../utils/beginnerGuide.js';

function dinnerSteps(name) {
  const ev = CHANGHUI_DINNER_EVENT?.title || '長輝擴大商機晚會';
  return [
    {
      eyebrow: '新手教學 1 / 4',
      title: name ? `${name}，歡迎入場` : '歡迎使用商務連結',
      body: `這是「${ev}」今晚專用：說你想找誰、讓 AI 媒合本場夥伴、標記想約 1-1。名單與計分都只限今晚現場。`,
    },
    {
      eyebrow: '新手教學 2 / 4',
      title: 'AI 找人怎麼用？',
      body: '點下方「找人脈」→ 用一句話說你的需求（例如：想找做空間設計、或有客源可以互介的夥伴）。系統只會在本場名單裡幫你配對。',
    },
    {
      eyebrow: '新手教學 3 / 4',
      title: '標記想約 1-1',
      body: '看到合適的人，按「想約 1-1」。雙方都標記會成為互相連結，並計入今晚獨立排行榜——把握現場交流最有效。',
    },
    {
      eyebrow: '新手教學 4 / 4',
      title: '完善「我的」資料',
      body: '到「我的」補上產業、我提供什麼、想認識誰。資料愈完整，AI 媒合愈準。準備好了就開始找本場夥伴吧！',
    },
  ];
}

function defaultSteps(name) {
  return [
    {
      eyebrow: '新手教學 1 / 4',
      title: name ? `${name}，歡迎加入` : '歡迎使用商務連結',
      body: '這套系統幫你用 AI 找對的商務夥伴：說出需求、標記想約 1-1、在現場快速連結。',
    },
    {
      eyebrow: '新手教學 2 / 4',
      title: 'AI 找人怎麼用？',
      body: '到「找人脈」，用自然語言描述你想找誰或想提供什麼。AI 會依產業、需求與簡介幫你排序人選。',
    },
    {
      eyebrow: '新手教學 3 / 4',
      title: '標記想約 1-1',
      body: '看對眼就按「想約 1-1」。對方若也標記你，會成為互相連結，方便之後追蹤與交流。',
    },
    {
      eyebrow: '新手教學 4 / 4',
      title: '完善「我的」資料',
      body: '在「我的」填寫產業與想認識對象，讓別人搜得到你、也讓 AI 更準。接下來就去找第一位夥伴吧！',
    },
  ];
}

/**
 * 登入／綁定後新手教學（多步驟）
 * @param {{ onGoSearch?: () => void, onGoProfile?: () => void, profileEmpty?: boolean }} opts
 */
export function showBeginnerGuide({ onGoSearch, onGoProfile, profileEmpty = false } = {}) {
  const name = getMyStatus()?.member?.name || '';
  const steps = isDinnerMode() ? dinnerSteps(name) : defaultSteps(name);
  let index = 0;

  const overlay = document.createElement('div');
  overlay.id = 'beginner-guide-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '新手教學');
  document.body.classList.add('beginner-guide-open');
  document.body.appendChild(overlay);

  const paint = () => {
    const step = steps[index];
    const isLast = index === steps.length - 1;
    const primaryLabel = isLast
      ? (profileEmpty ? '先完善我的資料' : '開始找人')
      : '下一步';
    const secondaryLabel = isLast ? '稍後再說' : '跳過教學';

    overlay.innerHTML = `
      <div class="beginner-guide-card">
        <p class="beginner-guide-eyebrow">${escHtml(step.eyebrow)}</p>
        <h2 class="beginner-guide-title serif">${escHtml(step.title)}</h2>
        <p class="beginner-guide-body">${escHtml(step.body)}</p>
        <div class="beginner-guide-dots" aria-hidden="true">
          ${steps.map((_, i) => `<span class="beginner-guide-dot${i === index ? ' active' : ''}"></span>`).join('')}
        </div>
        <div class="beginner-guide-actions">
          <button type="button" class="welcome-btn-primary" id="beginner-guide-next">${escHtml(primaryLabel)}</button>
          <button type="button" class="welcome-btn-skip" id="beginner-guide-skip">${escHtml(secondaryLabel)}</button>
        </div>
      </div>`;

    overlay.querySelector('#beginner-guide-next')?.addEventListener('click', () => {
      if (!isLast) {
        index += 1;
        paint();
        return;
      }
      close(() => (profileEmpty ? onGoProfile?.() : onGoSearch?.()));
    });
    overlay.querySelector('#beginner-guide-skip')?.addEventListener('click', () => {
      close(() => {
        if (isLast && profileEmpty) onGoSearch?.();
      });
    });
  };

  const close = (cb) => {
    markBeginnerGuideSeen();
    document.body.classList.remove('beginner-guide-open');
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      cb?.();
    }, 200);
  };

  paint();
}
