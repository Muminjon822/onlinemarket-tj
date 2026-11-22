// Заготовка для настоящего сервера (база данных, оплата, доставка).
// Интерфейс совпадает с LocalRepo: достаточно реализовать эти же REST-маршруты
// на сервере и поставить в js/config.js  backend: 'api'.
// Подробности: docs/ARCHITECTURE.md
import { CONFIG } from '../config.js';

async function http(method, path, body) {
  const res = await fetch(CONFIG.apiBaseUrl + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = 'Хатои сервер';
    try { msg = (await res.json()).message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export class ApiRepo {
  currentUser() { return http('GET', '/me').catch(() => null); }
  register(d) { return http('POST', '/auth/register', d); }
  login(d) { return http('POST', '/auth/login', d); }
  logout() { return http('POST', '/auth/logout'); }
  becomeSeller(userId, shopName) { return http('POST', '/me/seller', { shopName }); }
  updateProfile(userId, d) { return http('PATCH', '/me', d); }

  listProducts() { return http('GET', '/products'); }
  getProduct(id) { return http('GET', `/products/${encodeURIComponent(id)}`); }
  listSellerProducts() { return http('GET', '/seller/products'); }
  saveProduct(d) { return d.id ? http('PUT', `/products/${encodeURIComponent(d.id)}`, d) : http('POST', '/products', d); }
  setProductStatus(id, status) { return http('PATCH', `/products/${encodeURIComponent(id)}`, { status }); }
  deleteProduct(id) { return http('DELETE', `/products/${encodeURIComponent(id)}`); }

  placeOrders(d) { return http('POST', '/orders', d); }
  listBuyerOrders() { return http('GET', '/orders?as=buyer'); }
  listSellerOrders() { return http('GET', '/orders?as=seller'); }
  setOrderStatus(id, status) { return http('PATCH', `/orders/${encodeURIComponent(id)}`, { status }); }
}
