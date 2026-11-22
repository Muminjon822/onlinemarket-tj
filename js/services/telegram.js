// Интеграция с Telegram Mini App. Вне Telegram всё это безопасно ничего не делает.
// Чтобы запустить как Mini App: в @BotFather создайте бота, затем
//   /newapp (или Menu Button) и укажите адрес сайта (HTTPS).
// ВАЖНО: initData нужно проверять на сервере (HMAC с токеном бота), прежде
// чем доверять личности пользователя. На стороне клиента данные не защищены.
export const tg = () => globalThis.Telegram && globalThis.Telegram.WebApp;

export const isTelegram = () => !!(tg() && tg().initData);

export function initTelegram() {
  const app = tg();
  if (!app) return;
  try {
    app.ready();
    app.expand();
    if (app.setHeaderColor) app.setHeaderColor('#0b7a55');
    if (app.setBackgroundColor) app.setBackgroundColor('#f5f7f6');
    document.documentElement.classList.add('in-telegram');
  } catch { /* ignore */ }
}

export function telegramUser() {
  const u = tg() && tg().initDataUnsafe && tg().initDataUnsafe.user;
  return u ? { id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' ') } : null;
}

/** Кнопка «Назад» Telegram вместо браузерной. */
export function setBackButton(visible, onClick) {
  const app = tg();
  if (!app || !app.BackButton) return;
  try {
    if (app._omtjBack) app.BackButton.offClick(app._omtjBack);
    if (visible) {
      app._omtjBack = onClick;
      app.BackButton.onClick(onClick);
      app.BackButton.show();
    } else {
      app.BackButton.hide();
    }
  } catch { /* ignore */ }
}
