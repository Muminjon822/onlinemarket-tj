import { repo } from '../repo/index.js';
import { favs } from '../state.js';
import { CATEGORIES, CITIES, CONDITIONS, categoryById } from '../data/constants.js';
import { esc, money, icon, productImage, openSheet, debounce } from '../ui.js';
import { ctx } from '../core.js';

// Фильтры сохраняются при переходе между страницами
const F = { q: '', cat: 'all', cond: 'all', city: 'all', min: '', max: '', sort: 'new' };

export function productCard(p) {
  const on = favs.has(p.id);
  const out = p.stock < 1;
  return `<article class="card">
    ${p.demo ? '<span class="tag demo">Намунавӣ</span>' : ''}
    <button class="fav-btn ${on ? 'on' : ''}" data-act="fav" data-id="${esc(p.id)}" aria-label="Дӯстдошта">${icon('heart', on)}</button>
    <a class="card-img" href="#/product/${esc(p.id)}"><img loading="lazy" data-cat="${esc(p.category)}" src="${esc(productImage(p))}" alt="${esc(p.title)}"></a>
    <div class="card-body">
      <a class="card-title" href="#/product/${esc(p.id)}">${esc(p.title)}</a>
      <div class="price">${money(p.price)}</div>
      <div class="small muted">${esc(p.city)}</div>
      <button class="btn sm" data-act="add" data-id="${esc(p.id)}" ${out ? 'disabled' : ''}>${out ? 'Тамом шуд' : 'Ба сабад'}</button>
    </div>
  </article>`;
}

const emptyState = (emoji, text) => `<div class="empty"><div class="big">${emoji}</div><p>${text}</p></div>`;

function applyFilters(list) {
  const q = F.q.trim().toLowerCase();
  const min = F.min === '' ? null : Number(F.min);
  const max = F.max === '' ? null : Number(F.max);
  let out = list.filter((p) => {
    if (q && !`${p.title} ${p.description} ${p.sellerName}`.toLowerCase().includes(q)) return false;
    if (F.cat !== 'all' && p.category !== F.cat) return false;
    if (F.cond !== 'all' && p.condition !== F.cond) return false;
    if (F.city !== 'all' && p.city !== F.city) return false;
    if (min !== null && p.price < min) return false;
    if (max !== null && p.price > max) return false;
    return true;
  });
  const sorters = {
    new: (a, b) => b.createdAt - a.createdAt,
    cheap: (a, b) => a.price - b.price,
    expensive: (a, b) => b.price - a.price,
  };
  out = out.sort(sorters[F.sort] || sorters.new);
  return out;
}

const activeFilterCount = () => ['cond', 'city'].filter((k) => F[k] !== 'all').length + (F.min !== '' ? 1 : 0) + (F.max !== '' ? 1 : 0) + (F.sort !== 'new' ? 1 : 0);

export async function homeView() {
  const all = await repo.listProducts();
  const chips = [{ id: 'all', name: 'Ҳама', icon: '✨' }, ...CATEGORIES]
    .map((c) => `<button class="chip ${F.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('');

  const html = `
    <section class="hero">
      <h1>Бозори онлайнии Тоҷикистон</h1>
      <p>Харед ва фурӯшед — зуд, осон ва бехатар.</p>
      <a class="btn sm" href="#/seller/new">+ Фурӯхтани маҳсулот</a>
    </section>
    <div class="searchbar">
      <div class="input-wrap">${icon('search')}<input id="q" type="search" inputmode="search" enterkeyhint="search" placeholder="Ҷустуҷӯи маҳсулот..." value="${esc(F.q)}" autocomplete="off"></div>
      <button class="filter-btn" id="filter-btn" aria-label="Филтрҳо">${icon('filter')}<span class="dot ${activeFilterCount() ? '' : 'hidden'}" id="filter-dot"></span></button>
    </div>
    <div class="chips" id="chips">${chips}</div>
    <div class="row between" style="margin:6px 0 10px"><h2 style="font-size:18px">Маҳсулот</h2><span class="muted small" id="count"></span></div>
    <div class="grid" id="grid"></div>`;

  return {
    html,
    mount(root) {
      const grid = root.querySelector('#grid');
      const count = root.querySelector('#count');
      const draw = () => {
        const list = applyFilters(all);
        count.textContent = `${list.length} маҳсулот`;
        grid.innerHTML = list.length ? list.map(productCard).join('') : `<div style="grid-column:1/-1">${emptyState('🔍', 'Чизе ёфт нашуд. Ҷустуҷӯ ё филтрҳоро тағйир диҳед.')}</div>`;
        root.querySelector('#filter-dot').classList.toggle('hidden', !activeFilterCount());
      };
      draw();

      root.querySelector('#q').addEventListener('input', debounce((e) => { F.q = e.target.value; draw(); }, 150));

      root.querySelector('#chips').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        F.cat = b.dataset.cat;
        root.querySelectorAll('#chips .chip').forEach((c) => c.classList.toggle('active', c === b));
        draw();
      });

      root.querySelector('#filter-btn').addEventListener('click', () => {
        const opt = (list, cur, all) => `<option value="all">${all}</option>` + list.map(([v, n]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(n)}</option>`).join('');
        const sheet = openSheet(`
          <h3>Филтрҳо</h3>
          <div class="field-row">
            <div class="field"><label for="f-min">Нарх аз</label><input id="f-min" type="number" inputmode="numeric" min="0" value="${esc(F.min)}" placeholder="0"></div>
            <div class="field"><label for="f-max">Нарх то</label><input id="f-max" type="number" inputmode="numeric" min="0" value="${esc(F.max)}" placeholder="∞"></div>
          </div>
          <div class="field"><label for="f-cond">Ҳолат</label><select id="f-cond">${opt(Object.entries(CONDITIONS), F.cond, 'Ҳама')}</select></div>
          <div class="field"><label for="f-city">Шаҳр</label><select id="f-city">${opt(CITIES.map((c) => [c, c]), F.city, 'Ҳама шаҳрҳо')}</select></div>
          <div class="field"><label for="f-sort">Тартиб</label><select id="f-sort">
            <option value="new" ${F.sort === 'new' ? 'selected' : ''}>Аввал навҳо</option>
            <option value="cheap" ${F.sort === 'cheap' ? 'selected' : ''}>Аввал арзонтар</option>
            <option value="expensive" ${F.sort === 'expensive' ? 'selected' : ''}>Аввал гаронтар</option></select></div>
          <div class="row"><button class="btn line grow" id="f-reset">Тоза кардан</button><button class="btn grow" id="f-apply">Татбиқ</button></div>`);
        const $ = (id) => sheet.el.querySelector(id);
        $('#f-apply').addEventListener('click', () => {
          F.min = $('#f-min').value; F.max = $('#f-max').value;
          F.cond = $('#f-cond').value; F.city = $('#f-city').value; F.sort = $('#f-sort').value;
          sheet.close(); draw();
        });
        $('#f-reset').addEventListener('click', () => {
          Object.assign(F, { cond: 'all', city: 'all', min: '', max: '', sort: 'new' });
          sheet.close(); draw();
        });
      });
    },
  };
}

export async function productView({ params }) {
  const p = await repo.getProduct(params[0]);
  if (!p || (p.status !== 'active' && !(ctx.user && ctx.user.id === p.sellerId))) {
    return { html: emptyState('😕', 'Маҳсулот ёфт нашуд.') + '<p style="text-align:center"><a class="btn" href="#/">Ба саҳифаи асосӣ</a></p>' };
  }
  const own = ctx.user && ctx.user.id === p.sellerId;
  const on = favs.has(p.id);
  const cat = categoryById(p.category);
  const imgs = (p.images && p.images.length ? p.images : [null]).map((_, i) => `<img data-cat="${esc(p.category)}" src="${esc(productImage(p, i))}" alt="${esc(p.title)}">`).join('');
  const html = `
    <div class="product-layout">
      <div class="gallery" aria-label="Суратҳо">${imgs}</div>
      <div>
        <div class="panel">
          ${p.demo ? '<p class="notice" style="margin:0 0 10px">Ин маҳсулоти намунавӣ аст ва фурӯшандаи воқеӣ надорад.</p>' : ''}
          <div class="row between"><span class="tag">${cat.icon} ${esc(cat.name)}</span><button class="fav-btn on-detail ${on ? 'on' : ''}" style="position:static" data-act="fav" data-id="${esc(p.id)}" aria-label="Дӯстдошта">${icon('heart', on)}</button></div>
          <h1 style="font-size:21px;margin:10px 0 6px">${esc(p.title)}</h1>
          <div class="big-price">${money(p.price)}</div>
          ${p.status === 'hidden' ? '<p class="tag warn">Пинҳон аст</p>' : ''}
          <dl class="kv" style="margin-top:12px">
            <dt>Ҳолат</dt><dd>${esc(CONDITIONS[p.condition])}</dd>
            <dt>Шаҳр</dt><dd>${esc(p.city)}</dd>
            <dt>Фурӯшанда</dt><dd>${esc(p.sellerName)}</dd>
            <dt>Дар анбор</dt><dd>${p.stock > 0 ? `${p.stock} адад` : 'Тамом шуд'}</dd>
          </dl>
        </div>
        <div class="panel">
          <h3 style="margin-bottom:8px">Тавсиф</h3>
          <p style="margin:0;white-space:pre-wrap">${esc(p.description || 'Тавсиф нест.')}</p>
        </div>
        <div class="panel stack">
          ${own ? `<a class="btn ghost block" href="#/seller/edit/${esc(p.id)}">${icon('edit')} Таҳрир кардан</a>` : `
          <div class="row between"><span style="font-weight:700">Миқдор</span>
            <div class="qty"><button data-q="-1" aria-label="Кам">−</button><span id="qv">1</span><button data-q="1" aria-label="Зиёд">+</button></div></div>
          <div class="row"><button class="btn ghost grow" id="add" ${p.stock < 1 ? 'disabled' : ''}>${icon('cart')} Ба сабад</button>
          <button class="btn grow" id="buy" ${p.stock < 1 ? 'disabled' : ''}>Ҳозир харидан</button></div>`}
        </div>
      </div>
    </div>`;

  return {
    html,
    mount(root) {
      let qty = 1;
      const qv = root.querySelector('#qv');
      root.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
        qty = Math.max(1, Math.min(p.stock, qty + Number(b.dataset.q)));
        qv.textContent = qty;
      }));
      const addBtn = root.querySelector('#add');
      const buyBtn = root.querySelector('#buy');
      if (addBtn) addBtn.addEventListener('click', () => root.dispatchEvent(new CustomEvent('cart-add', { bubbles: true, detail: { id: p.id, qty } })));
      if (buyBtn) buyBtn.addEventListener('click', () => root.dispatchEvent(new CustomEvent('cart-add', { bubbles: true, detail: { id: p.id, qty, goCart: true } })));
    },
  };
}

export async function favoritesView() {
  const ids = favs.ids();
  const list = (await repo.listProducts()).filter((p) => ids.includes(p.id));
  const html = `<h1 class="page-title">Дӯстдошта</h1>` + (list.length
    ? `<div class="grid">${list.map(productCard).join('')}</div>`
    : emptyState('💚', 'Ҳоло чизе нест. Тугмачаи дилро дар болои маҳсулот пахш кунед.'));
  return { html };
}
