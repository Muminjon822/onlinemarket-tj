import { repo } from '../repo/index.js';
import { CITIES } from '../data/constants.js';
import { formatPhone } from '../services/validators.js';
import { telegramUser } from '../services/telegram.js';
import { esc, icon, toast } from '../ui.js';
import { ctx, go } from '../core.js';

const cityOptions = (cur) => `<option value="">— Интихоб кунед —</option>` + CITIES.map((c) => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');

/** Безопасный путь возврата после входа (только внутренние маршруты). */
const safeNext = (n) => (n && /^\/[\w\-/]*$/.test(n) ? n : '/');

export async function authView({ query, mode }) {
  if (ctx.user) { go('/account'); return { html: '' }; }
  const next = safeNext(query.get('next'));
  const isReg = mode === 'register';
  const q = `?next=${encodeURIComponent(next)}`;
  const tgName = (telegramUser() || {}).name || '';
  const html = `
    <div style="max-width:460px;margin:0 auto">
      <h1 class="page-title">${isReg ? 'Бақайдгирӣ' : 'Ворид шудан'}</h1>
      <div class="tabs"><a href="#/login${q}" class="${isReg ? '' : 'active'}">Ворид шудан</a><a href="#/register${q}" class="${isReg ? 'active' : ''}">Бақайдгирӣ</a></div>
      <form id="form" class="panel" novalidate>
        <div id="err" class="error hidden"></div>
        ${isReg ? `
        <div class="field"><label>Ман мехоҳам</label>
          <div class="seg"><label><input type="radio" name="role" value="buyer" checked><span>🛍️ Харидан</span></label><label><input type="radio" name="role" value="seller"><span>🏪 Фурӯхтан</span></label></div></div>
        <div class="field"><label for="name">Ном</label><input id="name" name="name" autocomplete="name" value="${esc(tgName)}" required></div>
        <div class="field hidden" id="shop-field"><label for="shop">Номи мағоза</label><input id="shop" name="shopName" placeholder="Масалан: Мағозаи Саида"></div>` : ''}
        <div class="field"><label for="phone">Рақами телефон</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="92 123 45 67" required></div>
        <div class="field"><label for="password">Рамз</label><input id="password" name="password" type="password" autocomplete="${isReg ? 'new-password' : 'current-password'}" placeholder="Камаш 6 аломат" required></div>
        ${isReg ? `<div class="field"><label for="city">Шаҳр</label><select id="city" name="city">${cityOptions('')}</select></div>` : ''}
        <button class="btn block" type="submit">${isReg ? 'Сабти ном' : 'Ворид шудан'}</button>
      </form>
      <p class="muted small" style="text-align:center;margin-top:12px">Дар версияи ҷорӣ маълумот дар худи дастгоҳи шумо нигоҳ дошта мешавад.</p>
    </div>`;
  return {
    html,
    mount(root) {
      const form = root.querySelector('#form');
      const err = root.querySelector('#err');
      form.querySelectorAll('[name=role]').forEach((r) => r.addEventListener('change', () => {
        root.querySelector('#shop-field').classList.toggle('hidden', form.role.value !== 'seller');
      }));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(form));
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        err.classList.add('hidden');
        try {
          ctx.user = isReg ? await repo.register(fd) : await repo.login(fd);
          toast(isReg ? 'Хуш омадед!' : 'Хуш омадед!', 'ok');
          ctx.refreshNav();
          go(next);
        } catch (ex) {
          err.textContent = ex.message;
          err.classList.remove('hidden');
          btn.disabled = false;
        }
      });
    },
  };
}

export async function accountView() {
  const u = ctx.user;
  if (!u) { go('/login?next=%2Faccount'); return { html: '' }; }
  const isSeller = u.role === 'seller';
  const html = `
    <h1 class="page-title">Профил</h1>
    <div class="panel">
      <div class="row"><div class="brand-mark" style="font-size:38px">${isSeller ? '🏪' : '👤'}</div>
        <div class="grow"><div style="font-weight:800;font-size:18px">${esc(u.name)}</div>
        <div class="muted">${esc(formatPhone(u.phone))}</div>
        <span class="tag">${isSeller ? `Фурӯшанда · ${esc(u.shopName)}` : 'Харидор'}</span></div></div>
    </div>
    <div class="panel stack">
      <a class="btn ghost block" href="#/orders">${icon('box')} Фармоишҳои ман</a>
      <a class="btn ghost block" href="#/favorites">${icon('heart')} Дӯстдошта</a>
      ${isSeller ? `<a class="btn block" href="#/seller">${icon('store')} Кабинети фурӯшанда</a>` : ''}
    </div>
    ${isSeller ? '' : `
    <form class="panel" id="seller-form">
      <h3 style="margin-bottom:8px">Мехоҳед фурӯшанда шавед?</h3>
      <p class="muted small" style="margin-top:0">Номи мағозаро нависед ва маҳсулоти худро ҷойгир кунед.</p>
      <div class="field"><input name="shopName" placeholder="Номи мағоза" required></div>
      <button class="btn block" type="submit">Фурӯшанда шудан</button>
    </form>`}
    <form class="panel" id="profile-form">
      <h3 style="margin-bottom:10px">Маълумоти шахсӣ</h3>
      <div class="field"><label for="name">Ном</label><input id="name" name="name" value="${esc(u.name)}" required></div>
      <div class="field"><label for="city">Шаҳр</label><select id="city" name="city">${cityOptions(u.city)}</select></div>
      <button class="btn block" type="submit">Нигоҳ доштан</button>
    </form>
    <button class="btn line block" id="logout" style="margin-top:12px">Баромадан</button>`;
  return {
    html,
    mount(root) {
      root.querySelector('#logout').addEventListener('click', async () => {
        await repo.logout();
        ctx.user = null;
        ctx.refreshNav();
        toast('Шумо баромадед.');
        go('/');
      });
      root.querySelector('#profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        try { ctx.user = await repo.updateProfile(u.id, fd); toast('Нигоҳ дошта шуд.', 'ok'); } catch (ex) { toast(ex.message, 'err'); }
      });
      const sf = root.querySelector('#seller-form');
      if (sf) {
        sf.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            ctx.user = await repo.becomeSeller(u.id, new FormData(sf).get('shopName'));
            toast('Акнун шумо фурӯшанда ҳастед!', 'ok');
            ctx.refreshNav();
            go('/seller');
          } catch (ex) { toast(ex.message, 'err'); }
        });
      }
    },
  };
}
