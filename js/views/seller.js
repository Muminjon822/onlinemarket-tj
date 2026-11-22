import { repo } from '../repo/index.js';
import { CATEGORIES, CITIES, CONDITIONS, ORDER_STATUS } from '../data/constants.js';
import { CONFIG } from '../config.js';
import { esc, money, icon, productImage, toast, compressImage } from '../ui.js';
import { ctx, go, requireSeller } from '../core.js';
import { orderCard } from './shop.js';

const tabs = (active) => `<div class="tabs">
  <a href="#/seller" class="${active === 'products' ? 'active' : ''}">Маҳсулот</a>
  <a href="#/seller/orders" class="${active === 'orders' ? 'active' : ''}">Фармоишҳо</a></div>`;

export async function sellerProductsView() {
  if (!requireSeller('/seller')) return { html: '' };
  const [products, orders] = await Promise.all([repo.listSellerProducts(ctx.user.id), repo.listSellerOrders(ctx.user.id)]);
  const active = products.filter((p) => p.status === 'active').length;
  const newOrders = orders.filter((o) => o.status === 'new').length;
  const rows = products.map((p) => `
    <div class="list-item">
      <img src="${esc(productImage(p))}" alt="">
      <div class="grow"><a href="#/product/${esc(p.id)}" style="font-weight:700">${esc(p.title)}</a>
        <div class="price" style="font-size:14px">${money(p.price)}</div>
        <div class="small muted">Анбор: ${p.stock} ${p.status === 'hidden' ? '· <span class="tag warn">Пинҳон</span>' : ''}</div>
        <div class="actions" style="margin-top:6px">
          <a class="btn ghost sm" href="#/seller/edit/${esc(p.id)}">${icon('edit')}</a>
          <button class="btn line sm" data-toggle="${esc(p.id)}" data-status="${p.status}" aria-label="Пинҳон/нишон">${icon('eye')}</button>
          <button class="btn danger sm" data-del="${esc(p.id)}" aria-label="Нест кардан">${icon('trash')}</button>
        </div></div>
    </div>`).join('');
  const html = `
    <div class="row between"><h1 class="page-title" style="margin:6px 0 14px">Кабинети фурӯшанда</h1><a class="btn sm" href="#/seller/new">${icon('plus')} Илова</a></div>
    <div class="stats"><div class="stat"><b>${active}</b><span>Фаъол</span></div><div class="stat"><b>${newOrders}</b><span>Фармоиши нав</span></div><div class="stat"><b>${orders.length}</b><span>Ҳамаи фармоиш</span></div></div>
    ${tabs('products')}
    ${rows || `<div class="empty"><div class="big">🏪</div><p>Шумо ҳоло маҳсулот надоред.</p><a class="btn" href="#/seller/new">Аввалин маҳсулотро илова кунед</a></div>`}`;
  return {
    html,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        try {
          if (t.dataset.toggle) {
            await repo.setProductStatus(t.dataset.toggle, t.dataset.status === 'active' ? 'hidden' : 'active', ctx.user);
            ctx.rerender();
          } else if (t.dataset.del && confirm('Маҳсулотро нест мекунед?')) {
            await repo.deleteProduct(t.dataset.del, ctx.user);
            toast('Нест шуд.');
            ctx.rerender();
          }
        } catch (ex) { toast(ex.message, 'err'); }
      });
    },
  };
}

const NEXT = { new: ['confirmed', 'Тасдиқ кардан'], confirmed: ['shipped', 'Фиристодан'], shipped: ['delivered', 'Таҳвил шуд'] };

export async function sellerOrdersView() {
  if (!requireSeller('/seller/orders')) return { html: '' };
  const orders = await repo.listSellerOrders(ctx.user.id);
  const cards = orders.map((o) => {
    const n = NEXT[o.status];
    const extra = n || o.status === 'new' || o.status === 'confirmed' || o.status === 'shipped'
      ? `<div class="actions" style="margin-top:10px;justify-content:flex-end">
          ${n ? `<button class="btn sm" data-status="${n[0]}" data-id="${esc(o.id)}">${n[1]}</button>` : ''}
          <button class="btn danger sm" data-status="cancelled" data-id="${esc(o.id)}">Бекор кардан</button></div>` : '';
    return orderCard(o, { forSeller: true, extra });
  }).join('');
  const html = `<h1 class="page-title">Кабинети фурӯшанда</h1>${tabs('orders')}` +
    (cards || '<div class="empty"><div class="big">📭</div><p>Фармоише нест.</p></div>');
  return {
    html,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-status]');
        if (!b) return;
        if (b.dataset.status === 'cancelled' && !confirm('Фармоишро бекор мекунед?')) return;
        try { await repo.setOrderStatus(b.dataset.id, b.dataset.status, ctx.user); toast(ORDER_STATUS[b.dataset.status], 'ok'); ctx.rerender(); } catch (ex) { toast(ex.message, 'err'); }
      });
    },
  };
}

export async function productFormView({ params }) {
  const editId = params[0];
  if (!requireSeller(editId ? `/seller/edit/${editId}` : '/seller/new')) return { html: '' };
  let p = null;
  if (editId) {
    p = await repo.getProduct(editId);
    if (!p || p.sellerId !== ctx.user.id) { go('/seller'); return { html: '' }; }
  }
  const v = p || { title: '', description: '', price: '', stock: 1, category: 'other', condition: 'new', city: ctx.user.city || CITIES[0], images: [] };
  const html = `
    <h1 class="page-title">${p ? 'Таҳрири маҳсулот' : 'Маҳсулоти нав'}</h1>
    <form id="form" class="panel" novalidate>
      <div id="err" class="error hidden"></div>
      <div class="field"><label>Суратҳо (то ${CONFIG.maxPhotos} адад)</label><div class="photos" id="photos"></div>
        <input id="file" type="file" accept="image/*" multiple hidden></div>
      <div class="field"><label for="title">Номи маҳсулот</label><input id="title" name="title" maxlength="80" value="${esc(v.title)}" required></div>
      <div class="field-row">
        <div class="field"><label for="price">Нарх (${esc(CONFIG.currency)})</label><input id="price" name="price" type="number" inputmode="decimal" min="1" step="any" value="${esc(v.price)}" required></div>
        <div class="field"><label for="stock">Миқдор дар анбор</label><input id="stock" name="stock" type="number" inputmode="numeric" min="0" step="1" value="${esc(v.stock)}" required></div>
      </div>
      <div class="field"><label for="category">Категория</label><select id="category" name="category">${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === v.category ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field-row">
        <div class="field"><label for="condition">Ҳолат</label><select id="condition" name="condition">${Object.entries(CONDITIONS).map(([k, n]) => `<option value="${k}" ${k === v.condition ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="field"><label for="city">Шаҳр</label><select id="city" name="city">${CITIES.map((c) => `<option ${c === v.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="description">Тавсиф</label><textarea id="description" name="description" maxlength="2000">${esc(v.description)}</textarea></div>
      <button class="btn block" type="submit">${p ? 'Нигоҳ доштан' : 'Ҷойгир кардан'}</button>
    </form>`;
  return {
    html,
    mount(root) {
      let images = [...(v.images || [])];
      const box = root.querySelector('#photos');
      const file = root.querySelector('#file');
      const err = root.querySelector('#err');
      const drawPhotos = () => {
        box.innerHTML = images.map((src, i) => `<div class="photo"><img src="${esc(src)}" alt=""><button type="button" data-rm="${i}" aria-label="Нест кардан">${icon('close')}</button></div>`).join('') +
          (images.length < CONFIG.maxPhotos ? `<button type="button" class="add-photo" id="add-photo">${icon('camera')}<span>Сурат</span></button>` : '');
      };
      drawPhotos();
      box.addEventListener('click', (e) => {
        if (e.target.closest('#add-photo')) file.click();
        const rm = e.target.closest('[data-rm]');
        if (rm) { images.splice(Number(rm.dataset.rm), 1); drawPhotos(); }
      });
      file.addEventListener('change', async () => {
        const room = CONFIG.maxPhotos - images.length;
        for (const f of [...file.files].slice(0, room)) {
          try { images.push(await compressImage(f)); } catch (ex) { toast(ex.message, 'err'); }
        }
        file.value = '';
        drawPhotos();
      });
      root.querySelector('#form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        err.classList.add('hidden');
        try {
          const data = Object.fromEntries(new FormData(e.target));
          await repo.saveProduct({ ...data, id: p && p.id, images }, ctx.user);
          toast(p ? 'Нигоҳ дошта шуд.' : 'Маҳсулот ҷойгир шуд!', 'ok');
          go('/seller');
        } catch (ex) {
          err.textContent = ex.message;
          err.classList.remove('hidden');
          err.scrollIntoView({ block: 'center', behavior: 'smooth' });
          btn.disabled = false;
        }
      });
    },
  };
}
