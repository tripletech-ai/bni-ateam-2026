import { escHtml } from '../utils/html.js';
import { completeTutorial, fetchTutorialSteps, getMyStatus } from '../services/auth.js';

function tStep(step, field) {
  const lang = window.BNI_LANG === 'en' ? 'en' : 'zh';
  if (field === 'title') return lang === 'en' ? step.title_en : step.title_zh;
  if (field === 'body') return lang === 'en' ? step.body_en : step.body_zh;
  if (field === 'tip') return lang === 'en' ? (step.tip_en || '') : (step.tip_zh || '');
  return '';
}

function personalize(text, member) {
  const name = member?.name || '夥伴';
  const branch = member?.branch || 'BNI';
  return String(text)
    .replace(/\{name\}/g, name)
    .replace(/\{branch\}/g, branch);
}

/**
 * 多步驟新手教學 — 內容從 bni_tutorial_steps 讀取，完成狀態寫入 bni_onboarding。
 */
export async function showWelcomeTutorial({ onDone, applyFontSize }) {
  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', window.BNI_LANG === 'en' ? 'Welcome tutorial' : '新手教學');
  overlay.innerHTML = `
    <div id="welcome-card" class="welcome-card-tutorial">
      <div class="welcome-loading">載入教學內容…</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const card = overlay.querySelector('#welcome-card');
  let steps = [];
  let stepIndex = 0;

  try {
    steps = await fetchTutorialSteps();
    if (!steps.length) throw new Error('教學步驟為空');
  } catch (err) {
    card.innerHTML = `
      <div class="welcome-eyebrow">BNI · ANDERSON TEAM · 2026</div>
      <div class="welcome-title">新手教學</div>
      <p class="welcome-desc-block">無法載入教學內容：${escHtml(err.message)}</p>
      <button type="button" id="welcome-retry" class="welcome-btn-ghost">重試載入</button>
      <button type="button" id="welcome-start" class="welcome-btn-primary">仍要開始使用</button>
    `;
    card.querySelector('#welcome-retry')?.addEventListener('click', async () => {
      card.innerHTML = '<div class="welcome-loading">重新載入…</div>';
      try {
        steps = await fetchTutorialSteps();
        if (!steps.length) throw new Error('教學步驟為空');
        stepIndex = 0;
        render();
      } catch (e2) {
        card.innerHTML = `<p class="welcome-desc-block">仍無法載入：${escHtml(e2.message)}</p>
          <button type="button" id="welcome-start" class="welcome-btn-primary">仍要開始使用</button>`;
        card.querySelector('#welcome-start')?.addEventListener('click', () => finish(overlay, onDone));
      }
    });
    card.querySelector('#welcome-start')?.addEventListener('click', () => finish(overlay, onDone));
    return;
  }

  const member = getMyStatus()?.member;

  function render() {
    const step = steps[stepIndex];
    const isLast = stepIndex === steps.length - 1;
    const isSettings = step.step_key === 'settings';

    card.innerHTML = `
      <div class="welcome-eyebrow">BNI · ANDERSON TEAM · 2026 年會</div>
      <div class="welcome-step-dots" aria-hidden="true">
        ${steps.map((_, i) => `<span class="welcome-dot${i === stepIndex ? ' active' : ''}${i < stepIndex ? ' done' : ''}"></span>`).join('')}
      </div>
      <div class="welcome-step-num">${stepIndex + 1} / ${steps.length}</div>
      <div class="welcome-title hero-title-shimmer">${escHtml(tStep(step, 'title'))}</div>
      ${step.step_key === 'goal'
        ? `<div class="welcome-goal">${escHtml(personalize(tStep(step, 'body'), member))}</div>`
        : `<p class="welcome-desc-block">${escHtml(personalize(tStep(step, 'body'), member))}</p>`}
      ${tStep(step, 'tip') ? `<div class="welcome-tip">${escHtml(personalize(tStep(step, 'tip'), member))}</div>` : ''}
      ${isSettings ? `
        <div class="welcome-fs">
          <div class="welcome-fs-label">${window.BNI_LANG === 'en' ? 'Font size' : '字體大小'}</div>
          <div class="welcome-fs-opts">
            <button type="button" class="welcome-fs-btn" data-fs="fs-s">標準</button>
            <button type="button" class="welcome-fs-btn" data-fs="fs-m">大</button>
            <button type="button" class="welcome-fs-btn" data-fs="fs-l">特大</button>
          </div>
        </div>
        <div class="welcome-lang-hint">${window.BNI_LANG === 'en' ? 'Language: top-right <strong>中文 / EN</strong>' : '右上角可切換 <strong>中文 / EN</strong>'}</div>
      ` : ''}
      <div class="welcome-nav">
        ${stepIndex > 0 ? `<button type="button" class="welcome-btn-ghost" id="welcome-prev">${window.BNI_LANG === 'en' ? 'Back' : '上一步'}</button>` : '<span></span>'}
        ${isLast
          ? `<button type="button" class="welcome-btn-primary" id="welcome-start">${window.BNI_LANG === 'en' ? 'Start' : '開始使用'}</button>`
          : `<button type="button" class="welcome-btn-primary" id="welcome-next">${window.BNI_LANG === 'en' ? 'Next' : '下一步'}</button>`}
      </div>
    `;

    if (isSettings && applyFontSize) {
      const fsButtons = card.querySelectorAll('.welcome-fs-btn');
      const markActive = () => fsButtons.forEach(b =>
        b.setAttribute('data-active', String(b.dataset.fs === window.BNI_FONT)));
      markActive();
      fsButtons.forEach(b => b.addEventListener('click', () => {
        applyFontSize(b.dataset.fs);
        markActive();
      }));
    }

    card.querySelector('#welcome-prev')?.addEventListener('click', () => {
      stepIndex = Math.max(0, stepIndex - 1);
      render();
    });
    card.querySelector('#welcome-next')?.addEventListener('click', () => {
      stepIndex = Math.min(steps.length - 1, stepIndex + 1);
      render();
    });
    card.querySelector('#welcome-start')?.addEventListener('click', () => finish(overlay, onDone));
  }

  render();
}

async function finish(overlay, onDone) {
  try { await completeTutorial(); } catch (e) { console.warn('completeTutorial:', e); }
  overlay.style.transition = 'opacity 0.22s';
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.remove();
    onDone?.();
  }, 230);
}
