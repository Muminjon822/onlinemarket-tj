// Тонкая обёртка над localStorage. Если localStorage недоступен
// (например, приватный режим), данные живут в памяти до перезагрузки.
const PREFIX = 'omtj:v1:';
const memory = new Map();

function ls() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    return s;
  } catch {
    return null;
  }
}

export const storage = {
  get(key, fallback = null) {
    const s = ls();
    try {
      const raw = s ? s.getItem(PREFIX + key) : memory.get(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  /** Возвращает false, если не удалось записать (например, нет места). */
  set(key, value) {
    const raw = JSON.stringify(value);
    const s = ls();
    try {
      if (s) s.setItem(PREFIX + key, raw);
      else memory.set(PREFIX + key, raw);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    const s = ls();
    try {
      if (s) s.removeItem(PREFIX + key);
      else memory.delete(PREFIX + key);
    } catch { /* ignore */ }
  },
};
