import { escHtml, escAttr } from '../utils/html.js';
import { t } from '../i18n/translations.js';
import {
  getRegionById,
  chapterFullName,
  isAteamRosterChapterName,
  eventBranchPickerHTML,
  regionPickerHTML,
  buildRegistryBrowseGroups,
} from '../data/eventChapters.js';
import { getMembersByBranch } from '../utils/search.js';

function liveChapterCount(item) {
  const primary = Math.max(item.count || 0, getMembersByBranch(item.fullName).length);
  if (!item.dbAlias) return primary;
  return Math.max(primary, getMembersByBranch(item.dbAlias).length);
}

function eventChapterChipHTML(item) {
  const { shortName, fullName, inRegistry } = item;
  const count = liveChapterCount(item);
  const roster = isAteamRosterChapterName(shortName) ? ' ateam-roster' : '';
  const countHtml = count > 0 ? `<span class="chip-count">${count}</span>` : '';
  const reserved = count === 0 ? ' branch-chip-reserved' : '';
  const alias = !inRegistry ? ' branch-chip-alias' : '';
  const branchAttr = escHtml(fullName);
  return `<div class="branch-chip event-chapter${roster}${reserved}${alias}" data-branch="${branchAttr}" role="button" tabindex="0">
    ${escHtml(shortName)}${countHtml}
  </div>`;
}

/** 找人脈：全台分會名錄（活躍分會依名錄歸類，不另開「其他區」） */
export function eventRegistryBrowseHTML({ stats } = {}) {
  const groups = buildRegistryBrowseGroups(stats);
  const sections = groups.map(({ areaGroup, regions }) => {
    const regionBlocks = regions.map(region => `
      <div class="branch-region-block">
        <div class="branch-region-title">${escHtml(region.regionLabel)}</div>
        <div class="branch-chips">${region.chapters.map(ch => eventChapterChipHTML(ch)).join('')}</div>
      </div>`).join('');
    return `
      <details class="event-registry-area">
        <summary class="event-registry-area-summary">${escHtml(areaGroup)}</summary>
        <div class="event-registry-area-body">${regionBlocks}</div>
      </details>`;
  }).join('');

  return `
    <section class="branch-browse-card event-registry-card" aria-label="${escAttr(t('search_event_registry_title'))}">
      <div class="branch-browse-header">
        <span class="branch-browse-icon" aria-hidden="true">🗺️</span>
        <div class="branch-browse-head-text">
          <div class="branch-browse-title">${escHtml(t('search_event_registry_title'))}</div>
          <div class="branch-browse-sub">${escHtml(t('search_event_registry_sub'))}</div>
        </div>
      </div>
      <div class="branch-browse-body event-registry-body">${sections}</div>
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
