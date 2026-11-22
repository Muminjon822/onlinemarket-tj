// Глобальные настройки приложения.
// Чтобы подключить настоящую базу данных, достаточно:
//   1) поднять сервер с REST API (см. docs/ARCHITECTURE.md),
//   2) указать backend: 'api' и apiBaseUrl.
export const CONFIG = {
  appName: 'OnlineMarketTJ',
  currency: 'сомонӣ',
  backend: 'local', // 'local' = данные в браузере; 'api' = ваш сервер
  apiBaseUrl: '', // например 'https://api.example.tj'
  maxPhotos: 4,
  // Демонстрационные товары, чтобы витрина не была пустой. Перед запуском
  // для реальных покупателей поставьте false.
  seedDemo: true,
};
