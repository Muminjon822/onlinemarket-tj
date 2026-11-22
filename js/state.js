// Состояние на стороне клиента: корзина и избранное (хранятся на устройстве).
import { storage } from './services/storage.js';

const subs = new Set();
export const onState = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((f) => f());

export const cart = {
  lines() { return storage.get('cart', []); },
  count() { return this.lines().reduce((s, l) => s + l.qty, 0); },
  add(id, qty = 1, max = 99) {
    const lines = this.lines();
    const x = lines.find((l) => l.id === id);
    if (x) x.qty = Math.min(max, x.qty + qty);
    else lines.push({ id, qty: Math.min(max, qty) });
    storage.set('cart', lines);
    emit();
  },
  setQty(id, qty) {
    const lines = this.lines().map((l) => (l.id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0);
    storage.set('cart', lines);
    emit();
  },
  remove(id) { this.setQty(id, 0); },
  clear() { storage.set('cart', []); emit(); },
};

export const favs = {
  ids() { return storage.get('favs', []); },
  has(id) { return this.ids().includes(id); },
  toggle(id) {
    const ids = this.ids();
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    storage.set('favs', next);
    emit();
    return next.includes(id);
  },
};
