// Smoke-тест бизнес-логики (без браузера): node tests/smoke.mjs
import assert from 'node:assert/strict';

// Подмена localStorage
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const { LocalRepo } = await import('../js/repo/local.js');
const { normalizePhone } = await import('../js/services/validators.js');

assert.equal(normalizePhone('92 123 45 67'), '992921234567');
assert.equal(normalizePhone('+992 92 123 45 67'), '992921234567');
assert.equal(normalizePhone('123'), null);

const repo = new LocalRepo();

// Демо-товары
const demo = await repo.listProducts();
assert.ok(demo.length >= 4, 'демо-товары созданы');

// Регистрация продавца и покупателя
const seller = await repo.register({ name: 'Фурӯшанда', phone: '900000001', password: 'secret1', role: 'seller', shopName: 'Мағозаи тест', city: 'Душанбе' });
assert.equal(seller.role, 'seller');
await assert.rejects(() => repo.register({ name: 'Дубликат', phone: '900000001', password: 'secret1' }), /аллакай/);
await repo.logout();
const buyer = await repo.register({ name: 'Харидор', phone: '900000002', password: 'secret2' });
assert.equal(buyer.role, 'buyer');

// Покупатель не может публиковать товары
await assert.rejects(() => repo.saveProduct({ title: 'abc', price: 1, stock: 1, category: 'kids', condition: 'new' }, buyer), /фурӯшанда/);

// Продавец создаёт товар
const p = await repo.saveProduct({ title: 'Мошини тест', price: 100, stock: 3, category: 'kids', condition: 'new', city: 'Душанбе', images: ['data:image/jpeg;base64,AAAA', 'javascript:alert(1)'] }, seller);
assert.equal(p.images.length, 1, 'небезопасные ссылки на фото отброшены');
await assert.rejects(() => repo.saveProduct({ title: 'x', price: 1, stock: 1, category: 'kids', condition: 'new' }, seller), /3 то 80/);

// Вход
await repo.logout();
await assert.rejects(() => repo.login({ phone: '900000002', password: 'wrong' }), /нодуруст/);
const again = await repo.login({ phone: '900000002', password: 'secret2' });
assert.equal(again.id, buyer.id);

// Заказ: больше остатка нельзя
const contact = { name: 'Харидор', phone: '900000002', city: 'Душанбе', address: 'кӯчаи Рӯдакӣ 1', note: '' };
await assert.rejects(() => repo.placeOrders({ lines: [{ id: p.id, qty: 9 }], contact, delivery: 'courier', payment: 'cod' }, buyer), /танҳо 3/);
await assert.rejects(() => repo.placeOrders({ lines: [{ id: p.id, qty: 1 }], contact, delivery: 'courier', payment: 'card' }, buyer), /пардохт/);

// Заказ из двух продавцов делится на два заказа
const orders = await repo.placeOrders({ lines: [{ id: p.id, qty: 2 }, { id: 'demo_1', qty: 1 }], contact, delivery: 'courier', payment: 'cod' }, buyer);
assert.equal(orders.length, 2);
assert.equal((await repo.getProduct(p.id)).stock, 1, 'остаток уменьшен');

// Продавец видит свой заказ и меняет статус; чужой не может
const sellerOrders = await repo.listSellerOrders(seller.id);
assert.equal(sellerOrders.length, 1);
assert.equal(sellerOrders[0].total, 200);
await assert.rejects(() => repo.setOrderStatus(sellerOrders[0].id, 'confirmed', { id: 'stranger', role: 'seller' }), /Дастрасӣ/);
await repo.setOrderStatus(sellerOrders[0].id, 'confirmed', seller);

// Покупатель может отменить только новый заказ → после подтверждения нельзя
await assert.rejects(() => repo.setOrderStatus(sellerOrders[0].id, 'cancelled', buyer), /танҳо фармоиши навро/);

// Отмена нового заказа возвращает остаток
const demoOrder = orders.find((o) => o.sellerId === 'demo');
const before = (await repo.getProduct('demo_1')).stock;
await repo.setOrderStatus(demoOrder.id, 'cancelled', buyer);
assert.equal((await repo.getProduct('demo_1')).stock, before + 1);

// Нельзя купить свой товар
await assert.rejects(() => repo.placeOrders({ lines: [{ id: p.id, qty: 1 }], contact, delivery: 'courier', payment: 'cod' }, seller), /худатон/);

// Чужой товар нельзя удалить
await assert.rejects(() => repo.deleteProduct(p.id, buyer), /шумо нест/);
await repo.deleteProduct(p.id, seller);
assert.equal(await repo.getProduct(p.id), null);

console.log('OK: smoke-тест пройден');
