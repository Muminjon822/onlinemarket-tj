import { repo } from './repo/index.js';
import { ctx, go } from './core.js';
import { cart, favs, onState } from './state.js';
import { initTelegram, setBackButton } from './services/telegram.js';
import { icon, toast, placeholder } from './ui.js';
import { homeView, productView, favoritesView } from './views/catalog.js';
import { cartView, checkoutView, ordersView } from './views/shop.js';
import { authView, accountView } from './views/account.js';
import { sellerProductsView, sellerOrdersView, productFormView } from './views/seller.js';

const routes = [
  [/^\/$/, homeView, 'home'],
  [/^\/product\/([^/]+)$/, productView, 'home'],
  [/^\/favorites$/, favoritesView, 'favorites'],
  [/^\/cart$/, cartView, 'cart'],
  [/^\/checkout$/, checkoutView, 'cart'],
  [/^\/orders$/, ordersView, 'account'],
  [/^\/login$/, (a) => authView({ ...a, mode: 'login' }), 'account'],
  [/^\/register$/, (a) => authView({ ...a, mode: 'register' }), 'account'],
  [/^\/account$/, accountView, 'account'],
  [/^\/seller$/, sellerProductsView, 'account'],
  [/^\/seller\/orders$/, sellerOrdersView, 'account'],
  [/^\/seller\/new$/, productFormView, 'account'],
  [/^\/seller\/edit\/([^/]+)$/, productFormView, 'account'],
];

const view = document.getElementById('view');
const backBtn = document.getElementById('back-btn');
let token = 0;

function currentRoute() {
  const raw = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
  const [path, qs = ''] = raw.split('?');
  return { path, query: new URLSearchParams(qs) };
}

async function render() {
  const my = ++token;
  const { path, query } = currentRoute();
  let match = null;
  for (const [re, fn, tab] of routes) {
    const m = path.match(re);
    if (m) { match = { fn, tab, params: m.slice(1).map(decodeURIComponent) }; break; }
  }
  if (!match) {
    view.innerHTML = '<div class="empty"><div class="big">🧭</div><p>Саҳифа ёфт нашуд.</p><a class="btn" href="#/">Ба саҳифаи асосӣ</a></div>';
    renderNav('home');
    return;
  }
  renderNav(match.tab);
  try {
    const result = await match.fn({ params: match.params, query });
    if (my !== token) return; // пока грузилось, пользователь ушёл дальше
    view.innerHTML = result.html || '';
    if (result.mount) result.mount(view);
    const isRoot = path === '/';
    backBtn.hidden = isRoot;
    setBackButton(!isRoot, () => history.back());
    if (!ctx.keepScroll) window.scrollTo(0, 0);
    ctx.keepScroll = false;
  } catch (e) {
    console.error(e);
    view.innerHTML = '<div class="empty"><div class="big">⚠️</div><p>Хатогӣ рӯй дод. Лутфан саҳифаро нав кунед.</p></div>';
  }
}

// ----- Навигация и счётчики -----
const NAV = [
  ['home', '#/', 'Асосӣ', 'home'],
  ['favorites', '#/favorites', 'Дӯстдошта', 'heart'],
  ['cart', '#/cart', 'Сабад', 'cart'],
  ['account', '#/account', 'Профил', 'user'],
];
let activeTab = 'home';

function renderNav(tab = activeTab) {
  activeTab = tab;
  const badge = (key) => {
    const n = key === 'cart' ? cart.count() : key === 'favorites' ? favs.ids().length : 0;
    return n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : '';
  };
  const label = (key, text) => (key === 'account' && !ctx.user ? 'Ворид шудан' : text);
  const href = (key, h) => (key === 'account' && !ctx.user ? '#/login' : h);
  document.getElementById('bottom-nav').innerHTML = NAV
    .map(([k, h, t, ic]) => `<a href="${href(k, h)}" class="${k === tab ? 'active' : ''}">${icon(ic)}<span>${label(k, t)}</span>${badge(k)}</a>`).join('');
  document.getElementById('top-links').innerHTML = NAV
    .map(([k, h, t, ic]) => `<a href="${href(k, h)}" class="${k === tab ? 'active' : ''}">${icon(ic)}<span>${label(k, t)}</span>${badge(k)}</a>`).join('');
}
ctx.refreshNav = () => renderNav();
ctx.rerender = () => { ctx.keepScroll = true; render(); };

// ----- Действия: корзина и избранное (делегирование событий) -----
async function addToCart(id, qty = 1, goCart = false) {
  const p = await repo.getProduct(id);
  if (!p || p.status !== 'active') return toast('Маҳсулот дастрас нест.', 'err');
  if (ctx.user && ctx.user.id === p.sellerId) return toast('Маҳсулоти худатонро харида наметавонед.', 'err');
  if (p.stock < 1) return toast('Маҳсулот тамом шуд.', 'err');
  const inCart = (cart.lines().find((l) => l.id === id) || {}).qty || 0;
  if (inCart >= p.stock) return toast(`Дар анбор танҳо ${p.stock} адад аст.`, 'err');
  cart.add(id, Math.min(qty, p.stock - inCart), p.stock);
  if (goCart) go('/cart');
  else toast('Ба сабад илова шуд ✓', 'ok');
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  if (b.dataset.act === 'add') addToCart(id);
  if (b.dataset.act === 'fav') {
    const on = favs.toggle(id);
    document.querySelectorAll(`[data-act="fav"][data-id="${CSS.escape(id)}"]`).forEach((el) => {
      el.classList.toggle('on', on);
      el.innerHTML = icon('heart', on);
    });
    if (currentRoute().path === '/favorites') ctx.rerender();
  }
});
view.addEventListener('cart-add', (e) => addToCart(e.detail.id, e.detail.qty, e.detail.goCart));

// Если фото не загрузилось, показываем заглушку
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && !img.dataset.fallback) {
    img.dataset.fallback = '1';
    img.src = placeholder(img.dataset.cat || 'other');
  }
}, true);

backBtn.innerHTML = icon('back');
backBtn.addEventListener('click', () => (history.length > 1 ? history.back() : go('/')));
onState(() => renderNav());
window.addEventListener('hashchange', render);

(async function start() {
  initTelegram();
  try { ctx.user = await repo.currentUser(); } catch { ctx.user = null; }
  renderNav();
  await render();
})();
