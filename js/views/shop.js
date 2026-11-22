import { repo } from '../repo/index.js';
import { cart } from '../state.js';
import { CITIES, ORDER_STATUS } from '../data/constants.js';
import { DELIVERY_METHODS } from '../services/delivery.js';
import { enabledPayments } from '../services/payments.js';
import { formatPhone } from '../services/validators.js';
import { esc, money, icon, productImage, formatDate, toast } from '../ui.js';
import { ctx, go, requireUser } from '../core.js';

const empty = (emoji, text, link) => `<div class="empty"><div class="big">${emoji}</div><p>${text}</p>${link || ''}</div>`;

/** Строки корзины + актуальные данные товаров. Убирает недоступные. */
async function loadCart() {
  const lines = cart.lines();
  const products = await Promise.all(lines.map((l) => repo.getProduct(l.id)));
  const items = [];
  lines.forEach((l, i) => {
    const p = products[i];
    if (!p || p.status !== 'active' || p.stock < 1) { cart.remove(l.id); return; }
    const qty = Math.min(l.qty, p.stock);
    if (qty !== l.qty) cart.setQty(l.id, qty);
    items.push({ p, qty });
  });
  return items;
}

const totalOf = (items) => items.reduce((s, { p, qty }) => s + p.price * qty, 0);

export async function cartView() {
  const items = await loadCart();
  if (!items.length) {
    return { html: `<h1 class="page-title">Сабад</h1>` + empty('🛒', 'Сабади шумо холӣ аст.', '<a class="btn" href="#/">Ба харид гузаред</a>') };
  }
  const rows = items.map(({ p, qty }) => `
    <div class="line-item">
      <a href="#/product/${esc(p.id)}"><img src="${esc(productImage(p))}" alt=""></a>
      <div class="grow">
        <a href="#/product/${esc(p.id)}" style="font-weight:600">${esc(p.title)}</a>
        <div class="muted small">${esc(p.sellerName)}</div>
        <div class="price">${money(p.price)}</div>
        <div class="row between" style="margin-top:6px">
          <div class="qty"><button data-dec="${esc(p.id)}" aria-label="Кам">−</button><span>${qty}</span><button data-inc="${esc(p.id)}" aria-label="Зиёд" ${qty >= p.stock ? 'disabled' : ''}>+</button></div>
          <button class="btn danger sm" data-del="${esc(p.id)}" aria-label="Нест кардан">${icon('trash')}</button>
        </div>
      </div>
    </div>`).join('');
  const html = `
    <h1 class="page-title">Сабад</h1>
    <div class="cart-layout">
      <div class="panel">${rows}</div>
      <div>
        <div class="panel stack">
          <div class="sum"><span>Ҷамъ</span><span>${money(totalOf(items))}</span></div>
          <p class="muted small" style="margin:0">Хароҷоти таҳвилро фурӯшанда бо шумо мувофиқа мекунад.</p>
          <a class="btn block" href="#/checkout">Расмӣ кардани фармоиш</a>
        </div>
      </div>
    </div>`;
  return {
    html,
    mount(root) {
      const byId = new Map(items.map(({ p, qty }) => [p.id, { p, qty }]));
      root.addEventListener('click', (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        const inc = t.dataset.inc, dec = t.dataset.dec, del = t.dataset.del;
        if (inc) cart.setQty(inc, Math.min(byId.get(inc).p.stock, byId.get(inc).qty + 1));
        else if (dec) cart.setQty(dec, byId.get(dec).qty - 1);
        else if (del) cart.remove(del);
        else return;
        ctx.rerender();
      });
    },
  };
}

export async function checkoutView() {
  if (!requireUser('/checkout')) return { html: '' };
  const items = await loadCart();
  if (!items.length) { go('/cart'); return { html: '' }; }
  const u = ctx.user;
  const deliveries = DELIVERY_METHODS.map((d, i) => `<label><input type="radio" name="delivery" value="${d.id}" ${i === 0 ? 'checked' : ''}><span>${esc(d.label)}</span></label>`).join('');
  const payments = enabledPayments().map((m, i) => `<label><input type="radio" name="payment" value="${m.id}" ${i === 0 ? 'checked' : ''}><span>${esc(m.label)}</span></label>`).join('');
  const lines = items.map(({ p, qty }) => `<div class="row between small"><span class="grow">${esc(p.title)} × ${qty}</span><b>${money(p.price * qty)}</b></div>`).join('');
  const html = `
    <h1 class="page-title">Расмӣ кардани фармоиш</h1>
    <form id="form" class="cart-layout" novalidate>
      <div>
        <div class="panel">
          <div id="err" class="error hidden"></div>
          <div class="field"><label for="name">Ном</label><input id="name" name="name" autocomplete="name" value="${esc(u.name)}" required></div>
          <div class="field"><label for="phone">Телефон</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="92 123 45 67" value="${esc(formatPhone(u.phone))}" required></div>
          <div class="field"><label for="city">Шаҳр</label><select id="city" name="city" autocomplete="address-level2">${CITIES.map((c) => `<option ${c === u.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
          <div class="field"><label for="address">Суроға</label><input id="address" name="address" autocomplete="street-address" placeholder="Кӯча, хона, ошёна"></div>
          <div class="field"><label for="note">Шарҳ (ихтиёрӣ)</label><textarea id="note" name="note" maxlength="500" style="min-height:70px"></textarea></div>
        </div>
        <div class="panel"><h3 style="margin-bottom:10px">Таҳвил</h3><div class="seg" style="grid-template-columns:1fr">${deliveries}</div></div>
        <div class="panel"><h3 style="margin-bottom:10px">Пардохт</h3><div class="seg" style="grid-template-columns:1fr">${payments}</div>
          <p class="muted small" style="margin:10px 0 0">Пардохти онлайн ҳоло дастрас нест: ба фурӯшанда ҳангоми қабули маҳсулот пул медиҳед.</p></div>
      </div>
      <div>
        <div class="panel stack">
          <h3>Фармоиш</h3>${lines}
          <div class="sum"><span>Ҷамъ</span><span>${money(totalOf(items))}</span></div>
          <p class="muted small" style="margin:0">Хароҷоти таҳвил дар ин ҷамъ нест.</p>
          <button class="btn block" id="submit" type="submit">Тасдиқ кардани фармоиш</button>
        </div>
      </div>
    </form>`;
  return {
    html,
    mount(root) {
      const form = root.querySelector('#form');
      const err = root.querySelector('#err');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = root.querySelector('#submit');
        const fd = new FormData(form);
        btn.disabled = true;
        err.classList.add('hidden');
        try {
          await repo.placeOrders({
            lines: items.map(({ p, qty }) => ({ id: p.id, qty })),
            contact: { name: fd.get('name'), phone: fd.get('phone'), city: fd.get('city'), address: fd.get('address'), note: fd.get('note') },
            delivery: fd.get('delivery'), payment: fd.get('payment'),
          }, ctx.user);
          cart.clear();
          toast('Фармоиш қабул шуд!', 'ok');
          go('/orders');
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

export function orderCard(o, { forSeller = false, extra = '' } = {}) {
  const items = o.items.map((i) => `
    <div class="row" style="margin:6px 0"><img src="${esc(i.image || '')}" alt="" onerror="this.style.visibility='hidden'" style="width:44px;height:44px;border-radius:8px;object-fit:cover;background:var(--green-l)">
    <span class="grow small">${esc(i.title)} × ${i.qty}</span><b class="small">${money(i.price * i.qty)}</b></div>`).join('');
  const deliveryLabel = (DELIVERY_METHODS.find((d) => d.id === o.delivery) || {}).label || '';
  const contact = forSeller ? `
    <dl class="kv small" style="margin:8px 0">
      <dt>Харидор</dt><dd>${esc(o.contact.name)}</dd>
      <dt>Телефон</dt><dd><a href="tel:+${esc(o.contact.phone)}" style="color:var(--green-d)">${esc(formatPhone(o.contact.phone))}</a></dd>
      <dt>Суроға</dt><dd>${esc(o.contact.city)}${o.contact.address ? ', ' + esc(o.contact.address) : ''}</dd>
      ${o.contact.note ? `<dt>Шарҳ</dt><dd>${esc(o.contact.note)}</dd>` : ''}
    </dl>` : `<div class="muted small">Фурӯшанда: ${esc(o.sellerName)}</div>`;
  return `<div class="panel" data-order="${esc(o.id)}">
    <div class="order-head"><div><b>№ ${esc(o.id.slice(-6).toUpperCase())}</b> <span class="muted small">${formatDate(o.createdAt)}</span></div><span class="status ${esc(o.status)}">${esc(ORDER_STATUS[o.status])}</span></div>
    ${items}${contact}
    <div class="muted small">${esc(deliveryLabel)} · Пардохт ҳангоми қабул</div>
    <div class="sum"><span>Ҷамъ</span><span>${money(o.total)}</span></div>
    ${extra}
  </div>`;
}

export async function ordersView() {
  if (!requireUser('/orders')) return { html: '' };
  const orders = await repo.listBuyerOrders(ctx.user.id);
  const html = `<h1 class="page-title">Фармоишҳои ман</h1>` + (orders.length
    ? orders.map((o) => orderCard(o, { extra: o.status === 'new' ? `<div style="margin-top:10px;text-align:right"><button class="btn danger sm" data-cancel="${esc(o.id)}">Бекор кардан</button></div>` : '' })).join('')
    : empty('📦', 'Шумо ҳоло фармоиш надодаед.', '<a class="btn" href="#/">Ба харид гузаред</a>'));
  return {
    html,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-cancel]');
        if (!b || !confirm('Фармоишро бекор мекунед?')) return;
        try { await repo.setOrderStatus(b.dataset.cancel, 'cancelled', ctx.user); toast('Фармоиш бекор шуд.'); ctx.rerender(); } catch (ex) { toast(ex.message, 'err'); }
      });
    },
  };
}
