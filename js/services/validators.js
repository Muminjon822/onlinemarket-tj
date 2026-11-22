/** Приводит номер телефона к виду 992XXXXXXXXX или возвращает null. */
export function normalizePhone(input) {
  const d = String(input || '').replace(/\D/g, '');
  if (d.length === 9) return '992' + d;
  if (d.length === 10 && d.startsWith('0')) return '992' + d.slice(1);
  if (d.length === 12 && d.startsWith('992')) return d;
  return null;
}

export function formatPhone(p) {
  const d = String(p || '');
  if (d.length !== 12) return d;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
}
