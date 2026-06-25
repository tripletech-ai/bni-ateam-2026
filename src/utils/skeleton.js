export function bootSkeletonHTML() {
  return `
    <div class="boot-skeleton" aria-busy="true" aria-label="載入中">
      <div class="skel skel-hero"></div>
      <div class="skel skel-line skel-w80"></div>
      <div class="skel skel-line skel-w60"></div>
      <div class="skel skel-box"></div>
      <div class="skel-row">
        <div class="skel skel-stat"></div>
        <div class="skel skel-stat"></div>
        <div class="skel skel-stat"></div>
      </div>
      <p class="boot-loading-text">載入夥伴名單…</p>
    </div>
  `;
}
