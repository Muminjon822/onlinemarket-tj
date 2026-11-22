// Локальная реализация слоя данных: всё хранится в браузере пользователя.
// ВАЖНО: это демонстрационный режим. Данные не синхронизируются между
// устройствами и людьми. Для реальной работы замените на ApiRepo (см. api.js).
import { storage } from '../services/storage.js';
import { normalizePhone } from '../services/validators.js';
import { CONFIG } from '../config.js';
import { CATEGORIES, CITIES, ORDER_STATUS } from '../data/constants.js';
import { SEED_PRODUCTS, DEMO_SELLER } from '../data/seed.js';

const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const fail = (msg) => { throw new Error(msg); };

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (n = 16) => toHex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPassword(password, saltHex) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) fail('Браузер аз амнияти рамз пуштибонӣ намекунад. Сайтро тавассути HTTPS кушоед.');
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const bits = await subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}

const publicUser = (u) => u && ({ id: u.id, name: u.name, phone: u.phone, role: u.role, city: u.city, shopName: u.shopName || '' });

export class LocalRepo {
  constructor() {
    if (CONFIG.seedDemo && !storage.get('seeded', false)) {
      const now = Date.now();
      const products = SEED_PRODUCTS.map((p, i) => ({
        ...p,
        id: `demo_${i + 1}`,
        sellerId: DEMO_SELLER.id,
        sellerName: DEMO_SELLER.name,
        status: 'active',
        demo: true,
        createdAt: now - i * 3600_000,
      }));
      storage.set('products', products);
      storage.set('seeded', true);
    }
  }

  // ---------- Аккаунты ----------
  _users() { return storage.get('users', []); }

  async currentUser() {
    const s = storage.get('session', null);
    if (!s) return null;
    return publicUser(this._users().find((u) => u.id === s.userId)) || null;
  }

  async register({ name, phone, password, role = 'buyer', city = '', shopName = '' }) {
    name = String(name || '').trim();
    const p = normalizePhone(phone);
    if (name.length < 2) fail('Номро ворид кунед (на камтар аз 2 ҳарф).');
    if (!p) fail('Рақами телефон нодуруст аст. Мисол: 92 123 45 67.');
    if (String(password || '').length < 6) fail('Рамз бояд на камтар аз 6 аломат бошад.');
    if (!['buyer', 'seller'].includes(role)) fail('Навъи ҳисоб нодуруст аст.');
    if (role === 'seller' && String(shopName).trim().length < 2) fail('Номи мағозаро ворид кунед.');
    const users = this._users();
    if (users.some((u) => u.phone === p)) fail('Бо ин рақам ҳисоб аллакай вуҷуд дорад. Ворид шавед.');
    const salt = randomHex();
    const user = {
      id: uid('u'), name, phone: p, role, city: CITIES.includes(city) ? city : '',
      shopName: role === 'seller' ? String(shopName).trim() : '',
      salt, hash: await hashPassword(password, salt), createdAt: Date.now(),
    };
    users.push(user);
    if (!storage.set('users', users)) fail('Хотираи браузер пур аст.');
    storage.set('session', { userId: user.id });
    return publicUser(user);
  }

  async login({ phone, password }) {
    const p = normalizePhone(phone);
    const user = p && this._users().find((u) => u.phone === p);
    if (!user || (await hashPassword(String(password || ''), user.salt)) !== user.hash) {
      fail('Рақам ё рамз нодуруст аст.');
    }
    storage.set('session', { userId: user.id });
    return publicUser(user);
  }

  async logout() { storage.remove('session'); }

  async becomeSeller(userId, shopName) {
    shopName = String(shopName || '').trim();
    if (shopName.length < 2) fail('Номи мағозаро ворид кунед.');
    const users = this._users();
    const u = users.find((x) => x.id === userId) || fail('Корбар ёфт нашуд.');
    u.role = 'seller';
    u.shopName = shopName;
    storage.set('users', users);
    return publicUser(u);
  }

  async updateProfile(userId, { name, city }) {
    const users = this._users();
    const u = users.find((x) => x.id === userId) || fail('Корбар ёфт нашуд.');
    if (String(name || '').trim().length < 2) fail('Номро ворид кунед.');
    u.name = String(name).trim();
    u.city = CITIES.includes(city) ? city : '';
    storage.set('users', users);
    return publicUser(u);
  }

  // ---------- Маҳсулот ----------
  _products() { return storage.get('products', []); }

  async listProducts() { return this._products().filter((p) => p.status === 'active'); }
  async getProduct(id) { return this._products().find((p) => p.id === id) || null; }
  async listSellerProducts(sellerId) { return this._products().filter((p) => p.sellerId === sellerId); }

  async saveProduct(data, user) {
    if (!user || user.role !== 'seller') fail('Танҳо фурӯшанда метавонад маҳсулот илова кунад.');
    const title = String(data.title || '').trim();
    const description = String(data.description || '').trim();
    const price = Number(data.price);
    const stock = Number(data.stock);
    if (title.length < 3 || title.length > 80) fail('Номи маҳсулот бояд аз 3 то 80 ҳарф бошад.');
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) fail('Нархро дуруст ворид кунед.');
    if (!Number.isInteger(stock) || stock < 0 || stock > 9999) fail('Миқдор бояд адади бутун аз 0 то 9999 бошад.');
    if (!CATEGORIES.some((c) => c.id === data.category)) fail('Категорияро интихоб кунед.');
    if (!['new', 'used'].includes(data.condition)) fail('Ҳолати маҳсулотро интихоб кунед.');
    if (description.length > 2000) fail('Тавсиф аз ҳад дароз аст.');
    const images = (data.images || []).filter((s) => /^(data:image\/|https:\/\/)/.test(s)).slice(0, CONFIG.maxPhotos);

    const products = this._products();
    let p;
    if (data.id) {
      p = products.find((x) => x.id === data.id) || fail('Маҳсулот ёфт нашуд.');
      if (p.sellerId !== user.id) fail('Ин маҳсулоти шумо нест.');
    } else {
      p = { id: uid('p'), sellerId: user.id, status: 'active', createdAt: Date.now() };
      products.unshift(p);
    }
    Object.assign(p, {
      sellerName: user.shopName || user.name, title, description, price, stock, images,
      category: data.category, condition: data.condition,
      city: CITIES.includes(data.city) ? data.city : (user.city || CITIES[0]),
    });
    if (!storage.set('products', products)) fail('Хотираи браузер пур шуд. Суратҳоро кам кунед ё маҳсулотҳои кӯҳнаро нест кунед.');
    return p;
  }

  async setProductStatus(id, status, user) {
    const products = this._products();
    const p = products.find((x) => x.id === id) || fail('Маҳсулот ёфт нашуд.');
    if (!user || p.sellerId !== user.id) fail('Ин маҳсулоти шумо нест.');
    p.status = status === 'hidden' ? 'hidden' : 'active';
    storage.set('products', products);
    return p;
  }

  async deleteProduct(id, user) {
    const products = this._products();
    const p = products.find((x) => x.id === id) || fail('Маҳсулот ёфт нашуд.');
    if (!user || p.sellerId !== user.id) fail('Ин маҳсулоти шумо нест.');
    storage.set('products', products.filter((x) => x.id !== id));
  }

  // ---------- Фармоишҳо ----------
  _orders() { return storage.get('orders', []); }

  /**
   * Создаёт по одному заказу на каждого продавца.
   * order: { lines:[{id,qty}], contact:{name,phone,city,address,note}, delivery, payment }
   */
  async placeOrders({ lines, contact, delivery, payment }, user) {
    if (!user) fail('Аввал ворид шавед.');
    if (!lines || !lines.length) fail('Сабад холӣ аст.');
    const phone = normalizePhone(contact.phone);
    if (String(contact.name || '').trim().length < 2) fail('Номро ворид кунед.');
    if (!phone) fail('Рақами телефон нодуруст аст.');
    if (!CITIES.includes(contact.city)) fail('Шаҳрро интихоб кунед.');
    if (String(contact.address || '').trim().length < 5 && delivery !== 'pickup') fail('Суроғаро ворид кунед.');
    if (payment !== 'cod') fail('Усули пардохт дастрас нест.');

    const products = this._products();
    const byId = new Map(products.map((p) => [p.id, p]));
    const groups = new Map();
    for (const l of lines) {
      const p = byId.get(l.id);
      const qty = Number(l.qty);
      if (!p || p.status !== 'active') fail('Яке аз маҳсулотҳо дигар дастрас нест. Сабадро нав кунед.');
      if (p.sellerId === user.id) fail('Маҳсулоти худатонро харида наметавонед.');
      if (!Number.isInteger(qty) || qty < 1) fail('Миқдор нодуруст аст.');
      if (qty > p.stock) fail(`«${p.title}»: дар анбор танҳо ${p.stock} адад мондааст.`);
      if (!groups.has(p.sellerId)) groups.set(p.sellerId, []);
      groups.get(p.sellerId).push({ p, qty });
    }

    const groupId = uid('g');
    const created = [];
    for (const [sellerId, items] of groups) {
      const order = {
        id: uid('o'), groupId, buyerId: user.id, sellerId,
        sellerName: items[0].p.sellerName,
        contact: {
          name: String(contact.name).trim(), phone, city: contact.city,
          address: String(contact.address || '').trim(), note: String(contact.note || '').trim().slice(0, 500),
        },
        delivery, payment, status: 'new', createdAt: Date.now(),
        items: items.map(({ p, qty }) => ({ productId: p.id, title: p.title, price: p.price, qty, image: (p.images || [])[0] || '' })),
      };
      order.total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
      created.push(order);
      items.forEach(({ p, qty }) => { p.stock -= qty; });
    }
    const orders = [...created, ...this._orders()];
    if (!storage.set('orders', orders) || !storage.set('products', products)) fail('Хотираи браузер пур аст. Фармоиш сабт нашуд.');
    return created;
  }

  async listBuyerOrders(userId) { return this._orders().filter((o) => o.buyerId === userId); }
  async listSellerOrders(sellerId) { return this._orders().filter((o) => o.sellerId === sellerId); }

  _restoreStock(order) {
    const products = this._products();
    for (const it of order.items) {
      const p = products.find((x) => x.id === it.productId);
      if (p) p.stock += it.qty;
    }
    storage.set('products', products);
  }

  async setOrderStatus(orderId, status, user) {
    if (!ORDER_STATUS[status]) fail('Ҳолати нодуруст.');
    const orders = this._orders();
    const o = orders.find((x) => x.id === orderId) || fail('Фармоиш ёфт нашуд.');
    if (!user) fail('Аввал ворид шавед.');
    const isSeller = o.sellerId === user.id;
    const isBuyer = o.buyerId === user.id;
    if (!isSeller && !isBuyer) fail('Дастрасӣ нест.');
    if (o.status === 'cancelled' || o.status === 'delivered') fail('Ҳолати ин фармоишро иваз кардан мумкин нест.');
    if (isBuyer && !isSeller && !(status === 'cancelled' && o.status === 'new')) {
      fail('Харидор танҳо фармоиши навро бекор карда метавонад.');
    }
    if (status === 'cancelled') this._restoreStock(o);
    o.status = status;
    storage.set('orders', orders);
    return o;
  }
}
