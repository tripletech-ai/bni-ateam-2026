import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import {
  getAreaGroups,
  getRegionsInArea,
  getRegionById,
  chapterFullName,
  isAteamRosterChapterName,
  eventBranchPickerHTML,
  regionPickerHTML,
} from '../data/eventChapters.js';
import { normalizeBranchName } from '../data/branches.js';
import { getMembersByBranch } from '../utils/search.js';

function eventChapterChipHTML(name, { showCount = true } = {}) {
  const full = chapterFullName(name);
  const roster = isAteamRosterChapterName(name) ? ' ateam-roster' : '';
  const count = showCount ? getMembersByBranch(full).length : 0;
  const countHtml = showCount && count > 0
    ? `<span class="chip-count">${count}</span>`
    : '';
  const reserved = showCount && count === 0 ? ' branch-chip-reserved' : '';
  return `<div class="branch-chip event-chapter${roster}${reserved}" data-branch="${escHtml(full)}" role="button" tabindex="0">
    ${escHtml(name)}${countHtml}
  </div>`;
}

/** 找人脈：全台分會名錄（含楊董 A Team 分會，不重複另開中山／三蘆區塊） */
export function eventRegistryBrowseHTML({ guestBranches = [] } = {}) {
  const groups = getAreaGroups();
  const sections = groups.map(area => {
    const regions = getRegionsInArea(area);
    const regionBlocks = regions.map(region => `
      <div class="branch-region-block">
        <div class="branch-region-title">${escHtml(region.regionLabel)}</div>
        <div class="branch-chips">${region.chapters.map(name => eventChapterChipHTML(name)).join('')}</div>
      </div>`).join('');
    return `
      <details class="event-registry-area">
        <summary class="event-registry-area-summary">${escHtml(area)}</summary>
        <div class="event-registry-area-body">${regionBlocks}</div>
      </details>`;
  }).join('');

  const guestSection = guestBranches.length
    ? `<div class="branch-region-block branch-guest-block">
        <div class="branch-region-title">${escHtml(t('search_guest'))}</div>
        <div class="branch-chips">${guestBranches.map(b => {
          const full = b.fullName || normalizeBranchName(b.name);
          const label = b.fullName || full;
          return `<div class="branch-chip guest" data-branch="${escHtml(full)}" role="button" tabindex="0">
            ${escHtml(label)}<span class="chip-count">${b.count}</span>
          </div>`;
        }).join('')}</div>
      </div>`
    : `<p class="branch-empty-hint branch-guest-empty">${escHtml(t('search_guest_empty'))}</p>`;

  return `
    <section class="branch-browse-card event-registry-card" aria-label="${escAttr(t('search_event_registry_title'))}">
      <div class="branch-browse-header">
        <span class="branch-browse-icon" aria-hidden="true">🗺️</span>
        <div class="branch-browse-head-text">
          <div class="branch-browse-title">${escHtml(t('search_event_registry_title'))}</div>
          <div class="branch-browse-sub">${escHtml(t('search_event_registry_sub'))}</div>
        </div>
      </div>
      <div class="branch-browse-body event-registry-body">
        ${sections}
        ${guestSection}
      </div>
    </section>`;
}

export function bindEventChapterClicks(container, onBranchClick) {
  if (!container || container.dataset.chapterBrowseBound === '1') return;
  container.dataset.chapterBrowseBound = '1';
  container.addEventListener('click', e => {
    const chip = e.target.closest('[data-branch]');
    if (!chip || !container.contains(chip)) return;
    onBranchClick?.(chip.dataset.branch);
  });
  container.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const chip = e.target.closest('[data-branch]');
    if (!chip || !container.contains(chip)) return;
    e.preventDefault();
    onBranchClick?.(chip.dataset.branch);
  });
}

export function onboardRegionPickerHTML() {
  return `
    <details class="onboard-region-picker" id="onboard-region-picker">
      <summary class="onboard-region-picker-summary">${escHtml(t('onboard_or_pick_region'))}</summary>
      <p class="field-hint onboard-region-hint">${escHtml(t('onboard_hint_region'))}</p>
      <div id="onboard-region-grid" class="onboard-region-grid-wrap">${regionPickerHTML()}</div>
      <div id="onboard-chapter-panel" class="onboard-chapter-panel hidden">
        <p class="field-hint onboard-chapter-panel-hint">${escHtml(t('onboard_hint_branch'))}</p>
        <div id="onboard-chapter-panel-label" class="onboard-chapter-panel-label"></div>
        <div id="onboard-chapter-grid" class="quick-filter-scroll simple-claim-chips onboard-chapter-grid"></div>
      </div>
    </details>`;
}

export function bindOnboardRegionPicker(container, { onSelectBranch, getSelectedBranch } = {}) {
  const refreshChapterGrid = (regionId) => {
    const panel = container.querySelector('#onboard-chapter-panel');
    const grid = container.querySelector('#onboard-chapter-grid');
    const label = container.querySelector('#onboard-chapter-panel-label');
    const region = getRegionById(regionId);
    if (!panel || !grid || !region) return;
    panel.classList.remove('hidden');
    if (label) label.textContent = region.regionLabel;
    const selected = getSelectedBranch?.() || '';
    grid.innerHTML = eventBranchPickerHTML(regionId, selected);
    grid.querySelectorAll('[data-branch]').forEach(chip => {
      chip.addEventListener('click', () => onSelectBranch?.(chip.dataset.branch));
    });
  };

  container.querySelectorAll('#onboard-region-grid .onboard-region-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#onboard-region-grid .onboard-region-chip').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      refreshChapterGrid(btn.dataset.regionId);
    });
  });
}
