import { renderTabBar } from './components/TabBar.js';
import { renderHome }   from './pages/Home.js';
import { renderSearch } from './pages/Search.js';
import { renderMarks }  from './pages/Marks.js';
import { renderResult } from './pages/Result.js';
import { renderYang }   from './pages/Yang.js';

const app = document.getElementById('app');

const routes = {
  ''        : renderHome,
  '#home'   : renderHome,
  '#search' : renderSearch,
  '#marks'  : renderMarks,
  '#result' : renderResult,
  '#yang'   : renderYang,
};

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
});

function navigate() {
  const hash = window.location.hash || '';
  const render = routes[hash] || renderHome;
  app.innerHTML = '';
  try {
    render(app);
  } catch (err) {
    console.error('Page render error:', err);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding:40px 20px;text-align:center;color:#A32D2D;font-family:Noto Sans TC,sans-serif';
    errorDiv.textContent = '頁面載入失敗，請重新整理';
    app.appendChild(errorDiv);
  }
  renderTabBar(document.getElementById('tab-bar'), hash);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', navigate);
navigate();
