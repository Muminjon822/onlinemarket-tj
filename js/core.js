// Общий контекст приложения (текущий пользователь, навигация).
export const ctx = { user: null, rerender: () => {} };

export const go = (path) => { location.hash = '#' + path; };

/** Возвращает true, если пользователь вошёл; иначе отправляет на страницу входа. */
export function requireUser(nextPath) {
  if (ctx.user) return true;
  go(`/login?next=${encodeURIComponent(nextPath)}`);
  return false;
}

export function requireSeller(nextPath) {
  if (!requireUser(nextPath)) return false;
  if (ctx.user.role !== 'seller') { go('/account'); return false; }
  return true;
}
